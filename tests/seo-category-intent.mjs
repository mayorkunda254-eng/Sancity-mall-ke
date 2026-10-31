import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { categoryGroups, categoryPath, populatedCategories } from '../src/lib/categories.js'
import { categoryLanding } from '../src/lib/seo-landing.js'

const home = await readFile('dist/index.html', 'utf8')
const loaded = home.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(loaded)
const products = JSON.parse(loaded[1])
assert.equal(products.length, 500, 'Prevent accidental change in product catalogue')
const groups = populatedCategories(products)
const titles = new Set()
let counted = 0
for (const group of groups) {
  const paths = [{ group, child: null }, ...group.children.map(child => ({ group, child }))]
  for (const { child } of paths) {
    const route = categoryPath(group, child)
    const html = await readFile('dist' + route + '/index.html', 'utf8')
    const seo = categoryLanding(group, child)
    assert.ok(html.includes('<title>' + seo.title + '</title>'), route + ': correct intent-focused title')
    assert.ok(html.includes('name="description" content="'), route + ': metadata present')
    assert.match(html, /rel="canonical" href="https:\/\/www\.sancitymall\.co\.ke\/categories\//)
    assert.ok(!html.includes('content="noindex,follow"'), route + ': live category not blocked')
    assert.ok(!titles.has(seo.title), route + ': category title must be unique')
    titles.add(seo.title)
    assert.ok(html.includes('Shop by category'))
    if (seo.heading) {
      assert.ok(html.includes('<h2>' + seo.heading + '</h2>'), route + ': crawlable buying guide')
      assert.ok(html.includes('category-buyers-guide'), route + ': useful product-selection guidance')
    }
    counted++
  }
}
for (const [slug,match] of [
 ['kitchen-dining','Kitchenware in Nairobi'],
 ['bedding-bedroom/bedsheets','Bedsheets in Nairobi'],
 ['storage-organisation/wardrobes','Portable & Plastic Wardrobes'],
 ['mosquito-nets','Mosquito Nets in Nairobi'],
]) {
  const [g,c] = slug.split('/')
  const group = categoryGroups.find(group => group.slug === g)
  const child = c ? group.children.find(x=>x.slug===c) : null
  assert.ok(categoryLanding(group,child).title.includes(match))
}
console.log('PASS: '+counted+' populated category pages have unique buyer-intent metadata, canonical URLs and indexable content.')
