const defaultSiteUrl = 'https://sancity-mall-ke-v3.vercel.app'
const defaultSupabaseUrl = 'https://aetxzqugccixmxygzmtn.supabase.co'
const defaultPublishableKey = 'sb_publishable_1vl9pWJnjXiseJJdHTPReQ_hXr6H0ta'

export const SITE_URL = (process.env.VITE_SITE_URL || process.env.SITE_URL || defaultSiteUrl).replace(/\/$/, '')
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || defaultSupabaseUrl).replace(/\/$/, '')
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  defaultPublishableKey

const productSelect = [
  'id',
  'name',
  'slug',
  'category',
  'badge',
  'description',
  'dimensions',
  'material',
  'colour',
  'key_features',
  'care_instructions',
  'delivery_note',
  'price',
  'compare_at_price',
  'price_from',
  'stock_quantity',
  'created_at',
  'updated_at',
  'product_images(public_url,sort_order)',
  'product_variants(id,label,size,colour,price,stock_quantity,is_active,sort_order)',
].join(',')

export const slugify = (value = '') => value
  .toString()
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const productSlug = (product) => product?.slug || slugify(product?.name)

export const productImages = (product) => [...(product?.product_images || [])]
  .filter((image) => image?.public_url)
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

export const activeVariants = (product) => [...(product?.product_variants || [])]
  .filter((variant) => variant?.is_active !== false)
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

export const effectivePrice = (product, variant = null) => {
  if (variant?.price !== null && variant?.price !== undefined) return Number(variant.price)
  if (product?.price !== null && product?.price !== undefined) return Number(product.price)
  return null
}

const normalise = (product) => ({
  ...product,
  product_images: productImages(product),
  product_variants: activeVariants(product),
})

export async function fetchPublishedProducts() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/products`)
  url.searchParams.set('select', productSelect)
  url.searchParams.set('status', 'eq.published')
  url.searchParams.set('order', 'created_at.desc')

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Could not load published Sancity products (${response.status}): ${detail.slice(0, 300)}`)
  }

  const products = await response.json()
  return Array.isArray(products) ? products.map(normalise) : []
}

export const xmlEscape = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const clip = (value = '', max = 5000) => String(value || '').trim().slice(0, max)

function productDescription(product) {
  const description = clip(product.description)
  if (description) return description
  return `${product.name} from Sancity Mall KE. Shop household and lifestyle products in Nairobi with delivery options across Kenya.`
}

function availabilityFor(stock) {
  if (stock === null || stock === undefined || stock === '') return 'out_of_stock'
  return Number(stock) > 0 ? 'in_stock' : 'out_of_stock'
}

function merchantItem({
  id,
  itemGroupId = null,
  title,
  description,
  link,
  image,
  price,
  availability,
  category,
  size = null,
  colour = null,
}) {
  return [
    '    <item>',
    `      <g:id>${xmlEscape(id)}</g:id>`,
    itemGroupId ? `      <g:item_group_id>${xmlEscape(itemGroupId)}</g:item_group_id>` : '',
    `      <title>${xmlEscape(clip(title, 150))}</title>`,
    `      <description>${xmlEscape(clip(description, 5000))}</description>`,
    `      <link>${xmlEscape(link)}</link>`,
    `      <g:image_link>${xmlEscape(image)}</g:image_link>`,
    `      <g:availability>${availability}</g:availability>`,
    `      <g:price>${Number(price).toFixed(2)} KES</g:price>`,
    '      <g:condition>new</g:condition>',
    '      <g:identifier_exists>false</g:identifier_exists>',
    category ? `      <g:product_type>${xmlEscape(category)}</g:product_type>` : '',
    size ? `      <g:size>${xmlEscape(size)}</g:size>` : '',
    colour ? `      <g:color>${xmlEscape(colour)}</g:color>` : '',
    '    </item>',
  ].filter(Boolean).join('\n')
}

export function merchantFeedItems(products, siteUrl = SITE_URL) {
  const items = []

  for (const product of products) {
    const slug = productSlug(product)
    const image = productImages(product)[0]?.public_url
    if (!slug || !image) continue

    const variants = activeVariants(product)
    const description = productDescription(product)

    if (variants.length > 0) {
      for (const variant of variants) {
        const price = effectivePrice(product, variant)
        if (price === null || !Number.isFinite(price)) continue

        items.push(merchantItem({
          id: `${product.id}-${variant.id}`,
          itemGroupId: product.id,
          title: `${product.name} - ${variant.label}`,
          description,
          link: `${siteUrl}/products/${slug}?variant=${encodeURIComponent(variant.id)}`,
          image,
          price,
          availability: availabilityFor(variant.stock_quantity ?? product.stock_quantity),
          category: product.category,
          size: variant.size,
          colour: variant.colour,
        }))
      }
      continue
    }

    const price = effectivePrice(product)
    if (price === null || !Number.isFinite(price) || product.price_from) continue

    items.push(merchantItem({
      id: product.id,
      title: product.name,
      description,
      link: `${siteUrl}/products/${slug}`,
      image,
      price,
      availability: availabilityFor(product.stock_quantity),
      category: product.category,
    }))
  }

  return items
}

export function buildMerchantFeed(products, siteUrl = SITE_URL) {
  const items = merchantFeedItems(products, siteUrl)

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Sancity Mall KE Product Feed</title>
    <link>${xmlEscape(siteUrl)}</link>
    <description>Live product catalogue for Sancity Mall KE</description>
${items.join('\n')}
  </channel>
</rss>
`
}

export function buildSitemap(products, siteUrl = SITE_URL) {
  const entries = [
    {
      loc: `${siteUrl}/`,
      lastmod: null,
    },
    {
      loc: `${siteUrl}/shipping-returns`,
      lastmod: null,
    },
    {
      loc: `${siteUrl}/privacy`,
      lastmod: null,
    },
    {
      loc: `${siteUrl}/terms`,
      lastmod: null,
    },
    ...products
      .map((product) => ({
        loc: `${siteUrl}/products/${productSlug(product)}`,
        lastmod: product.updated_at || product.created_at || null,
      }))
      .filter((entry) => !entry.loc.endsWith('/products/')),
  ]

  const body = entries.map(({ loc, lastmod }) => [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n')).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}
