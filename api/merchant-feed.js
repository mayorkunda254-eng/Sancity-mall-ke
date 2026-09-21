import { buildMerchantFeed, fetchPublishedProducts } from '../server/catalogue.mjs'

export default async function handler(_request, response) {
  try {
    const products = await fetchPublishedProducts()
    const xml = buildMerchantFeed(products)

    response.setHeader('Content-Type', 'application/xml; charset=utf-8')
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')
    response.status(200).send(xml)
  } catch (error) {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    response.status(500).send(error.message || 'Could not build Sancity product feed.')
  }
}
