import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { productSlug } from '../server/catalogue.mjs'

const homepage = await readFile('dist/index.html', 'utf8')
const preloaded = homepage.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(preloaded, 'Generated homepage must include published products')
const products = JSON.parse(preloaded[1])
assert.ok(products.length >= 490, 'Do not accidentally drop the catalogue')
let checked = 0
for (const product of [...products.slice(0, 10), ...products.slice(-10)]) {
  const html = await readFile(`dist/products/${productSlug(product)}/index.html`, 'utf8')
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]))
  const data = schemas.find(s => s['@type'] === 'Product')
  assert.ok(data, 'Product JSON-LD present')
  assert.ok(!('width' in data || 'height' in data || 'depth' in data), 'Never convert set sizes into physical dimensions')
  const values = data.additionalProperty || []
  const expected = [
    ['Size, capacity or configuration', product.dimensions],
    ['Key features', product.key_features],
    ['Care instructions', product.care_instructions],
  ].filter(([,v])=>typeof v==='string'&&v.trim())
  assert.equal(values.length, expected.length, 'Only present source-backed specifications')
  for (const [name,value] of expected) assert.ok(values.some(p=>p['@type']==='PropertyValue'&&p.name===name&&p.value===value.trim()))
  if (product.dimensions) assert.ok(html.includes('Size / capacity / configuration'), 'UI does not mislabel set counts as dimensions')
  checked++
}
console.log(`PASS: ${checked} products: source-backed Product JSON-LD, no fabricated dimensions, and accurate detail labels.`)
