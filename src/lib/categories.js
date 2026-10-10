// Shared by the storefront, admin and prerenderer. Stored department names
// stay unchanged; legacy Fitness listings belong to Home Fitness.
const group = (slug, name, short, description, children) => ({ slug, name, short, description, children: children.map(([slug, name, pattern]) => ({ slug, name, pattern })) })

export const categoryGroups = [
  group('kitchen-dining', 'Kitchen & Dining', 'Kitchen', 'Cook, serve and organise with kitchen essentials for everyday Kenyan homes.', [
    ['cookware', 'Cookware', /cookware|pressure cooker|chapati pan|frying (?:pan|pot)|induction pot|cooking pot|soup pot|lunch pot|non.?stick.*pan/i],
    ['hotpots-serving', 'Hotpots & Serving', /hotpot|hot pot|chafing|tureen|serving (?:tray|bowl)|tray set|tea urn|juice dispenser|casserole/i],
    ['kitchen-appliances', 'Kitchen Appliances', /electric|air fryer|deep fryer|blender|mixer|microwave|oven|cook(?:er|ing lunch)|hob|stove|sandwich maker|waffle maker|popcorn maker|popcake maker|donut maker|cake and biscuit|chapati maker|coffee (?:maker|mill)|grinder|chopper/i],
    ['dinnerware', 'Dinnerware', /dinner|plate|bowl/i],
    ['bakeware', 'Bakeware', /baking tin|bakeware/i],
    ['drinkware-flasks', 'Drinkware & Flasks', /mug|cup|glass set|water set|jug|flask|bottle|kettle|thermocup|tumbler/i],
    ['food-storage', 'Food Storage', /storage container|food storage|cereal|sugar jar|spice|oil.*(?:pot|jar|bottle)|oil and vinegar|herb saver|lunch box|egg tray|salt shaker/i],
    ['utensils-prep', 'Utensils & Preparation', /cutlery|fork|spoon|chopping|cutting board|garlic|cutter|strainer/i],
    ['kitchen-organisation', 'Kitchen Organisation', /rack|drainer|organizer|organiser|caddy|soap.*(?:pump|dispenser)|trolley/i],
    ['table-accessories', 'Table & Kitchen Accessories', /placemat|coaster|table runner|liner|kitchen mat/i],
  ]),
  group('bedding-bedroom', 'Bedroom & Sleep', 'Bedroom', 'Find comfortable bedding, pillows and practical protection for your bed.', [
    ['bedsheets', 'Bedsheets', /bedsheet|bed sheet/i],
    ['duvets-bedspreads', 'Duvets & Bedspreads', /duvet|bedspread|comforter/i],
    ['pillows-protectors', 'Pillows & Protectors', /pillow|protector|bedcover/i],
    ['blankets', 'Blankets & Throws', /blanket|throw/i],
    ['air-mattresses', 'Air Mattresses', /air mattress|inflatable/i],
  ]),
  group('storage-organisation', 'Storage & Organisation', 'Storage', 'Make room with wardrobes, shoe racks and useful home organisers.', [
    ['wardrobes', 'Wardrobes', /wardrobe/i],
    ['shoe-storage', 'Shoe Storage', /shoe/i],
    ['kitchen-racks', 'Kitchen & Dish Racks', /dish|kitchen|fruit rack/i],
    ['clothes-organisers', 'Clothes Organisers', /clothes|garment|hanger/i],
    ['shelves-racks', 'Shelves & Racks', /shelf|shelv|rack|stand/i],
    ['boxes-baskets', 'Boxes & Baskets', /container|basket|box|over.the.sink organizer|jewelry/i],
  ]),
  group('cleaning-laundry', 'Everyday Home Utility', 'Cleaning & Laundry', 'Practical tools for cleaning your home and caring for your clothes.', [
    ['garment-care', 'Garment Care', /steamer|iron|lint/i],
    ['cleaning-tools', 'Cleaning Tools', /mop|wash|vacuum|unblock|brush/i],
  ]),
  group('kids-baby', 'Kids & Baby', 'Kids & Baby', 'Everyday feeding, bedding and bath essentials for children.', [
    ['kids-bedding', 'Kids Bedding', /comforter|duvet|bedsheet|blanket/i],
    ['feeding', 'Baby Feeding', /food|feeding|nutri/i],
    ['kids-bath', 'Kids Bath Essentials', /towel|bath/i],
  ]),
  group('mosquito-nets', 'Mosquito Nets', 'Mosquito Nets', 'Compare canopy, tent and stand mosquito nets for your sleeping space.', [
    ['stand-nets', 'Stand & Rail Nets', /stand|rail/i],
    ['canopy-nets', 'Canopy Nets', /round|canopy|square|corner/i],
    ['tent-nets', 'Tent Nets', /tent/i],
  ]),
  group('fitness-wellness', 'Home Fitness', 'Fitness & Wellness', 'Explore home fitness and personal wellness accessories.', [
    ['massage-devices', 'Massage Devices', /massage/i],
    ['weighing-scales', 'Weighing Scales', /scale/i],
  ]),
  group('home-essentials', 'Home Essentials', 'Home Essentials', 'Browse bathroom essentials, home textiles, appliances and everyday household finds.', [
    ['bathroom', 'Bathroom & Towels', /towel|bath|toilet|soap.*dispenser/i],
    ['rugs-mats', 'Rugs & Mats', /carpet|rug|floor mat/i],
    ['seat-covers', 'Seat & Cushion Covers', /seat cover|sofa cover|cushion cover|chair.*cover|sofa blanket|slip sofa/i],
    ['laundry-cleaning', 'Laundry & Cleaning', /mop|brush|cleaning|iron|lint|drying rack/i],
    ['home-appliances', 'Home Appliances', /refrigerator|fan|heater|humidifier/i],
    ['decor-fragrance', 'Décor & Fragrance', /decor|sculpture|diffuser|fragrance/i],
  ]),
]

export const productCategories = categoryGroups.map(group => group.name)
export const normalizeCategory = value => value === 'Fitness' ? 'Home Fitness' : value
export const categoryFor = name => categoryGroups.find(group => group.name === normalizeCategory(name))
export const categoryPath = (group, child = null) => `/categories/${group.slug}${child ? `/${child.slug}` : ''}`

// Explicit admin assignments win. Conservative name matching handles existing
// listings without rewriting their category, price, stock or product URL.
export function subcategoryFor(product) {
  const group = categoryFor(product.category)
  if (!group) return null
  if (product.subcategory === 'other') return null
  const explicit = group.children.find(child => child.slug === product.subcategory)
  return explicit || group.children.find(child => {
    if (child.slug === 'dinnerware' && /food flask/i.test(product.name || '')) return false
    return child.pattern.test(product.name || '')
  }) || null
}

export function populatedCategories(products) {
  return categoryGroups.map(group => {
    const matches = products.filter(product => normalizeCategory(product.category) === group.name)
    const children = group.children.map(child => ({
      ...child,
      count: matches.filter(product => subcategoryFor(product)?.slug === child.slug).length,
    })).filter(child => child.count > 0)
    const otherCount = matches.filter(product => !subcategoryFor(product)).length
    if (otherCount) children.push({ slug: 'other', name: `More ${group.short}`, count: otherCount })
    return { ...group, count: matches.length, children, image: matches.flatMap(product => [...(product.product_images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))).find(image => image.public_url)?.public_url || null }
  }).filter(group => group.count > 0)
}

export function resolveCategoryRoute(path) {
  const match = path.match(/^\/categories\/([^/]+)(?:\/([^/]+))?\/?$/)
  if (!match) return null
  const group = categoryGroups.find(group => group.slug === match[1])
  if (!group) return null
  const child = match[2] ? group.children.find(child => child.slug === match[2]) || (match[2] === 'other' ? { slug: 'other', name: `More ${group.short}` } : null) : null
  if (match[2] && !child) return null
  return { group, child }
}

export const matchesSubcategory = (product, slug) => !slug || (slug === 'other' ? !subcategoryFor(product) : subcategoryFor(product)?.slug === slug)
