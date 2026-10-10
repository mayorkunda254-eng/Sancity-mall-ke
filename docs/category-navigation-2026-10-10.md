# Sancity category navigation

Kitchen & Dining previously combined 303 products in one view. The shared category registry now groups products into focused subcategories and provides desktop department navigation, mobile accordions, photograph category cards and dedicated category pages.

Existing database department names and product URLs are retained. Legacy `Fitness` values map to `Home Fitness` in browsing. Existing products use name-based grouping, with an optional `products.subcategory` override. The admin upload form and each existing product row can set that override; `NULL` restores automatic grouping and `other` places the product under More in its department. Published groups alone appear in navigation and the sitemap. Empty known routes are prebuilt with `noindex,follow` so an administrator can later assign products to them without introducing broken destinations. Rebuild after catalogue changes to refresh prerendered content and indexability, as with the existing product-page workflow.

The additive `product_subcategories` migration was applied to the existing Sancity Supabase project on 10 October 2026. All 500 published products retained their department, price, stock and URL; no overrides were backfilled. No access policies were changed.

Validation: `npm run build` and `npm run test:categories`; the latter validates all published products, matching, route roundtrips, ambiguous names, explicit overrides, server-rendered headings, canonical URLs, sitemap entries and empty-category indexing. Additional DOM interaction checks exercised menu open/Escape, collapsed mobile accordions, product navigation and return to shop. These DOM checks do not verify visual rendering at mobile or desktop sizes.

LuxeHome returned Store not found in the inspection browser. This change is based on Sancity's own catalogue; its category structure is not a verified reproduction of LuxeHome.
