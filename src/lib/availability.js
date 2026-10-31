// Seller confirmation (2026-10-31): published Sancity catalogue items, including
// active variants, are stocked. Legacy stock_quantity=0/null is not an actual
// inventory signal. Keep all product counts untouched while correcting the
// *advertised* availability in product pages and the Merchant Center feed.
//
// Operational guardrail: before tracking real stock, switch this flag to true
// AND ensure that admin inventory counts are accurate. If a published item
// becomes unavailable meanwhile, unpublish it promptly. Never announce
// stock that cannot be fulfilled.
export const QUANTITY_TRACKING_ENABLED = false

export function availabilityStatus(product, variant = null) {
  // Demo/fallback catalogue records are not seller-confirmed.
  if (!product || typeof product.id !== 'string') return 'unknown'
  if (!QUANTITY_TRACKING_ENABLED) return 'in_stock'

  const count = variant?.stock_quantity ?? product.stock_quantity
  if (count === null || count === undefined || count === '') return 'unknown'
  return Number(count) > 0 ? 'in_stock' : 'out_of_stock'
}

export function availabilityLabel(product, variant = null) {
  const status = availabilityStatus(product, variant)
  if (status === 'in_stock') {
    if (QUANTITY_TRACKING_ENABLED) {
      const count = variant?.stock_quantity ?? product.stock_quantity
      return `${count} in stock`
    }
    return 'In stock'
  }
  return status === 'out_of_stock' ? 'Out of stock' : 'Confirm current stock'
}
