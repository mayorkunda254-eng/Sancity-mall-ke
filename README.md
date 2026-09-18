# Sancity Mall KE

Mobile-first storefront starter for Sancity Mall KE.

## Current phase
- Purple tribal storefront direction frozen for the current implementation phase
- Storefront prerendered at build time for crawlable first-load HTML; React hydrates on the client
- `/admin` intentionally remains client-rendered for Supabase auth/session handling
- Brand system applied
- Responsive homepage
- Category navigation
- Featured product grid and search interaction
- Saved-product interaction
- Wholesale CTA
- WhatsApp conversion placeholder
- Basic SEO metadata

## Next phase
1. Import and verify the real product catalogue and images in Supabase.
2. Add product detail routes and category routes with prerender/SSR coverage.
3. Add analytics, product/schema markup, canonical domain and sitemap URLs.
4. Re-verify mobile UX, WhatsApp CTA consistency and tap targets against the frozen purple tribal direction.
5. Add interaction and motion only after the catalogue and route structure are stable.

## Local development
```bash
npm install
npm run dev
```
