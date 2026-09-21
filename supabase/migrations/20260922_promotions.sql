create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  min_subtotal numeric(12,2) not null default 0 check (min_subtotal >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  times_redeemed integer not null default 0 check (times_redeemed >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create index if not exists promotions_active_code_idx
  on public.promotions(is_active, code);

alter table public.promotions enable row level security;

drop policy if exists "Admins read promotions" on public.promotions;
create policy "Admins read promotions"
  on public.promotions for select to authenticated
  using (private.is_admin());

drop policy if exists "Admins insert promotions" on public.promotions;
create policy "Admins insert promotions"
  on public.promotions for insert to authenticated
  with check (private.is_admin());

drop policy if exists "Admins update promotions" on public.promotions;
create policy "Admins update promotions"
  on public.promotions for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins delete promotions" on public.promotions;
create policy "Admins delete promotions"
  on public.promotions for delete to authenticated
  using (private.is_admin());

alter table public.store_orders
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null,
  add column if not exists promotion_code text,
  add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);

create or replace function public.preview_promotion(
  p_code text,
  p_subtotal numeric
)
returns table (
  valid boolean,
  promo_code text,
  message text,
  discount_amount numeric,
  discounted_subtotal numeric
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_promo public.promotions%rowtype;
  v_code text;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
begin
  v_code := upper(trim(coalesce(p_code,'')));
  v_subtotal := greatest(coalesce(p_subtotal,0),0);

  if v_code = '' then
    return query select false, null::text, 'Enter a promo code.'::text, 0::numeric, v_subtotal::numeric;
    return;
  end if;

  select *
    into v_promo
    from public.promotions
   where code = v_code
     and is_active = true
   limit 1;

  if not found then
    return query select false, v_code, 'Promo code not found or inactive.'::text, 0::numeric, v_subtotal::numeric;
    return;
  end if;

  if v_promo.starts_at is not null and now() < v_promo.starts_at then
    return query select false, v_code, 'This promotion has not started yet.'::text, 0::numeric, v_subtotal::numeric;
    return;
  end if;

  if v_promo.expires_at is not null and now() >= v_promo.expires_at then
    return query select false, v_code, 'This promotion has expired.'::text, 0::numeric, v_subtotal::numeric;
    return;
  end if;

  if v_promo.max_redemptions is not null and v_promo.times_redeemed >= v_promo.max_redemptions then
    return query select false, v_code, 'This promotion has reached its usage limit.'::text, 0::numeric, v_subtotal::numeric;
    return;
  end if;

  if v_subtotal < v_promo.min_subtotal then
    return query select
      false,
      v_code,
      ('Minimum product subtotal is KSh ' || trim(to_char(v_promo.min_subtotal,'FM999999990.00')))::text,
      0::numeric,
      v_subtotal::numeric;
    return;
  end if;

  v_discount := case
    when v_promo.discount_type = 'percent'
      then round(v_subtotal * (v_promo.discount_value / 100.0), 2)
    else least(v_promo.discount_value, v_subtotal)
  end;

  return query select
    true,
    v_code,
    coalesce(v_promo.name, 'Promotion applied')::text,
    v_discount::numeric,
    greatest(v_subtotal - v_discount, 0)::numeric;
end;
$$;

revoke all on function public.preview_promotion(text,numeric) from public;
grant execute on function public.preview_promotion(text,numeric) to anon, authenticated;

create or replace function public.create_store_order_v2(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_location text,
  p_delivery_notes text,
  p_items jsonb,
  p_mpesa_code text default null,
  p_delivery_zone_id uuid default null,
  p_promo_code text default null
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  discount_amount numeric,
  delivery_fee numeric,
  total_amount numeric,
  payment_status text,
  order_status text,
  promotion_code text
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_delivery_fee numeric(12,2);
  v_total numeric(12,2);
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_promo public.promotions%rowtype;
  v_variant_count integer;
  v_qty integer;
  v_unit_price numeric(12,2);
  v_mpesa_code text;
  v_payment_status text;
  v_order_status text;
  v_promo_code text;
begin
  if trim(coalesce(p_customer_name,'')) = '' then
    raise exception 'Customer name is required';
  end if;

  if trim(coalesce(p_customer_phone,'')) !~ '^(?:\\+?254|0)?[17][0-9]{8}$' then
    raise exception 'Enter a valid Kenyan phone number';
  end if;

  if p_delivery_method not in ('pickup','delivery') then
    raise exception 'Choose pickup or delivery';
  end if;

  if p_delivery_method = 'delivery'
    and trim(coalesce(p_delivery_location,'')) = '' then
    raise exception 'Delivery location is required';
  end if;

  if p_delivery_method = 'delivery' and p_delivery_zone_id is not null then
    select *
      into v_zone
      from public.delivery_zones
     where id = p_delivery_zone_id
       and is_active = true;

    if not found then
      raise exception 'Selected delivery zone is unavailable';
    end if;
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
    or jsonb_array_length(p_items) > 50 then
    raise exception 'Order must contain between 1 and 50 items';
  end if;

  v_order_id := gen_random_uuid();
  v_order_number := 'SC-' || to_char(now() at time zone 'Africa/Nairobi','YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into public.store_orders (
    id, order_number, customer_name, customer_phone,
    delivery_method, delivery_zone_id, delivery_zone_name,
    delivery_location, delivery_notes,
    subtotal, discount_amount, delivery_fee, total_amount,
    mpesa_code, payment_status, order_status
  ) values (
    v_order_id, v_order_number, trim(p_customer_name), trim(p_customer_phone),
    p_delivery_method, v_zone.id, v_zone.name,
    nullif(trim(coalesce(p_delivery_location,'')),''),
    nullif(trim(coalesce(p_delivery_notes,'')),''),
    0, 0, null, null, null, 'awaiting_payment',
    case when p_delivery_method = 'pickup' then 'new' else 'awaiting_delivery_quote' end
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'Invalid item quantity';
    end;

    if v_qty < 1 or v_qty > 20 then
      raise exception 'Each item quantity must be between 1 and 20';
    end if;

    select *
      into v_product
      from public.products
     where id = (v_item->>'product_id')::uuid
       and status = 'published';

    if not found then
      raise exception 'One of the products is no longer available';
    end if;

    select count(*)
      into v_variant_count
      from public.product_variants
     where product_id = v_product.id
       and is_active = true;

    v_variant := null;

    if nullif(v_item->>'variant_id','') is not null then
      select *
        into v_variant
        from public.product_variants
       where id = (v_item->>'variant_id')::uuid
         and product_id = v_product.id
         and is_active = true;

      if not found then
        raise exception 'One of the selected product options is no longer available';
      end if;
    elsif v_variant_count > 0 then
      raise exception 'Choose an option for %', v_product.name;
    end if;

    if v_variant.id is not null and v_variant.price is not null then
      v_unit_price := v_variant.price;
    else
      v_unit_price := v_product.price;
    end if;

    if v_unit_price is null or (v_product.price_from and v_variant.id is null) then
      raise exception '% needs price confirmation before checkout', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);

    insert into public.store_order_items (
      order_id, product_id, variant_id, product_name,
      variant_label, variant_size, variant_colour,
      unit_price, quantity, line_total
    ) values (
      v_order_id, v_product.id, v_variant.id, v_product.name,
      v_variant.label, v_variant.size, v_variant.colour,
      v_unit_price, v_qty, v_unit_price * v_qty
    );
  end loop;

  v_promo_code := upper(trim(coalesce(p_promo_code,'')));

  if v_promo_code <> '' then
    select *
      into v_promo
      from public.promotions
     where code = v_promo_code
       and is_active = true
     for update;

    if not found then
      raise exception 'Promo code is invalid or inactive';
    end if;

    if v_promo.starts_at is not null and now() < v_promo.starts_at then
      raise exception 'This promotion has not started yet';
    end if;

    if v_promo.expires_at is not null and now() >= v_promo.expires_at then
      raise exception 'This promotion has expired';
    end if;

    if v_promo.max_redemptions is not null and v_promo.times_redeemed >= v_promo.max_redemptions then
      raise exception 'This promotion has reached its usage limit';
    end if;

    if v_subtotal < v_promo.min_subtotal then
      raise exception 'This order does not meet the promotion minimum subtotal';
    end if;

    v_discount := case
      when v_promo.discount_type = 'percent'
        then round(v_subtotal * (v_promo.discount_value / 100.0), 2)
      else least(v_promo.discount_value, v_subtotal)
    end;
  end if;

  v_mpesa_code := upper(trim(coalesce(p_mpesa_code,'')));
  if v_mpesa_code <> '' and v_mpesa_code !~ '^[A-Z0-9]{8,16}$' then
    raise exception 'Enter a valid M-Pesa confirmation code';
  end if;

  if p_delivery_method = 'pickup' then
    v_delivery_fee := 0;
    v_total := greatest(v_subtotal - v_discount, 0);
    v_order_status := 'new';
    v_payment_status := case when v_mpesa_code <> '' then 'pending_verification' else 'awaiting_payment' end;
  elsif v_zone.id is not null and v_zone.fee is not null then
    v_delivery_fee := v_zone.fee;
    v_total := greatest(v_subtotal - v_discount, 0) + v_delivery_fee;
    v_order_status := 'new';
    v_payment_status := case when v_mpesa_code <> '' then 'pending_verification' else 'awaiting_payment' end;
  else
    v_delivery_fee := null;
    v_total := null;
    v_order_status := 'awaiting_delivery_quote';
    v_payment_status := 'awaiting_payment';
    v_mpesa_code := '';
  end if;

  update public.store_orders
     set subtotal = v_subtotal,
         promotion_id = v_promo.id,
         promotion_code = nullif(v_promo_code,''),
         discount_amount = v_discount,
         delivery_fee = v_delivery_fee,
         total_amount = v_total,
         mpesa_code = nullif(v_mpesa_code,''),
         payment_status = v_payment_status,
         order_status = v_order_status,
         updated_at = now()
   where id = v_order_id;

  if v_promo.id is not null then
    update public.promotions
       set times_redeemed = times_redeemed + 1,
           updated_at = now()
     where id = v_promo.id;
  end if;

  return query
    select
      v_order_id,
      v_order_number,
      v_subtotal,
      v_discount,
      v_delivery_fee,
      v_total,
      v_payment_status,
      v_order_status,
      nullif(v_promo_code,'');
end;
$$;

revoke all on function public.create_store_order_v2(text,text,text,text,text,jsonb,text,uuid,text) from public;
grant execute on function public.create_store_order_v2(text,text,text,text,text,jsonb,text,uuid,text) to anon, authenticated;
