import { matchesSubcategory, normalizeCategory } from './categories.js'
import { categoryLanding } from './seo-landing.js'

// Commercial category content based on actual stocked departments, without
// implying fixed delivery timeframes, shipping prices or unsupported guarantees.
export const homepageSeo = {
  title: 'Kitchenware, Bedding & Home Essentials Nairobi | Sancity Mall KE',
  description: 'Shop kitchenware, hotpots, duvets, bedsheets, storage and mosquito nets in Nairobi. Browse Sancity Mall KE products with pickup and delivery options across Kenya.',
}

const departmentSeo = {
  'kitchen-dining': {
    title: 'Kitchenware & Dining in Nairobi | Sancity Mall KE',
    description: 'Shop cookware, hotpots, dinner sets, drinkware and kitchen organisers in Nairobi. Explore kitchen essentials at Sancity Mall KE with pickup and delivery options.',
    intro: 'Explore practical kitchenware for cooking, serving, storing food and organising your kitchen. Compare cookware, hotpots, drinkware, dinnerware and other kitchen products from our Nairobi catalogue.',
  },
  'bedding-bedroom': {
    title: 'Duvets, Bedsheets & Bedding Nairobi | Sancity Mall KE',
    description: 'Browse duvets, bedsheets, blankets and pillows in Nairobi. Explore bedding designs and sizes at Sancity Mall KE and arrange pickup or delivery.',
    intro: 'Find bedding for everyday comfort, from bedsheets and duvet sets to blankets and pillows. Check each listing for available designs, sizes and product specifications before ordering.',
  },
  'storage-organisation': {
    title: 'Storage Racks & Wardrobes Nairobi | Sancity Mall KE',
    description: 'Explore wardrobes, shoe racks, shelves, baskets and home storage organisers in Nairobi at Sancity Mall KE. Browse storage options and delivery information.',
    intro: 'Make room for your essentials with practical storage and organisation products. Browse wardrobes, shoe storage, shelves, racks, baskets and organisers to suit different spaces.',
  },
  'cleaning-laundry': {
    title: 'Cleaning & Laundry Essentials Nairobi | Sancity Mall KE',
    description: 'Shop garment steamers, cleaning tools and household utility essentials in Nairobi. Browse Sancity Mall KE products and arrange pickup or delivery.',
    intro: 'Browse home care and cleaning tools including garment steamers, cleaning accessories and everyday household utility products. Compare product specifications and choose what fits your needs.',
  },
  'kids-baby': {
    title: 'Kids & Baby Home Essentials Nairobi | Sancity Mall KE',
    description: 'Find kids bedding, comforters, feeding and bath essentials in Nairobi. Browse Sancity Mall KE products with pickup and delivery options.',
    intro: 'Explore practical products for children and families, including kids bedding, comforter sets, feeding accessories and bath essentials. Check the individual listings for product details.',
  },
  'mosquito-nets': {
    title: 'Mosquito Nets in Nairobi | Sancity Mall KE',
    description: 'Shop canopy, tent, rail and stand mosquito nets in Nairobi. Compare net styles for different beds at Sancity Mall KE with pickup and delivery options.',
    intro: 'Compare mosquito nets for different beds and sleeping spaces. Browse canopy, tent, rail and stand styles, and review each listing for size and configuration information.',
  },
  'fitness-wellness': {
    title: 'Home Fitness & Wellness Nairobi | Sancity Mall KE',
    description: 'Explore home fitness and wellness products including massage devices and weighing scales in Nairobi at Sancity Mall KE.',
    intro: 'Browse wellness and home fitness accessories, from massage devices to digital weighing scales. Review each product’s functions and specifications before selecting an option.',
  },
  'home-essentials': {
    title: 'Home Essentials & Accessories Nairobi | Sancity Mall KE',
    description: 'Shop bathroom accessories, home textiles, rugs, small appliances and everyday household finds in Nairobi at Sancity Mall KE.',
    intro: 'Browse useful finishing touches for the home, including bathroom essentials, towels, rugs, small appliances and other household accessories. Compare features, sizes and product details.',
  },
}

export function getCategorySeo(route, products = []) {
  if (!route) return null
  const { group, child } = route
  const defaultCopy = departmentSeo[group.slug] || {
    title: `${group.name} in Nairobi | Sancity Mall KE`,
    description: `Browse ${group.name.toLowerCase()} in Nairobi at Sancity Mall KE.`,
    intro: group.description,
  }
  const matches = products.filter(product =>
    normalizeCategory(product.category) === group.name
    && (!child || matchesSubcategory(product, child.slug))
  )
  const featuredProducts = matches.filter(product => product.slug || product.name).slice(0, 3)
  // Preserve PR #30's crawlable product directory and homepage metadata while
  // enriching only the buying-intent categories backed by live inventory.
  const landing = categoryLanding(group, child)
  const guide = landing?.heading
    ? { title: landing.title, description: landing.description, intro: landing.intro,
        heading: landing.heading, tips: landing.tips, related: landing.related }
    : {}
  if (!child) return { ...defaultCopy, ...guide, featuredProducts, count: matches.length }

  const name = child.name
  return {
    title: `${name} in Nairobi | Sancity Mall KE`,
    description: `Shop ${name.toLowerCase()} in Nairobi at Sancity Mall KE. Compare product details and prices where listed, with pickup and delivery options across Kenya.`.slice(0, 160),
    intro: `Explore ${name.toLowerCase()} for your home at Sancity Mall KE in Nairobi. Compare the listed products, check their individual features and choose a suitable option before arranging pickup or delivery.`,
    ...guide,
    featuredProducts,
    count: matches.length,
  }
}
