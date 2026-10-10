-- Optional overrides; existing products continue to group by name.
alter table public.products add column if not exists subcategory text;
comment on column public.products.subcategory is 'Optional subcategory slug from the shared storefront taxonomy. NULL enables automatic grouping; other keeps the item in More in this department.';
notify pgrst, 'reload schema';
