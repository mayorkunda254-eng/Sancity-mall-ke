import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { categoryFor, categoryPath } from '../src/lib/categories.js'
import { productSlug, SITE_URL } from '../server/catalogue.mjs'

const home = await readFile('dist/index.html', 'utf8')
const preload = home.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(preload, 'Published products must be present in prerendered HTML')
const products = JSON.parse(preload[1])
assert.match(home, /<h3><a class="product-title-link" href="\/products\/[^"]+"/, 'Home product names use crawlable anchors')
const kitchen = await readFile('dist/categories/kitchen-dining/index.html', 'utf8')
assert.match(kitchen, /<h3><a class="product-title-link" href="\/products\/[^"]+"/, 'Category product names use crawlable anchors')
const samples = [...products.slice(0, 4), ...products.slice(-4)]
for (const product of samples) {
  const canonical = `${SITE_URL}/products/${productSlug(product)}`
  const html = await readFile(`dist/products/${productSlug(product)}/index.html`, 'utf8')
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]))
  const productData = schemas.find(x => x['@type'] === 'Product')
  const breadcrumb = schemas.find(x => x['@type'] === 'BreadcrumbList')
  assert.equal(productData?.url, canonical, 'Product structured data must match canonical')
  assert.ok(breadcrumb, 'Product has breadcrumb structured data')
  assert.equal(breadcrumb.itemListElement.at(-1).item, canonical)
  const category = categoryFor(product.category)
  if (category) {
    assert.equal(breadcrumb.itemListElement.length, 3, 'Home, category, product path')
    assert.equal(breadcrumb.itemListElement[1].item, `${SITE_URL}${categoryPath(category)}`)
  }
  assert.match(html, /class="product-recommendation-grid"/, 'Related products are present')
  assert.match(html, /<a href="\/products\/[^"]+"/, 'Related product links are crawlable')
}
console.log(`PASS: crawlable home/category links, product URLs, breadcrumb hierarchy and related product anchors on ${samples.length} products.`)
