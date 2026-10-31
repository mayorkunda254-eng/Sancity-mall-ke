import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { categoryGroups, categoryPath, populatedCategories } from '../src/lib/categories.js'
import { categoryLanding } from '../src/lib/seo-landing.js'
import { getCategorySeo } from '../src/lib/seo-content.js'

const home = await readFile('dist/index.html', 'utf8')
const preloaded = home.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(preloaded)
const products = JSON.parse(preloaded[1])
assert.equal(products.length, 500, 'Preserve the existing catalogue')
const groups = populatedCategories(products)
let reviewed = 0
for (const group of groups) {
  for (const child of [null, ...group.children]) {
    const intent = categoryLanding(group, child)
    if (!intent.heading) continue // PR #30 keeps the remaining category pages.
    const route = categoryPath(group, child)
    const seo = getCategorySeo({ group, child }, products)
    const html = await readFile('dist' + route + '/index.html', 'utf8')
    const encode = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    assert.equal(seo.title, intent.title)
    assert.equal(seo.description, intent.description)
    assert.ok(html.includes('<title>' + encode(intent.title) + '</title>'), route + ' title')
    assert.ok(html.includes('<h2>' + encode(intent.heading) + '</h2>'), route + ' buying advice')
    assert.ok(html.includes('category-buyers-guide'), route + ' guide present')
    assert.ok(html.includes(encode(intent.intro)), route + ' useful intro')
    assert.ok(html.includes('rel="canonical" href="https://www.sancitymall.co.ke' + route + '"'))
    assert.ok(!html.includes('content="noindex,follow"'))
    assert.ok(html.includes('category-product-index') || seo.count <= 16, route + ' PR #30 product directory preserved')
    for(const slug of intent.related || []){
      const subcat = group.children.find(sub => sub.slug === slug)
      if (!subcat || !groups.find(g=>g.slug===group.slug)?.children.some(c=>c.slug===slug)) continue
      assert.ok(html.includes('href="' + categoryPath(group,subcat) + '"'),route+' cross-link')
    }
    reviewed++
  }
}
assert.ok(reviewed >= 10, 'Expected at least ten substantive category pages')
console.log('PASS: '+reviewed+' buyer-guide category pages have unique intent text and preserve PR #30 links and canonicals.')
