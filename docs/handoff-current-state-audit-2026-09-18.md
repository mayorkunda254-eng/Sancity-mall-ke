# Sancity Mall KE — Handoff Current-State Audit

Date: 2026-09-18
Basis: consolidated developer handoff + current `main` + connected Supabase project.

Status legend:
- **Done** — implemented on current `main`.
- **Needs work** — partially implemented or blocked by missing data/routes.
- **Not started** — no implementation found on current `main`.

## Executive state

The purple/cream/tribal design direction is now frozen. The homepage is prerendered at build time and hydrated on the client. Supabase schema, RLS, storage and admin authentication are present, but the production catalogue is still empty. The next dependency is real catalogue ingestion and storefront support for uploaded product photography.

## Handoff mapping

| Handoff item | Status | Current evidence / gap |
|---|---|---|
| P0-1 Crawlable rendering | **Needs work** | Homepage is prerendered via `src/entry-server.jsx` + `scripts/prerender.mjs`; `/admin` stays CSR. Category/product routes do not exist yet, so they cannot be prerendered. |
| P0-2 Freeze design direction | **Done** | README explicitly freezes the purple tribal direction for the current implementation phase. |
| Category nav spacing / mobile horizontal navigation | **Done** | Current department nav uses explicit gaps and horizontal overflow behavior. |
| Standardize WhatsApp treatment | **Done** | Main WhatsApp conversion CTAs use green; mobile WhatsApp shortcut is present. |
| Remove misleading placeholder listings | **Needs work** | Supabase has 0 real products, while the storefront still renders five fallback/sample products as normal catalogue cards. |
| Mobile tap targets / thumb-zone WhatsApp | **Done** | Carry-forward mobile UX work was merged in PR #13. |
| Supabase connection | **Done** | Storefront and admin are connected to the Sancity Supabase project. |
| Product/admin schema + RLS + image bucket | **Done** | `products`, `product_images`, `admin_users`, RLS policies and public `product-images` bucket exist. |
| Real catalogue import | **Not started** | Supabase currently has 0 products and 0 product images. |
| Public storefront renders uploaded product photos | **Needs work** | Admin uploads `product_images`, but storefront currently selects only product text/price/stock and therefore cannot display uploaded photos. |
| Product detail routes | **Not started** | No product route/router implementation found. |
| Category routes | **Not started** | Categories currently filter the homepage grid only. |
| Cart / WhatsApp checkout | **Done** | Local cart, quantities, subtotal and WhatsApp checkout are implemented. |
| Wishlist | **Done** | Wishlist state and filtering are implemented. |
| Analytics | **Not started** | No analytics integration found. |
| Schema markup | **Not started** | No JSON-LD found. |
| Canonical URLs | **Not started** | No canonical tags found. |
| Sitemap | **Not started** | No `public/sitemap.xml` found. |
| Quick-view modal | **Not started** | No quick-view implementation found. |
| Skeleton loading | **Not started** | No skeleton-loading implementation found. |
| Interactive shopping filters | **Done / partial** | Category/search filtering works live; no richer need-based filter layer yet. |
| Wholesale quantity calculator | **Not started** | Wholesale remains a WhatsApp request CTA. |
| Stock availability micro-interactions | **Not started** | Stock text exists, but no animated availability state. |
| Add-to-cart / wishlist confirmation animation | **Needs work** | Actions work, but no dedicated success morph/toast/bounce layer found. |
| View Transitions API | **Not started** | No view-transition code found. |
| Reduced-motion support | **Not started** | No `prefers-reduced-motion` rule found. |
| Scroll/header/reveal/gallery motion | **Not started** | No IntersectionObserver or page-motion layer found. |
| Real product photography | **Not started in live catalogue** | Current cards use emojis because Supabase catalogue is empty. |
| Soft shadows / warm base polish | **Done / partial** | Warm cream/purple system and layered shadows exist; can be revisited once real photography lands. |
| Editorial typography | **Done / partial** | Inter/Manrope plus scripted hero treatment are present; section-level editorial usage is limited. |
| Custom category icon system | **Not started** | Category system still uses emoji. |

## Supabase verification

Current project state:
- Auth users: **1**
- Products: **0**
- Published products: **0**
- Product images: **0**
- `product-images` bucket: public, max 8 MB, JPEG/PNG/WebP/AVIF allowed
- RLS: enabled on catalogue tables; admin write policies and public published-read policies are present

Security housekeeping:
- Supabase currently warns that leaked-password protection is disabled. This does not block catalogue work, but should be enabled before broader staff/admin use.

## Immediate implementation sequence

1. Make the public storefront consume `product_images` uploaded by `/admin`.
2. Import the first verified real products and photos into Supabase.
3. Remove or explicitly demote the five fallback/sample cards once real inventory exists.
4. Add category + product routes and extend prerendering to them.
5. Add canonical URLs, sitemap and structured data.
6. Add analytics.
7. Only then begin quick-view, skeletons, stock micro-interactions and motion.

## Current phase

**Phase 1 is architecture/data stabilization, not redesign.**
