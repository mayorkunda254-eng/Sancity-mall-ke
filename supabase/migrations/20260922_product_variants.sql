create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  size text,
  colour text,
  price numeric(12,2) check (price is null or price >= 0),
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, label)
);

create index if not exists product_variants_product_id_idx
  on public.product_variants(product_id);

alter table public.product_variants enable row level security;

drop policy if exists "Published product variants are public" on public.product_variants;
create policy "Published product variants are public"
  on public.product_variants for select to anon, authenticated
  using (
    private.is_admin()
    or exists (
      select 1 from public.products
      where products.id = product_variants.product_id
        and products.status = 'published'
    )
  );

drop policy if exists "Admins insert product variants" on public.product_variants;
create policy "Admins insert product variants"
  on public.product_variants for insert to authenticated
  with check (private.is_admin());

drop policy if exists "Admins update product variants" on public.product_variants;
create policy "Admins update product variants"
  on public.product_variants for update to authenticated
  using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins delete product variants" on public.product_variants;
create policy "Admins delete product variants"
  on public.product_variants for delete to authenticated
  using (private.is_admin());
