-- Optional premium product information for richer storefront detail pages.
-- All fields are nullable so existing catalogue items continue to work unchanged.

alter table public.products
  add column if not exists dimensions text,
  add column if not exists material text,
  add column if not exists colour text,
  add column if not exists key_features text,
  add column if not exists care_instructions text,
  add column if not exists delivery_note text;
