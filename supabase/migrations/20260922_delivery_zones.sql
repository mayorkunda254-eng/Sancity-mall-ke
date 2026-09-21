create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee numeric(12,2) check (fee is null or fee >= 0),
  eta_text text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.delivery_zones enable row level security;

drop policy if exists "Active delivery zones are public" on public.delivery_zones;
create policy "Active delivery zones are public"
  on public.delivery_zones for select to anon, authenticated
  using (is_active = true or private.is_admin());

drop policy if exists "Admins insert delivery zones" on public.delivery_zones;
create policy "Admins insert delivery zones"
  on public.delivery_zones for insert to authenticated
  with check (private.is_admin());

drop policy if exists "Admins update delivery zones" on public.delivery_zones;
create policy "Admins update delivery zones"
  on public.delivery_zones for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins delete delivery zones" on public.delivery_zones;
create policy "Admins delete delivery zones"
  on public.delivery_zones for delete to authenticated
  using (private.is_admin());

alter table public.store_orders
  add column if not exists delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  add column if not exists delivery_zone_name text;

create or replace function public.create_store_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_location text,
  p_delivery_notes text,
  p_items jsonb,
  p_mpesa_code text default null,
  p_delivery_zone_id uuid default null
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
  delivery_fee numeric,
  total_amount numeric,
  payment_status text,
  order_status text
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2);
  v_total numeric(12,2);
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_variant_count integer;
  v_qty integer;
  v_unit_price numeric(12,2);
  v_mpesa_code text;
  v_payment_status text;
  v_order_status text;
begin
  if trim(coalesce(p_customer_name,'')) = '' then
    raise exception 'Customer name is required';
  end if;

  if trim(coalesce(p_customer_phone,'')) !~ '^(?:\+?254|0)?[17][0-9]{8}$' then
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
    subtotal, delivery_fee, total_amount,
    mpesa_code, payment_status, order_status
  ) values (
    v_order_id, v_order_number, trim(p_customer_name), trim(p_customer_phone),
    p_delivery_method, v_zone.id, v_zone.name,
    nullif(trim(coalesce(p_delivery_location,'')),''),
    nullif(trim(coalesce(p_delivery_notes,'')),''),
    0, null, null, null, 'awaiting_payment',
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

  v_mpesa_code := upper(trim(coalesce(p_mpesa_code,'')));
  if v_mpesa_code <> '' and v_mpesa_code !~ '^[A-Z0-9]{8,16}$' then
    raise exception 'Enter a valid M-Pesa confirmation code';
  end if;

  if p_delivery_method = 'pickup' then
    v_delivery_fee := 0;
    v_total := v_subtotal;
    v_order_status := 'new';
    v_payment_status := case when v_mpesa_code <> '' then 'pending_verification' else 'awaiting_payment' end;
  elsif v_zone.id is not null and v_zone.fee is not null then
    v_delivery_fee := v_zone.fee;
    v_total := v_subtotal + v_delivery_fee;
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
         delivery_fee = v_delivery_fee,
         total_amount = v_total,
         mpesa_code = nullif(v_mpesa_code,''),
         payment_status = v_payment_status,
         order_status = v_order_status,
         updated_at = now()
   where id = v_order_id;

  return query
    select v_order_id, v_order_number, v_subtotal, v_delivery_fee, v_total, v_payment_status, v_order_status;
end;
$$;

revoke all on function public.create_store_order(text,text,text,text,text,jsonb,text,uuid) from public;
grant execute on function public.create_store_order(text,text,text,text,text,jsonb,text,uuid) to anon, authenticated;
