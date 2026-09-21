-- Allows products with size-dependent pricing to display "From KSh ...".
alter table public.products
  add column if not exists price_from boolean not null default false;
