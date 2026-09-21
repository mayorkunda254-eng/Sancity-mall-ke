create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  customer_phone text not null,
  status text not null default 'pending'
    check (status in ('pending','contacted','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz
);

create index if not exists stock_alerts_product_id_idx
  on public.stock_alerts(product_id);
create index if not exists stock_alerts_status_created_idx
  on public.stock_alerts(status, created_at desc);

create unique index if not exists stock_alerts_unique_pending_request
  on public.stock_alerts (
    product_id,
    coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    customer_phone
  )
  where status = 'pending';

alter table public.stock_alerts enable row level security;

drop policy if exists "Admins read stock alerts" on public.stock_alerts;
create policy "Admins read stock alerts"
  on public.stock_alerts for select to authenticated
  using (private.is_admin());

drop policy if exists "Admins update stock alerts" on public.stock_alerts;
create policy "Admins update stock alerts"
  on public.stock_alerts for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins delete stock alerts" on public.stock_alerts;
create policy "Admins delete stock alerts"
  on public.stock_alerts for delete to authenticated
  using (private.is_admin());

create or replace function public.request_stock_alert(
  p_product_id uuid,
  p_variant_id uuid default null,
  p_customer_phone text default null
)
returns table (
  alert_id uuid,
  alert_status text,
  already_requested boolean
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_variant_count integer;
  v_phone text;
  v_existing_id uuid;
  v_new_id uuid;
begin
  select * into v_product
    from public.products
   where id = p_product_id
     and status = 'published';

  if not found then
    raise exception 'This product is not currently available for alerts';
  end if;

  select count(*) into v_variant_count
    from public.product_variants
   where product_id = p_product_id
     and is_active = true;

  if v_variant_count > 0 and p_variant_id is null then
    raise exception 'Choose the product option you want to track';
  end if;

  if p_variant_id is not null then
    select * into v_variant
      from public.product_variants
     where id = p_variant_id
       and product_id = p_product_id
       and is_active = true;

    if not found then
      raise exception 'The selected product option is not available for alerts';
    end if;

    if coalesce(v_variant.stock_quantity, v_product.stock_quantity, 0) > 0 then
      raise exception 'This product option is currently in stock';
    end if;
  elsif coalesce(v_product.stock_quantity, 0) > 0 then
    raise exception 'This product is currently in stock';
  end if;

  v_phone := regexp_replace(coalesce(p_customer_phone,''), '[^0-9+]', '', 'g');

  if v_phone ~ '^0[17][0-9]{8}$' then
    v_phone := '254' || substr(v_phone, 2);
  elsif v_phone ~ '^\+254[17][0-9]{8}$' then
    v_phone := substr(v_phone, 2);
  elsif v_phone ~ '^254[17][0-9]{8}$' then
    v_phone := v_phone;
  else
    raise exception 'Enter a valid Kenyan WhatsApp number';
  end if;

  select id into v_existing_id
    from public.stock_alerts
   where product_id = p_product_id
     and coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
         = coalesce(p_variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and customer_phone = v_phone
     and status = 'pending'
   limit 1;

  if v_existing_id is not null then
    return query select v_existing_id, 'pending'::text, true;
    return;
  end if;

  insert into public.stock_alerts (product_id, variant_id, customer_phone, status)
  values (p_product_id, p_variant_id, v_phone, 'pending')
  returning id into v_new_id;

  return query select v_new_id, 'pending'::text, false;
end;
$$;

revoke all on function public.request_stock_alert(uuid,uuid,text) from public;
grant execute on function public.request_stock_alert(uuid,uuid,text) to anon, authenticated;
