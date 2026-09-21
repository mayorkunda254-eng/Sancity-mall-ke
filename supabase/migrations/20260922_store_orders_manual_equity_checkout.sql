create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('pickup','delivery')),
  delivery_location text,
  delivery_notes text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  delivery_fee numeric(12,2) check (delivery_fee is null or delivery_fee >= 0),
  total_amount numeric(12,2) check (total_amount is null or total_amount >= 0),
  payment_method text not null default 'mpesa_equity',
  payment_paybill text not null default '247247',
  payment_account text not null default '0705287264',
  mpesa_code text,
  payment_status text not null default 'awaiting_payment'
    check (payment_status in ('awaiting_payment','pending_verification','verified','rejected')),
  order_status text not null default 'new'
    check (order_status in ('awaiting_delivery_quote','new','confirmed','preparing','dispatched','ready_for_pickup','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text,
  variant_size text,
  variant_colour text,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists store_orders_created_at_idx
  on public.store_orders(created_at desc);
create index if not exists store_orders_payment_status_idx
  on public.store_orders(payment_status);
create index if not exists store_orders_order_status_idx
  on public.store_orders(order_status);
create index if not exists store_order_items_order_id_idx
  on public.store_order_items(order_id);

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "Admins read store orders" on public.store_orders;
create policy "Admins read store orders"
  on public.store_orders for select to authenticated
  using (private.is_admin());

drop policy if exists "Admins update store orders" on public.store_orders;
create policy "Admins update store orders"
  on public.store_orders for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins read store order items" on public.store_order_items;
create policy "Admins read store order items"
  on public.store_order_items for select to authenticated
  using (private.is_admin());

create or replace function public.create_store_order(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_location text,
  p_delivery_notes text,
  p_items jsonb,
  p_mpesa_code text default null
)
returns table (
  order_id uuid,
  order_number text,
  subtotal numeric,
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
  v_total numeric(12,2);
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
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
    delivery_method, delivery_location, delivery_notes,
    subtotal, delivery_fee, total_amount,
    mpesa_code, payment_status, order_status
  ) values (
    v_order_id, v_order_number, trim(p_customer_name), trim(p_customer_phone),
    p_delivery_method, nullif(trim(coalesce(p_delivery_location,'')),''),
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
    v_total := v_subtotal;
    v_order_status := 'new';
    v_payment_status := case when v_mpesa_code <> '' then 'pending_verification' else 'awaiting_payment' end;
  else
    v_total := null;
    v_order_status := 'awaiting_delivery_quote';
    v_payment_status := 'awaiting_payment';
    v_mpesa_code := '';
  end if;

  update public.store_orders
     set subtotal = v_subtotal,
         delivery_fee = case when p_delivery_method = 'pickup' then 0 else null end,
         total_amount = v_total,
         mpesa_code = nullif(v_mpesa_code,''),
         payment_status = v_payment_status,
         order_status = v_order_status,
         updated_at = now()
   where id = v_order_id;

  return query
    select v_order_id, v_order_number, v_subtotal, v_total, v_payment_status, v_order_status;
end;
$$;

revoke all on function public.create_store_order(text,text,text,text,text,jsonb,text) from public;
grant execute on function public.create_store_order(text,text,text,text,text,jsonb,text) to anon, authenticated;
