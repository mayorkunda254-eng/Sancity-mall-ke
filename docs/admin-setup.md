# Sancity Mall KE admin setup

The storefront includes a secure `/admin` catalogue manager backed by the dedicated Sancity Supabase Free project.

## Supabase project

- Project ref: `aetxzqugccixmxygzmtn`
- Region: `eu-west-1`
- Storage bucket: `product-images`
- Public client configuration is present as a safe frontend fallback in `src/lib/supabase.js`.
- Vercel environment variables can override those values later:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

Never use a service-role key in browser code.

## Database and storage

The production database has the hardened catalogue schema and RLS policies applied.

It includes:

- `admin_users`
- `products`
- `product_images`
- public `product-images` Storage bucket
- public read access to published catalogue data only
- authenticated admin-only create, update and delete permissions
- a private-schema admin-check function so it is not exposed as a public RPC

## First admin account

Create the staff account in Supabase Authentication, then promote it with:

```sql
insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('YOUR-ADMIN-EMAIL')
on conflict (user_id) do nothing;
```

Do not put passwords in source code or ChatGPT. Do not enable unrestricted admin signup.

## Product upload behaviour

- Up to 6 images per item.
- First image is the primary storefront image.
- Maximum image size is 8 MB per file.
- Products can be saved as `draft` or `published`.
- Price is optional; blank price displays as "Price on request".
- Deleting a product removes its Storage images and database record.

## Storefront fallback

The existing five hard-coded products remain visible until dynamic catalogue products are added. Published database products appear first and duplicate fallback names are removed.
