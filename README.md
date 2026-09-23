# Sancity Mall KE

Production-oriented React/Vite e-commerce storefront for Sancity Mall KE.

## Current state

- Responsive desktop and mobile storefront
- 500-product Supabase catalogue with product images and descriptions
- Search, category navigation, filters and predictive discovery
- Clickable product cards, scroll-safe quick view and full product routes
- Cart, checkout, delivery-zone handling and WhatsApp conversion paths
- Paybill checkout instructions for 247247 / account 0705287264
- Authenticated admin catalogue management and batch image import
- Order administration with payment, fulfilment and follow-up date/status controls
- First-party conversion analytics and internal search-query reporting
- Consent-aware optional analytics with Essential only / Allow analytics choices
- Privacy, Cookie Policy, Terms and Shipping & Returns pages
- Product, breadcrumb and Organization structured data
- Prerendered product routes, canonical metadata, sitemap and Merchant Center feed
- Reduced-motion accessibility support
- Responsive high-resolution homepage hero assets

## Analytics

First-party Supabase analytics and internal search reporting are built into the storefront and run only after analytics consent is granted.

Google Analytics is optional. Set:

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

When configured, the Google tag is loaded only after the visitor chooses **Allow analytics**.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The build prerenders the homepage, legal pages and product routes, then generates `sitemap.xml` and the Merchant Center feed.
