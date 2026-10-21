-- Store support requests. Rates are enforced in the database as well as the UI.
create table public.service_requests (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references auth.users(id),
 service_code text not null check(service_code in ('ad_setup','poster','photo_cleanup','product_upload','website_change')),
 unit_price numeric(12,2) not null check(unit_price = case service_code when 'ad_setup' then 999 when 'poster' then 499 when 'photo_cleanup' then 50 when 'product_upload' then 100 when 'website_change' then 499 end),
 quantity integer not null check(quantity between 1 and 500),
 estimated_total numeric(12,2) generated always as (unit_price * quantity) stored,
 details text not null check(char_length(trim(details)) between 10 and 4000),
 materials text not null default '' check(char_length(materials)<=2000),
 preferred_date date,
 status text not null default 'pending' check(status in ('pending','quoted','approved','in_progress','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.service_requests enable row level security;
revoke all on public.service_requests from anon,authenticated;
grant select,insert on public.service_requests to authenticated;
grant update(status,updated_at) on public.service_requests to authenticated;
create policy "Staff read support requests" on public.service_requests for select to authenticated using(private.is_admin());
create policy "Staff submit own support requests" on public.service_requests for insert to authenticated with check(private.is_admin() and requester_id=(select auth.uid()) and status='pending');
create policy "Staff track support requests" on public.service_requests for update to authenticated using(private.is_admin()) with check(private.is_admin());
create index service_requests_created_idx on public.service_requests(created_at desc);
