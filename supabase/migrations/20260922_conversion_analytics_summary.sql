create or replace function public.get_conversion_analytics(
  p_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_days integer;
  v_since timestamptz;
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Admin access required';
  end if;

  v_days := least(greatest(coalesce(p_days,30),1),90);
  v_since := now() - make_interval(days => v_days);

  with filtered as (
    select *
      from public.conversion_events
     where created_at >= v_since
  ),
  metrics as (
    select
      count(distinct session_id) as tracked_sessions,
      count(distinct session_id) filter (where event_type='product_view') as product_view_sessions,
      count(distinct session_id) filter (where event_type='add_to_cart') as add_to_cart_sessions,
      count(distinct session_id) filter (where event_type='checkout_open') as checkout_sessions,
      count(distinct session_id) filter (where event_type='order_created') as order_sessions,
      count(*) filter (where event_type='whatsapp_click') as whatsapp_clicks,
      count(distinct session_id) filter (where event_type='promo_applied') as promo_sessions,
      count(*) filter (where event_type='stock_alert_request') as stock_alert_requests,
      coalesce(sum(event_value) filter (where event_type='order_created'),0) as placed_order_value
    from filtered
  ),
  top_products as (
    select coalesce(jsonb_agg(row_data order by score desc, product_name asc),'[]'::jsonb) as rows
    from (
      select
        p.id as product_id,
        p.name as product_name,
        p.slug,
        count(*) filter (where f.event_type='product_view') as views,
        count(*) filter (where f.event_type='quick_view') as quick_views,
        count(*) filter (where f.event_type='add_to_cart') as adds,
        count(*) filter (where f.event_type='whatsapp_click') as whatsapp_clicks,
        (
          count(*) filter (where f.event_type='product_view')
          + count(*) filter (where f.event_type='quick_view')
          + (count(*) filter (where f.event_type='add_to_cart') * 3)
          + (count(*) filter (where f.event_type='whatsapp_click') * 2)
        ) as score
      from filtered f
      join public.products p on p.id=f.product_id
      where f.product_id is not null
      group by p.id,p.name,p.slug
      order by score desc,p.name asc
      limit 10
    ) row_data
  ),
  daily as (
    select coalesce(jsonb_agg(row_data order by day),'[]'::jsonb) as rows
    from (
      select
        (created_at at time zone 'Africa/Nairobi')::date as day,
        count(distinct session_id) filter (where event_type='product_view') as viewers,
        count(distinct session_id) filter (where event_type='add_to_cart') as carts,
        count(distinct session_id) filter (where event_type='checkout_open') as checkouts,
        count(distinct session_id) filter (where event_type='order_created') as orders
      from filtered
      group by (created_at at time zone 'Africa/Nairobi')::date
      order by day
    ) row_data
  )
  select jsonb_build_object(
    'days', v_days,
    'since', v_since,
    'tracked_sessions', m.tracked_sessions,
    'product_view_sessions', m.product_view_sessions,
    'add_to_cart_sessions', m.add_to_cart_sessions,
    'checkout_sessions', m.checkout_sessions,
    'order_sessions', m.order_sessions,
    'whatsapp_clicks', m.whatsapp_clicks,
    'promo_sessions', m.promo_sessions,
    'stock_alert_requests', m.stock_alert_requests,
    'placed_order_value', m.placed_order_value,
    'top_products', tp.rows,
    'daily', d.rows
  )
  into v_result
  from metrics m
  cross join top_products tp
  cross join daily d;

  return v_result;
end;
$$;

revoke all on function public.get_conversion_analytics(integer) from public;
grant execute on function public.get_conversion_analytics(integer) to authenticated;
