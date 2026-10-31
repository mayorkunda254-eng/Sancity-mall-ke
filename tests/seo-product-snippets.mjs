import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { productSeo, isPriorityProduct } from '../src/lib/seo-product.js'
import { productSlug } from '../server/catalogue.mjs'
const index = await readFile('dist/index.html', 'utf8')
const m = index.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(m)
const products = JSON.parse(m[1])
assert.equal(products.length, 500)
const priority = products.filter(isPriorityProduct)
assert.ok(priority.length >= 55, 'Enough source-backed priority products exist')
const sample = [
  ...priority.filter(x => /hotpot/i.test(x.name)).slice(0,5),
  ...priority.filter(x => /bed.?sheet/i.test(x.name)).slice(0,4),
  ...priority.filter(x => /wardrobe/i.test(x.name)).slice(0,4),
  ...priority.filter(x => /mosquito/i.test(x.name)).slice(0,4),
  ...priority.filter(x => /dish rack/i.test(x.name)).slice(0,4),
]
const escapeHtml = v => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
for (const product of sample) {
  const seo = productSeo(product)
  assert.equal(seo.targeted, true)
  assert.ok(seo.description.includes(product.name))
  assert.ok(seo.description.includes('Nairobi'))
  assert.ok(seo.description.length <= 160)
  assert.ok(seo.description.endsWith('.'),product.name+' sentence-complete snippet')
  const html = await readFile('dist/products/'+productSlug(product)+'/index.html','utf8')
  assert.ok(html.includes('<title>'+escapeHtml(seo.title)+'</title>'), product.name+' title')
  assert.ok(html.includes('name="description" content="'+escapeHtml(seo.description)+'"'),product.name+' description')
  assert.ok(html.includes('rel="canonical" href="https://www.sancitymall.co.ke/products/'+productSlug(product)+'"'),product.name+' canonical')
  assert.ok(html.includes('<h1>'+escapeHtml(product.name)+'</h1>'),product.name+' H1')
}
const control = products.find(p=>!isPriorityProduct(p))
assert.ok(control)
assert.equal(productSeo(control).title,control.name+' | Sancity Mall KE')
const xml=await readFile('dist/sitemap.xml','utf8')
assert.equal((xml.match(/<loc>/g)||[]).length,551)
const merchant=await readFile('dist/merchant-feed.xml','utf8')
assert.equal((merchant.match(/<item>/g)||[]).length,559)
assert.equal((merchant.match(/<g:availability>in_stock<\/g:availability>/g)||[]).length,559)
console.log('PASS: '+priority.length+' target products, '+sample.length+' tested product pages, preserved 551 sitemap URLs and 559 feed entries.')
