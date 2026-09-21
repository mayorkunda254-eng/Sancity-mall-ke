create table if not exists public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  event_type text not null check (event_type in (
    'product_view',
    'quick_view',
    'add_to_cart',
    'checkout_open',
    'promo_applied',
    'whatsapp_click',
    'stock_alert_request',
    'order_created'
  )),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  order_id uuid references public.store_orders(id) on delete set null,
  event_value numeric(12,2) check (event_value is null or event_value >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversion_events_created_at_idx
  on public.conversion_events(created_at desc);
create index if not exists conversion_events_type_created_idx
  on public.conversion_events(event_type, created_at desc);
create index if not exists conversion_events_product_created_idx
  on public.conversion_events(product_id, created_at desc);
create index if not exists conversion_events_session_created_idx
  on public.conversion_events(session_id, created_at desc);

alter table public.conversion_events enable row level security;

drop policy if exists "Admins read conversion analytics" on public.conversion_events;
create policy "Admins read conversion analytics"
  on public.conversion_events for select to authenticated
  using (private.is_admin());

create or replace function public.record_store_event(
  p_session_id text,
  p_event_type text,
  p_product_id uuid default null,
  p_variant_id uuid default null,
  p_event_value numeric default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_id uuid;
  v_session text;
  v_metadata jsonb;
begin
  v_session := trim(coalesce(p_session_id,''));

  if v_session !~ '^[A-Za-z0-9_-]{8,80}$' then
    raise exception 'Invalid analytics session';
  end if;

  if p_event_type not in (
    'product_view',
    'quick_view',
    'add_to_cart',
    'checkout_open',
    'promo_applied',
    'whatsapp_click',
    'stock_alert_request'
  ) then
    raise exception 'Unsupported analytics event';
  end if;

  if p_product_id is not null and not exists (
    select 1 from public.products where id=p_product_id and status='published'
  ) then
    p_product_id := null;
    p_variant_id := null;
  end if;

  if p_variant_id is not null and not exists (
    select 1 from public.product_variants
     where id=p_variant_id and product_id=p_product_id and is_active=true
  ) then
    p_variant_id := null;
  end if;

  v_metadata := case
    when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object'
      then coalesce(p_metadata,'{}'::jsonb)
    else '{}'::jsonb
  end;

  if pg_column_size(v_metadata) > 2048 then
    v_metadata := '{}'::jsonb;
  end if;

  insert into public.conversion_events (
    session_id,event_type,product_id,variant_id,event_value,metadata
  ) values (
    v_session,p_event_type,p_product_id,p_variant_id,
    case when p_event_value is null then null else greatest(p_event_value,0) end,
    v_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_store_event(text,text,uuid,uuid,numeric,jsonb) from public;
grant execute on function public.record_store_event(text,text,uuid,uuid,numeric,jsonb) to anon, authenticated;

create or replace function public.create_store_order_v3(
  p_customer_name text,
  p_customer_phone text,
  p_delivery_method text,
  p_delivery_location text,
  p_delivery_notes text,
  p_items jsonb,
  p_mpesa_code text default null,
  p_delivery_zone_id uuid default null,
  p_promo_code text default null,
  p_session_id text default null
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
  v_result record;
  v_session text;
begin
  select *
    into v_result
    from public.create_store_order_v2(
      p_customer_name,p_customer_phone,p_delivery_method,p_delivery_location,
      p_delivery_notes,p_items,p_mpesa_code,p_delivery_zone_id,p_promo_code
    );

  v_session := trim(coalesce(p_session_id,''));

  if v_session ~ '^[A-Za-z0-9_-]{8,80}$' then
    insert into public.conversion_events (
      session_id,event_type,order_id,event_value,metadata
    ) values (
      v_session,'order_created',v_result.order_id,v_result.total_amount,
      jsonb_build_object(
        'delivery_method', p_delivery_method,
        'promotion_code', v_result.promotion_code
      )
    );
  end if;

  return query
    select
      v_result.order_id,v_result.order_number,v_result.subtotal,
      v_result.discount_amount,v_result.delivery_fee,v_result.total_amount,
      v_result.payment_status,v_result.order_status,v_result.promotion_code;
end;
$$;

revoke all on function public.create_store_order_v3(text,text,text,text,text,jsonb,text,uuid,text,text) from public;
grant execute on function public.create_store_order_v3(text,text,text,text,text,jsonb,text,uuid,text,text) to anon, authenticated;
