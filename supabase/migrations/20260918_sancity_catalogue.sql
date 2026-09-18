-- Sancity Mall KE admin catalogue
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  description text,
  price numeric(12,2) check (price is null or price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  badge text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_status_created_idx
  on public.products (status, created_at desc);
create index if not exists products_category_idx
  on public.products (category);
create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

drop policy if exists "Admins can read their membership" on public.admin_users;
create policy "Admins can read their membership"
on public.admin_users for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
on public.products for select
to anon, authenticated
using (status = 'published' or private.is_admin());

drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products"
on public.products for insert
to authenticated
with check (private.is_admin());

drop policy if exists "Admins update products" on public.products;
create policy "Admins update products"
on public.products for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products"
on public.products for delete
to authenticated
using (private.is_admin());

drop policy if exists "Published product images are public" on public.product_images;
create policy "Published product images are public"
on public.product_images for select
to anon, authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.status = 'published'
  )
);

drop policy if exists "Admins insert product images" on public.product_images;
create policy "Admins insert product images"
on public.product_images for insert
to authenticated
with check (private.is_admin());

drop policy if exists "Admins delete product images" on public.product_images;
create policy "Admins delete product images"
on public.product_images for delete
to authenticated
using (private.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product image objects" on storage.objects;
create policy "Public can view product image objects"
on storage.objects for select
to public
using (bucket_id = 'product-images');

drop policy if exists "Admins upload product image objects" on storage.objects;
create policy "Admins upload product image objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and private.is_admin());

drop policy if exists "Admins update product image objects" on storage.objects;
create policy "Admins update product image objects"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and private.is_admin())
with check (bucket_id = 'product-images' and private.is_admin());

drop policy if exists "Admins delete product image objects" on storage.objects;
create policy "Admins delete product image objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and private.is_admin());

drop function if exists public.is_admin();
