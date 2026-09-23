import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  SITE_URL,
  activeVariants,
  buildMerchantFeed,
  buildSitemap,
  effectivePrice,
  fetchPublishedProducts,
  productImages,
  productSlug,
} from '../server/catalogue.mjs'

const root = process.cwd()
const clientIndex = resolve(root, 'dist/index.html')
const serverEntry = resolve(root, 'dist-ssr/entry-server.js')

const shell = await readFile(clientIndex, 'utf8')
const { render } = await import(pathToFileURL(serverEntry).href)
const products = await fetchPublishedProducts()

if (!shell.includes('<div id="root"></div>')) {
  throw new Error('Prerender failed: root placeholder not found in built index.html')
}

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const safeJson = (value) => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026')

function setTitle(document, title) {
  const tag = `<title>${escapeHtml(title)}</title>`
  return /<title>[^<]*<\/title>/i.test(document)
    ? document.replace(/<title>[^<]*<\/title>/i, tag)
    : document.replace('</head>', `  ${tag}\n  </head>`)
}

function setMeta(document, attribute, key, content) {
  const regex = new RegExp(`<meta\\s+${attribute}=["']${escapeRegExp(key)}["'][^>]*>`, 'i')
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`
  return regex.test(document)
    ? document.replace(regex, tag)
    : document.replace('</head>', `  ${tag}\n  </head>`)
}

function setCanonical(document, href) {
  const regex = /<link\s+rel=["']canonical["'][^>]*>/i
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`
  return regex.test(document)
    ? document.replace(regex, tag)
    : document.replace('</head>', `  ${tag}\n  </head>`)
}

function addJsonLd(document, data) {
  const script = `<script type="application/ld+json">${safeJson(data)}</script>`
  return document.replace('</head>', `  ${script}\n  </head>`)
}

function injectApp(document, html, liveProducts) {
  const preload = `<script id="sancity-preloaded-products" type="application/json">${safeJson(liveProducts)}</script>`
  return document
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
    .replace('</body>', `  ${preload}\n  </body>`)
}

function productOffer(product, canonical) {
  const variants = activeVariants(product)
  const variantPrices = variants
    .map((variant) => effectivePrice(product, variant))
    .filter((price) => price !== null && Number.isFinite(price))

  const seller = {
    '@type': 'Organization',
    name: 'Sancity Mall KE',
    url: SITE_URL,
  }

  if (variantPrices.length > 0) {
    return {
      '@type': 'AggregateOffer',
      url: canonical,
      priceCurrency: 'KES',
      lowPrice: Math.min(...variantPrices),
      highPrice: Math.max(...variantPrices),
      offerCount: variantPrices.length,
      seller,
    }
  }

  const price = effectivePrice(product)
  if (price === null || !Number.isFinite(price) || product.price_from) return null

  return {
    '@type': 'Offer',
    url: canonical,
    priceCurrency: 'KES',
    price,
    itemCondition: 'https://schema.org/NewCondition',
    ...(Number(product.stock_quantity) > 0
      ? { availability: 'https://schema.org/InStock' }
      : {}),
    seller,
  }
}

function productSchema(product, canonical) {
  const images = productImages(product).map((image) => image.public_url)
  const offer = productOffer(product, canonical)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} from Sancity Mall KE.`,
    sku: product.id,
    category: product.category || undefined,
    image: images.length > 0 ? images : undefined,
    color: product.colour || undefined,
    material: product.material || undefined,
    ...(offer ? { offers: offer } : {}),
  }
}

function breadcrumbSchema(product, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Sancity Mall KE',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.name,
        item: canonical,
      },
    ],
  }
}

function homepageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sancity Mall KE',
    url: SITE_URL,
    logo: `${SITE_URL}/sancity-logo.svg`,
    telephone: '+254705287264',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'RNG Plaza, Ronald Ngala Street',
      addressLocality: 'Nairobi',
      addressCountry: 'KE',
    },
  }
}

function applyCommonSocialMeta(document, { title, description, canonical, image = null, type = 'website' }) {
  let result = setTitle(document, title)
  result = setMeta(result, 'name', 'description', description)
  result = setMeta(result, 'name', 'robots', 'index,follow,max-image-preview:large')
  result = setMeta(result, 'property', 'og:title', title)
  result = setMeta(result, 'property', 'og:description', description)
  result = setMeta(result, 'property', 'og:type', type)
  result = setMeta(result, 'property', 'og:url', canonical)
  result = setMeta(result, 'name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  result = setMeta(result, 'name', 'twitter:title', title)
  result = setMeta(result, 'name', 'twitter:description', description)
  if (image) {
    result = setMeta(result, 'property', 'og:image', image)
    result = setMeta(result, 'name', 'twitter:image', image)
  }
  return setCanonical(result, canonical)
}

const storefrontHtml = render({ products, path: '/' })

if (!storefrontHtml.includes('SANCITY') || !storefrontHtml.includes('Delivered across Kenya')) {
  throw new Error('Prerender failed: storefront HTML is missing expected content')
}

let storefrontDocument = injectApp(shell, storefrontHtml, products)
storefrontDocument = applyCommonSocialMeta(storefrontDocument, {
  title: 'Sancity Mall KE | Home Essentials in Nairobi',
  description: 'Shop bedding, kitchenware, storage and everyday home essentials from Sancity Mall KE in Nairobi, with pickup and delivery options across Kenya.',
  canonical: `${SITE_URL}/`,
  image: `${SITE_URL}/hero-bedroom-desktop.webp`,
})
storefrontDocument = addJsonLd(storefrontDocument, homepageSchema())

await writeFile(clientIndex, storefrontDocument, 'utf8')

const productsDirectory = resolve(root, 'dist/products')
await mkdir(productsDirectory, { recursive: true })

for (const product of products) {
  const slug = productSlug(product)
  if (!slug) continue

  const route = `/products/${slug}`
  const canonical = `${SITE_URL}${route}`
  const html = render({ products, path: route })
  const mainImage = productImages(product)[0]?.public_url || null
  const description = String(
    product.description ||
    `${product.name} from Sancity Mall KE. Shop household and lifestyle products in Nairobi with delivery options across Kenya.`,
  ).trim().slice(0, 160)

  let document = injectApp(shell, html, products)
  document = applyCommonSocialMeta(document, {
    title: `${product.name} | Sancity Mall KE`,
    description,
    canonical,
    image: mainImage,
    type: 'product',
  })
  document = addJsonLd(document, productSchema(product, canonical))
  document = addJsonLd(document, breadcrumbSchema(product, canonical))

  const outputDirectory = resolve(productsDirectory, slug)
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(resolve(outputDirectory, 'index.html'), document, 'utf8')
}

const staticPages = [
  {
    path: '/shipping-returns',
    title: 'Shipping & Returns | Sancity Mall KE',
    description: 'Delivery, pickup, damaged-item reports, returns and refunds for Sancity Mall KE orders.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Sancity Mall KE',
    description: 'How Sancity Mall KE handles checkout, order, availability-request and first-party analytics information.',
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | Sancity Mall KE',
    description: 'Essential browser storage and optional analytics choices used by Sancity Mall KE.',
  },
  {
    path: '/terms',
    title: 'Terms of Service | Sancity Mall KE',
    description: 'Terms that apply when browsing, ordering, paying for or receiving products from Sancity Mall KE.',
  },
]

for (const page of staticPages) {
  const html = render({ products, path: page.path })
  let document = injectApp(shell, html, products)
  document = applyCommonSocialMeta(document, {
    title: page.title,
    description: page.description,
    canonical: `${SITE_URL}${page.path}`,
    image: `${SITE_URL}/hero-bedroom-desktop.webp`,
  })

  const outputDirectory = resolve(root, `dist${page.path}`)
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(resolve(outputDirectory, 'index.html'), document, 'utf8')
}

let notFoundDocument = injectApp(shell, render({ products, path: '/404' }), products)
notFoundDocument = setTitle(notFoundDocument, 'Page not found | Sancity Mall KE')
notFoundDocument = setMeta(notFoundDocument, 'name', 'description', 'The page you requested could not be found on Sancity Mall KE.')
notFoundDocument = setMeta(notFoundDocument, 'name', 'robots', 'noindex,nofollow,noarchive')
await writeFile(resolve(root, 'dist/404.html'), notFoundDocument, 'utf8')

const adminDirectory = resolve(root, 'dist/admin')
await mkdir(adminDirectory, { recursive: true })
let adminDocument = setTitle(shell, 'Sancity Mall KE | Store Admin')
adminDocument = setMeta(adminDocument, 'name', 'robots', 'noindex,nofollow,noarchive')
await writeFile(resolve(adminDirectory, 'index.html'), adminDocument, 'utf8')

await writeFile(resolve(root, 'dist/sitemap.xml'), buildSitemap(products), 'utf8')
await writeFile(resolve(root, 'dist/merchant-feed.xml'), buildMerchantFeed(products), 'utf8')

await rm(resolve(root, 'dist-ssr'), { recursive: true, force: true })

console.log(`Prerendered storefront HTML: ${storefrontHtml.length.toLocaleString()} characters`)
console.log(`Prerendered ${products.length.toLocaleString()} product page(s)`)
console.log('Prerendered privacy, cookie policy, terms, shipping/returns and custom 404 pages')
console.log('Generated sitemap.xml and Merchant Center feed')
console.log('Kept /admin as a noindex client-rendered shell')
