import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { categoryGroups, categoryPath, matchesSubcategory, normalizeCategory, populatedCategories, resolveCategoryRoute, subcategoryFor } from '../src/lib/categories.js'

// Ambiguous names need product-type precedence rather than substring matches.
for (const [name, slug] of [
  ['Sokany Hand Mixer with Bowl', 'kitchen-appliances'],
  ['6-Piece Ceramic Bowl Set', 'dinnerware'],
  ['10-Piece Stainless Steel Cookware Set', 'cookware'],
  ['4-Piece Insulated Hotpot Set', 'hotpots-serving'],
  ['4-Piece Borosilicate Storage Container Set with Thermal Bag', 'food-storage'],
  ['2-Piece Borosilicate Glass Baking Tin Set', 'bakeware'],
  ['Signature 2L Food Flask with 3 Bowls', 'drinkware-flasks'],
]) assert.equal(subcategoryFor({ name, category: 'Kitchen & Dining' })?.slug, slug, name)
assert.equal(subcategoryFor({ name: 'Mug', category: 'Kitchen & Dining', subcategory: 'other' }), null)
assert.equal(subcategoryFor({ name: 'Mug', category: 'Kitchen & Dining', subcategory: 'dinnerware' })?.slug, 'dinnerware')
assert.equal(normalizeCategory('Fitness'), 'Home Fitness')
assert.equal(resolveCategoryRoute('/categories/not-real'), null)
assert.equal(resolveCategoryRoute('/categories/kitchen-dining/not-real'), null)
assert.equal(populatedCategories([]).length, 0)

// Use the same published snapshot embedded in the build, with no extra network read.
const homepage = await readFile('dist/index.html', 'utf8')
const preload = homepage.match(/<script[^>]*id="sancity-preloaded-products"[^>]*>(.*?)<\/script>/s)
assert.ok(preload, 'Built homepage contains the published catalogue')
const products = JSON.parse(preload[1])
const groups = populatedCategories(products)
assert.equal(groups.reduce((sum, group) => sum + group.count, 0), products.length, 'Every published product belongs to a visible department')
const sitemap = await readFile('dist/sitemap.xml', 'utf8')
for (const group of groups) {
  assert.equal(group.children.reduce((sum, child) => sum + child.count, 0), group.count, 'No lost or duplicated products in subcategories')
  for (const child of group.children) {
    const route = categoryPath(group, child)
    assert.equal(resolveCategoryRoute(route).child.slug, child.slug)
    assert.equal(products.filter(product => normalizeCategory(product.category) === group.name && matchesSubcategory(product, child.slug)).length, child.count)
    const html = await readFile(`dist${route}/index.html`, 'utf8')
    assert.ok(html.includes(`<h1>${child.name.replace(/&/g, '&amp;')}</h1>`), `${route} has a server-rendered heading`)
    assert.ok(html.includes(`href="https://www.sancitymall.co.ke${route}"`), `${route} has its own canonical`)
    assert.ok(!html.includes('in this view.'), `${route} omits the public product total`)
    assert.ok(sitemap.includes(`${route}</loc>`), `${route} appears in the sitemap`)
    assert.ok(!html.includes('content="noindex,follow"'), `${route} is indexable`)
  }
}
for (const group of categoryGroups) {
  const live = groups.find(item => item.slug === group.slug)
  for (const child of [...group.children, { slug: 'other' }]) {
    const route = categoryPath(group, child)
    await access(`dist${route}/index.html`)
    if (!live?.children.some(item => item.slug === child.slug)) {
      const html = await readFile(`dist${route}/index.html`, 'utf8')
      assert.ok(html.includes('content="noindex,follow"'), 'Empty destinations are noindex')
      assert.ok(!sitemap.includes(`${route}</loc>`), 'Empty destinations are excluded from sitemap')
    }
  }
}
assert.ok((await readFile('dist/404.html', 'utf8')).includes('noindex,nofollow,noarchive'))
console.log(`PASS: ${products.length} products, ${groups.length} departments, ${groups.reduce((sum, group) => sum + group.children.length, 0)} populated subcategories; matching, routes, SSR headings, canonicals, sitemap and empty-category indexing.`)
