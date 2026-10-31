import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { availabilityLabel, availabilityStatus } from '../src/lib/availability.js'
import { buildMerchantFeed, productSlug } from '../server/catalogue.mjs'

const sample = {
  id: 'published-product',
  name: 'Sample stocked product',
  slug: 'sample-stocked-product',
  category: 'Kitchen & Dining',
  price: 850,
  stock_quantity: 0,
  product_images: [{ public_url: 'https://example.org/item.webp', sort_order: 0 }],
  product_variants: [],
}
assert.equal(availabilityStatus(sample), 'in_stock', 'Published products are seller-confirmed stocked despite untracked zero quantities')
assert.equal(availabilityLabel(sample), 'In stock')
assert.equal(availabilityStatus({ ...sample, stock_quantity: null }), 'in_stock')
assert.equal(availabilityStatus({ ...sample, stock_quantity: 10 }), 'in_stock')
assert.equal(availabilityStatus({ id: 1, stock_quantity: 0 }), 'unknown', 'Local demo listings are not seller-confirmed')
assert.equal(availabilityStatus(sample, { id: 'variant', stock_quantity: 0 }), 'in_stock')
const merchant = buildMerchantFeed([sample, {
  ...sample,
  id: 'variants-product',
  slug: 'variant-product',
  product_variants: [
    { id: 'small', label: 'Small', price: 850, stock_quantity: 0, is_active: true },
    { id: 'large', label: 'Large', price: 1000, stock_quantity: null, is_active: true },
  ],
}])
assert.equal((merchant.match(/<g:availability>in_stock<\/g:availability>/g) || []).length, 3)
assert.ok(!merchant.includes('<g:availability>out_of_stock</g:availability>'))

// Validate the built HTML and feed against the *same* published catalogue.
const home = await readFile('dist/index.html', 'utf8')
const preloaded = home.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(preloaded, 'Prerender must include published products')
const products = JSON.parse(preloaded[1])
assert.ok(products.length >= 490, 'Guard against catalogue loss')
const xml = await readFile('dist/merchant-feed.xml', 'utf8')
const items = (xml.match(/<item>/g) || []).length
const inStock = (xml.match(/<g:availability>in_stock<\/g:availability>/g) || []).length
assert.ok(items > 0)
assert.equal(inStock, items, 'Every advertised item reflects seller-confirmed stocked status')
for (const product of [...products.slice(0, 10), ...products.slice(-10), ...products.filter(p => p.product_variants?.length).slice(0, 5)]) {
  const html = await readFile(`dist/products/${productSlug(product)}/index.html`, 'utf8')
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  const structured = scripts.map(match => JSON.parse(match[1]))
  const schema = structured.find(x => x['@type'] === 'Product')
  assert.ok(schema, 'Product markup must be present')
  if (!schema.offers) continue // Unpriced items legitimately omit offers
  const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers]
  for (const offer of offers) {
    assert.equal(offer['@type'], 'Offer', 'Use per-variant Offer rather than AggregateOffer')
    assert.equal(offer.availability, 'https://schema.org/InStock')
    assert.equal(offer.priceCurrency, 'KES')
  }
  assert.ok(html.includes('In stock'), 'Customer-facing availability must agree with Google')
}
console.log(`PASS: ${items} Merchant feed items and product JSON-LD agree on seller-confirmed in-stock availability.`)
