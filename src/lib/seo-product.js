// Source-backed snippets for product pages; never alters catalogue or checkout.
const targets = [
  ['Kitchen & Dining', /\b(?:hot\s?pots?|casserole|dish\s?racks?|dish\s?drainers?)\b/i],
  ['Bedroom & Sleep', /\bbed\s?sheets?\b/i],
  ['Storage & Organisation', /\bwardrobes?\b/i],
  ['Mosquito Nets', /\bmosquito\s?nets?\b/i],
]
const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const clipWords = (text, max = 158) => {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return (space >= max - 24 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')
}
export function isPriorityProduct(product) {
  const name = clean(product?.name)
  return Boolean(name && targets.some(([category, re]) => product.category === category && re.test(name)))
}
export function productSeo(product) {
  const name = clean(product?.name)
  const standardTitle = `${name} | Sancity Mall KE`
  const standardDescription = clean(product?.description ||
    `${name} from Sancity Mall KE. Shop household and lifestyle products in Nairobi with delivery options across Kenya.`).slice(0, 160)
  if (!isPriorityProduct(product)) {
    return { title: standardTitle, description: standardDescription, targeted: false }
  }
  const titleWithCity = `${name} in Nairobi | Sancity Mall KE`
  const title = titleWithCity.length <= 80 ? titleWithCity : standardTitle
  const size = clean(product.dimensions)
  const material = clean(product.material)
  const description = clipWords([
    `Shop ${name} in Nairobi at Sancity Mall KE.`,
    size ? `Listed size or configuration: ${size}.` : '',
    material ? `Material: ${material}.` : '',
    clean(product.description),
  ].filter(Boolean).join(' '))
  return { title, description, targeted: true }
}
