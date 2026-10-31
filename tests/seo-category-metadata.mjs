import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { populatedCategories, categoryPath } from '../src/lib/categories.js'
import { homepageSeo, getCategorySeo } from '../src/lib/seo-content.js'

const htmlEscape = str => str.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
const home = await readFile('dist/index.html', 'utf8')
const preloaded = home.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(preloaded, 'Published catalogue must be embedded in homepage')
const products = JSON.parse(preloaded[1])
assert.ok(home.includes(`<title>${htmlEscape(homepageSeo.title)}</title>`))
assert.ok(home.includes(`content="${htmlEscape(homepageSeo.description)}"`))
const groups = populatedCategories(products)
let checked = 0
const seenTitles = new Set()
for (const group of groups) {
  for (const child of [null, ...group.children]) {
    const route = categoryPath(group, child)
    const seo = getCategorySeo({ group, child }, products)
    const html = await readFile(`dist${route}/index.html`, 'utf8')
    assert.ok(seo.count > 0, `${route} has actual products`)
    assert.ok(!seenTitles.has(seo.title), `Duplicate category title: ${seo.title}`)
    seenTitles.add(seo.title)
    assert.ok(html.includes(`<title>${htmlEscape(seo.title)}</title>`), `${route}: useful title`)
    assert.ok(html.includes(`content="${htmlEscape(seo.description)}"`), `${route}: useful description`)
    assert.ok(html.includes(`rel="canonical" href="https://www.sancitymall.co.ke${route}"`), `${route}: self-canonical`)
    assert.ok(html.includes(htmlEscape(seo.intro)), `${route}: contextual, visible introduction`)
    assert.ok(seo.featuredProducts.length > 0, `${route}: actual products are highlighted`)
    for (const product of seo.featuredProducts) {
      const slug = product.slug || product.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      assert.ok(html.includes(`href="/products/${encodeURIComponent(slug)}"`), `${route}: crawlable featured product`)
    }
    if (seo.count > 16) {
      const directory = html.match(/<details class="category-product-index">([\s\S]*?)<\/details>/)
      assert.ok(directory, `${route}: long categories have a complete browsable directory`)
      const links = [...directory[1].matchAll(/href="\/products\/[^"]+"/g)]
      assert.equal(links.length, seo.count, `${route}: every product is discoverable by a real anchor`)
    }
    checked++
  }
}
console.log(`PASS: ${checked} populated category pages have unique metadata, self-canonicals, descriptive copy, and product links.`)
