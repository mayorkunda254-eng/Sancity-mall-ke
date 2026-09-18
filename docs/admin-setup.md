# Sancity Mall KE admin setup

The storefront includes a secure `/admin` catalogue manager backed by Supabase.

## Required Vercel environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use the Supabase project URL and its public/publishable client key. Never put a service-role key in Vercel frontend variables.

## Database and storage

Apply `supabase/migrations/20260918_sancity_catalogue.sql`.

It creates:

- `admin_users`
- `products`
- `product_images`
- public `product-images` Storage bucket
- RLS policies so anonymous visitors can only read published products
- RLS policies so only approved admin users can add, update or delete products and images

## First admin account

1. In Supabase Authentication, create or invite the staff account.
2. After that user exists, run:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('YOUR-ADMIN-EMAIL')
on conflict (user_id) do nothing;
```

Do not enable open public signup for the admin workflow.

## Product upload behaviour

- Up to 6 images per item.
- First image is the primary storefront image.
- Maximum image size is 8 MB per file.
- Products can be saved as `draft` or `published`.
- Price is optional; blank price displays as "Price on request".
- Deleting a product removes its Storage images and database record.

## Storefront fallback

Until Supabase is configured, the existing five hard-coded products remain visible. Once dynamic products are available, they are merged ahead of those items and duplicate names are removed.
