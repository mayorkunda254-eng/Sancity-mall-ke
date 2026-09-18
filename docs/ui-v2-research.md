# Sancity Mall KE — UI V2 Research Notes

## Public Sancity footprint reviewed

Current public business records identify Sancity as a Nairobi wholesale/supply store selling:
- Duvets
- Mosquito nets
- Kitchenware
- Kids' items
- Home gym items

The same public listing links a Facebook presence and an Instagram reference and gives:
- WhatsApp / phone: 0710 900 548
- Store: RNG Plaza, 2nd Floor, Shop S27, Ronald Ngala Street, Nairobi
- Retail/wholesale positioning

Source reviewed:
- https://kenya.worldplaces.me/review/90658468-san-city-mall.html

Important: social platforms did not expose enough current public feed data through search to verify present follower counts, current post frequency, current prices, or current top-performing individual posts. Those should be confirmed from the business's logged-in social profiles before production launch.

## UX direction

V2 is intentionally marketplace-first rather than editorial.

Key decisions:
- Persistent, prominent search
- Compact commercial hero
- Product categories immediately visible
- Dense 2-column mobile product grid
- Saved-item state
- Separate wholesale path
- WhatsApp as a conversion route, not a replacement for navigation
- Mobile bottom navigation
- Filter/sort controls prepared for catalogue growth
- No invented product prices in the preview

Research references:
- https://baymard.com/blog/mobile-ux-ecommerce
- https://baymard.com/research/ecommerce-product-lists
- https://baymard.com/research-articles/current-state-product-list-and-filtering

## Before production

Confirm:
1. Official current WhatsApp number
2. Exact current physical address
3. Current opening hours
4. Official Facebook, Instagram and TikTok handles
5. Real product names, prices, variants and stock
6. Product photography
7. Delivery and returns terms
8. Wholesale minimum quantities


## Colour system applied

The V2 branch now uses an accessible warm-neutral + terracotta + teal system:

- Charcoal `#181818` — primary text and structural contrast
- White `#FFFFFF` — product/card surfaces
- Ivory `#F8F6F1` — warm section background
- Terracotta `#C96F45` — brand accent and decorative use
- Deep terracotta `#A95734` — primary action colour with white text
- Deep teal `#1F5A5A` — trust, utility, wholesale and secondary UI accents
- Teal soft `#E8F0EE` — secondary CTA/background use
- Sage `#DCE3D8` — category and home/storage surfaces
- Sand `#ECE2D6` — category and bedding/kitchen surfaces
- WhatsApp green `#25D366` — reserved for WhatsApp conversion only

The lighter terracotta is intentionally not used as a normal-text button background with white text. Primary buttons use the deeper terracotta for stronger contrast.
