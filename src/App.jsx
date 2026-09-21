import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Baby, Banknote, BedDouble, Bell, Boxes, Check, ChevronRight, CircleHelp, CookingPot, Dumbbell, Eye, Heart, HousePlug, LogIn, MapPin, Menu, MessageCircle, Minus, PackageCheck, Plus, RotateCcw, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Sparkles, Tag, Truck, UserRound, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

const departments = [
  { name: 'Kitchen & Dining', short: 'Kitchen', emoji: '🍲', icon: CookingPot, className: 'dept-kitchen' },
  { name: 'Bedroom & Sleep', short: 'Bedroom', emoji: '🛏️', icon: BedDouble, className: 'dept-bedroom' },
  { name: 'Storage & Organisation', short: 'Storage', emoji: '🧺', icon: Boxes, className: 'dept-storage' },
  { name: 'Everyday Home Utility', short: 'Home Utility', emoji: '🧹', icon: HousePlug, className: 'dept-utility' },
  { name: 'Kids & Baby', short: 'Kids & Baby', emoji: '🧸', icon: Baby, className: 'dept-kids' },
  { name: 'Mosquito Nets', short: 'Mosquito Nets', emoji: '🦟', icon: ShieldCheck, className: 'dept-nets' },
  { name: 'Home Fitness', short: 'Fitness', emoji: '🏋️', icon: Dumbbell, className: 'dept-fitness' },
  { name: 'Wholesale', short: 'Wholesale', emoji: '📦', icon: PackageCheck, className: 'dept-wholesale', wholesale: true },
]

const productCategories = [
  'Kitchen & Dining',
  'Bedroom & Sleep',
  'Storage & Organisation',
  'Everyday Home Utility',
  'Kids & Baby',
  'Mosquito Nets',
  'Home Fitness',
  'Home Essentials',
]

const roomCollections = [
  {
    key: 'kitchen-edit',
    eyebrow: 'Kitchen Edit',
    title: 'A more organised kitchen',
    description: 'Everyday pieces selected to make prep, storage and serving feel cleaner and easier.',
    category: 'Kitchen & Dining',
    className: 'room-kitchen',
  },
  {
    key: 'calm-bedroom',
    eyebrow: 'Calm Bedroom',
    title: 'Comfort starts here',
    description: 'Bedroom essentials chosen around rest, softness and a more considered sleeping space.',
    category: 'Bedroom & Sleep',
    className: 'room-bedroom',
  },
  {
    key: 'smart-storage',
    eyebrow: 'Smart Storage',
    title: 'Create space without clutter',
    description: 'Useful organisation pieces for bedrooms, wardrobes and everyday small-space living.',
    category: 'Storage & Organisation',
    className: 'room-storage',
  },
]

const fallbackProducts = [
  {
    id: 1,
    name: '2-Tier Dish Rack',
    category: 'Kitchen & Dining',
    badge: 'Fresh arrival',
    description: 'A practical countertop rack for keeping plates, cups and cutlery organised.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 2,
    name: '18-Jar Rotating Spice Rack',
    category: 'Kitchen & Dining',
    badge: 'Kitchen pick',
    description: 'Compact rotating spice storage designed to keep everyday seasonings within reach.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 3,
    name: 'Portable Fabric Wardrobe',
    category: 'Storage & Organisation',
    badge: 'Storage pick',
    description: 'Freestanding covered storage for clothes, shoes and everyday bedroom organisation.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 4,
    name: 'Foldable Laptop Table',
    category: 'Everyday Home Utility',
    badge: 'Useful find',
    description: 'A compact folding table for laptop work, studying, meals or bedside use.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 5,
    name: 'Queen Air Mattress',
    category: 'Bedroom & Sleep',
    badge: 'Comfort pick',
    description: 'Portable inflatable sleeping solution for guests, travel and flexible home use.',
    price: null,
    stock_quantity: null,
  },
]

const categoryEmoji = (category = '') => {
  const found = departments.find((item) => item.name === category)
  if (found) return found.emoji
  if (category === 'Home Essentials') return '🏠'
  return '✨'
}

const productImages = (product) => [...(product?.product_images || [])]
  .filter((image) => image?.public_url)
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

const productMainImage = (product) => productImages(product)[0]?.public_url || null

const slugify = (value = '') => value
  .toString()
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const productSlug = (product) => product?.slug || slugify(product?.name)

const activeVariants = (product) => [...(product?.product_variants || [])]
  .filter((variant) => variant?.is_active !== false)
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

const effectivePrice = (product, variant = null) => {
  if (variant?.price !== null && variant?.price !== undefined) return Number(variant.price)
  if (product?.price !== null && product?.price !== undefined) return Number(product.price)
  return null
}

const formatPrice = (product, variant = null) => {
  if (variant) {
    const price = effectivePrice(product, variant)
    return price === null ? 'Price on request' : `KSh ${price.toLocaleString('en-KE')}`
  }

  const variants = activeVariants(product)
  if (variants.length > 0) {
    const prices = variants
      .map((item) => effectivePrice(product, item))
      .filter((price) => price !== null)

    if (prices.length > 0) {
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      const amount = `KSh ${min.toLocaleString('en-KE')}`
      return min !== max ? `From ${amount}` : amount
    }
  }

  if (product?.price === null || product?.price === undefined) return 'Price on request'
  const amount = `KSh ${Number(product.price).toLocaleString('en-KE')}`
  return product.price_from ? `From ${amount}` : amount
}

const cartEntryKey = (productId, variantId = null) => `${productId}::${variantId || 'base'}`

const emptyCheckoutForm = {
  customer_name: '',
  customer_phone: '',
  delivery_method: 'delivery',
  delivery_zone_id: '',
  delivery_location: '',
  delivery_notes: '',
  mpesa_code: '',
}

function waLink(product) {
  const message = product
    ? `Hello Sancity Mall KE, I would like the current price and availability for ${product}.`
    : 'Hello Sancity Mall KE, I would like to enquire about your household products.'
  return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
}

function conciergeLink(product, request) {
  const productName = product?.name || product || 'this product'
  const message = `Hello Sancity Mall KE, I am interested in ${productName}. ${request}`
  return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
}

const featureLines = (value = '') => value
  .split(/\n|•|;/)
  .map((item) => item.trim())
  .filter(Boolean)

const legalPages = {
  '/privacy': {
    eyebrow: 'Privacy',
    title: 'Privacy Policy',
    description: 'How Sancity Mall KE handles order, checkout and availability-request information.',
    intro: 'This policy explains what information Sancity Mall KE collects through this website, why it is used and the choices available to customers.',
    sections: [
      {
        title: 'Information we collect',
        paragraphs: [
          'When you place an order, request delivery pricing or ask for an availability update, we may collect your name, phone number, delivery location, order details and any notes you choose to provide.',
          'For manual M-Pesa verification, we may collect the transaction confirmation code you submit. We do not ask for or store your M-Pesa PIN.',
        ],
      },
      {
        title: 'Shopping and analytics data',
        paragraphs: [
          'The site stores cart, wishlist and recently viewed information in your browser so those shopping features can work.',
          'We also use first-party anonymous session analytics to understand product views, cart activity, checkout use, WhatsApp clicks and placed orders. These analytics do not include customer names or phone numbers.',
        ],
      },
      {
        title: 'How we use information',
        items: [
          'To process, verify and fulfil customer orders.',
          'To calculate or confirm delivery arrangements.',
          'To respond to product and availability enquiries.',
          'To prevent duplicate requests, troubleshoot the website and understand shopping performance.',
        ],
      },
      {
        title: 'Service providers',
        paragraphs: [
          'The website uses service providers for hosting, database storage and communications. Information is shared only as needed to operate the store, fulfil orders or communicate with you.',
          'If you choose to continue a conversation on WhatsApp or make a payment through M-Pesa/Equity, those services process information under their own terms and privacy practices.',
        ],
      },
      {
        title: 'Retention and your choices',
        paragraphs: [
          'Order and payment-verification records may be retained for operational, accounting, dispute-resolution and legal purposes. Availability requests can be closed once they are no longer needed.',
          'You may contact Sancity Mall KE to ask for correction or deletion of personal information where applicable, subject to records that must be retained for legitimate business or legal reasons.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [
          'For privacy questions, contact Sancity Mall KE at Sancitymallke@gmail.com or through the store WhatsApp contact shown on this website.',
        ],
      },
    ],
  },
  '/terms': {
    eyebrow: 'Store terms',
    title: 'Terms of Service',
    description: 'The terms that apply when browsing, ordering or paying for products from Sancity Mall KE.',
    intro: 'These terms apply to use of the Sancity Mall KE website and to orders placed through the website or its linked WhatsApp checkout support.',
    sections: [
      {
        title: 'Products, prices and availability',
        paragraphs: [
          'Product photos, descriptions, colours and dimensions are provided to help customers evaluate items. Small visual or measurement differences may occur between product batches.',
          'Prices and stock can change. Where the website says “Confirm current stock”, availability is not guaranteed until Sancity confirms it.',
        ],
      },
      {
        title: 'Orders and payment',
        paragraphs: [
          'Submitting an order creates an order request. An order is not treated as paid until the submitted M-Pesa transaction is verified by Sancity.',
          'For M-Pesa payments through Equity, customers should use the payment instructions displayed at checkout and verify that the recipient details are correct before confirming payment. Sancity will never ask for an M-Pesa PIN.',
        ],
      },
      {
        title: 'Delivery and pickup',
        paragraphs: [
          'Delivery charges are either calculated from a configured delivery zone or confirmed manually before payment. Delivery times are estimates and can be affected by distance, traffic, stock confirmation and courier availability.',
          'Customers are responsible for providing an accurate phone number, delivery location and any access details needed to complete delivery.',
        ],
      },
      {
        title: 'Promotions',
        paragraphs: [
          'Promo codes may have minimum spend, start and expiry dates, usage limits or other conditions shown at checkout. Discounts apply only when the server validates the code.',
          'Sancity may pause or end a promotion where necessary, but an already accepted and paid order will not be changed solely because a promotion later ends.',
        ],
      },
      {
        title: 'Returns, problems and cancellations',
        paragraphs: [
          'If an item is damaged, incorrect or materially different from what was ordered, contact Sancity promptly with the order reference and supporting photos where appropriate.',
          'Return, replacement or refund eligibility is confirmed case by case and subject to applicable consumer rights. Do not send an item back before receiving return instructions.',
        ],
      },
      {
        title: 'Website use',
        paragraphs: [
          'Do not misuse the website, interfere with checkout or analytics systems, attempt unauthorised access, or submit false payment or order information.',
          'Sancity may update these terms as the store, checkout or fulfilment processes change. The current version published on this page applies from its stated update date.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [
          'Questions about an order or these terms can be sent to Sancitymallke@gmail.com or through the store WhatsApp contact shown on this website.',
        ],
      },
    ],
  },
  '/shipping-returns': {
    eyebrow: 'Delivery & after-sales',
    title: 'Shipping & Returns',
    description: 'How delivery, pickup, damaged-item reports, returns and refunds are handled by Sancity Mall KE.',
    intro: 'This page summarises Sancity Mall KE delivery and return handling. Product-specific or order-specific arrangements confirmed directly with the customer take priority where applicable.',
    sections: [
      {
        title: 'Delivery charges',
        paragraphs: [
          'Where a delivery zone has a published fee, checkout adds it to the order total. For unlisted or quote-required locations, Sancity confirms the delivery charge before asking the customer to pay.',
        ],
      },
      {
        title: 'Delivery timing',
        paragraphs: [
          'Any delivery timing shown on the website is an estimate, not a guaranteed arrival time. Sancity may contact the customer where stock, routing, traffic or courier conditions affect fulfilment.',
        ],
      },
      {
        title: 'Pickup',
        paragraphs: [
          'Pickup orders can be collected from the pickup point shown at checkout after Sancity confirms that the order is ready. Customers should not travel for pickup until they receive that confirmation.',
        ],
      },
      {
        title: 'Damaged or incorrect items',
        paragraphs: [
          'If you receive a damaged, defective or incorrect item, contact Sancity promptly and keep the product, packaging and order reference available for review. Photos may be requested so the issue can be assessed quickly.',
        ],
      },
      {
        title: 'Returns and refunds',
        paragraphs: [
          'Return approval depends on the product condition, the reason for return and applicable consumer rights. Change-of-mind returns are not automatically guaranteed, so eligibility should be confirmed before sending anything back.',
          'Approved refunds or replacements are processed after the returned item or supporting evidence has been reviewed. Payment-processing or delivery charges may be treated separately where appropriate.',
        ],
      },
      {
        title: 'Need help?',
        paragraphs: [
          'Contact Sancity Mall KE using the website WhatsApp button or email Sancitymallke@gmail.com and include your order reference where available.',
        ],
      },
    ],
  },
}

const createAnalyticsSessionId = () => {
  if (typeof window === 'undefined') return ''

  try {
    const stored = window.sessionStorage.getItem('sancity_analytics_session')
    if (stored && /^[A-Za-z0-9_-]{8,80}$/.test(stored)) return stored

    const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
    const sessionId = `sc_${token.slice(0, 48)}`
    window.sessionStorage.setItem('sancity_analytics_session', sessionId)
    return sessionId
  } catch {
    return `sc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
  }
}

export default function App({ initialProducts = null, initialPath = null }) {
  const routePath = initialPath || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const normalizedRoute = routePath === '/' ? '/' : routePath.replace(/\/+$/, '')
  const routeMatch = normalizedRoute.match(/^\/products\/([^/]+)$/)
  const initialDetailSlug = routeMatch ? decodeURIComponent(routeMatch[1]) : ''
  const legalPage = legalPages[normalizedRoute] || null
  const isNotFoundRoute = !legalPage && normalizedRoute !== '/' && !routeMatch

  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [stockFilter, setStockFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [newOnly, setNewOnly] = useState(false)
  const [saved, setSaved] = useState([])
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState(emptyCheckoutForm)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutResult, setCheckoutResult] = useState(null)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoPreview, setPromoPreview] = useState(null)
  const [promoApplying, setPromoApplying] = useState(false)
  const [deliveryZones, setDeliveryZones] = useState([])
  const [storageReady, setStorageReady] = useState(false)
  const [products, setProducts] = useState(
    Array.isArray(initialProducts) && initialProducts.length > 0 ? initialProducts : fallbackProducts,
  )
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [detailSlug, setDetailSlug] = useState(initialDetailSlug)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [stockAlertPhone, setStockAlertPhone] = useState('')
  const [stockAlertState, setStockAlertState] = useState({ status: 'idle', message: '' })
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [recentlyAddedId, setRecentlyAddedId] = useState(null)
  const [toastProduct, setToastProduct] = useState(null)
  const searchRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)
  const analyticsSessionRef = useRef('')
  const trackedProductViewsRef = useRef(new Set())

  const getAnalyticsSessionId = () => {
    if (!analyticsSessionRef.current) {
      analyticsSessionRef.current = createAnalyticsSessionId()
    }
    return analyticsSessionRef.current
  }

  const trackStoreEvent = (eventType, {
    productId = null,
    variantId = null,
    value = null,
    metadata = {},
  } = {}) => {
    if (!isSupabaseConfigured || typeof window === 'undefined') return

    const sessionId = getAnalyticsSessionId()
    if (!sessionId) return

    supabase.rpc('record_store_event', {
      p_session_id: sessionId,
      p_event_type: eventType,
      p_product_id: productId,
      p_variant_id: variantId,
      p_event_value: value,
      p_metadata: metadata,
    }).then(() => {}).catch(() => {})
  }

  const trackWhatsappClick = (product = null, variant = null, source = 'general') => {
    trackStoreEvent('whatsapp_click', {
      productId: product?.id || null,
      variantId: variant?.id || null,
      metadata: { source },
    })
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true

    async function loadPublishedProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,category,badge,description,dimensions,material,colour,key_features,care_instructions,delivery_note,price,compare_at_price,price_from,stock_quantity,created_at,product_images(public_url,sort_order),product_variants(id,label,size,colour,price,stock_quantity,is_active,sort_order)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (!active || error || !data) return

      setProducts(data.length > 0 ? data : fallbackProducts)
    }

    async function loadDeliveryZones() {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('id,name,fee,eta_text,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (!active || error || !data) return
      setDeliveryZones(data)
    }

    loadPublishedProducts()
    loadDeliveryZones()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    try {
      setSaved(JSON.parse(window.localStorage.getItem('sancity-wishlist') || '[]'))
    } catch {
      setSaved([])
    }

    try {
      setCart(JSON.parse(window.localStorage.getItem('sancity-cart') || '[]'))
    } catch {
      setCart([])
    }

    try {
      setRecentlyViewed(JSON.parse(window.localStorage.getItem('sancity-recently-viewed') || '[]'))
    } catch {
      setRecentlyViewed([])
    }

    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem('sancity-wishlist', JSON.stringify(saved))
  }, [saved, storageReady])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem('sancity-cart', JSON.stringify(cart))
  }, [cart, storageReady])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem('sancity-recently-viewed', JSON.stringify(recentlyViewed))
  }, [recentlyViewed, storageReady])

  useEffect(() => {
    const syncRoute = () => {
      const match = window.location.pathname.match(/^\/products\/([^/]+)\/?$/)
      setDetailSlug(match ? decodeURIComponent(match[1]) : '')
      setGalleryIndex(0)
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => () => window.clearTimeout(feedbackTimeoutRef.current), [])

  useEffect(() => {
    const overlayOpen = cartOpen || checkoutOpen || menuOpen || Boolean(quickViewProduct)
    if (!overlayOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOverlays = (event) => {
      if (event.key !== 'Escape') return
      setCartOpen(false)
      setCheckoutOpen(false)
      setMenuOpen(false)
      setQuickViewProduct(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOverlays)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOverlays)
    }
  }, [cartOpen, checkoutOpen, menuOpen, quickViewProduct])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    const newCutoff = Date.now() - (1000 * 60 * 60 * 24 * 45)

    const filtered = products.filter((item) => {
      const categoryMatch = activeCategory === 'All' || item.category === activeCategory
      const wishlistMatch = !wishlistOnly || saved.includes(item.id)
      const haystack = `${item.name || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase()
      const searchMatch = !q || haystack.includes(q)
      const stockMatch = stockFilter === 'all'
        || (stockFilter === 'in-stock' && Number(item.stock_quantity) > 0)
        || (stockFilter === 'confirm' && !(Number(item.stock_quantity) > 0))
      const priceMatch = priceFilter === 'all'
        || (priceFilter === 'priced' && item.price !== null && item.price !== undefined)
        || (priceFilter === 'request' && (item.price === null || item.price === undefined))
      const createdAt = item.created_at ? new Date(item.created_at).getTime() : 0
      const badgeLooksNew = /new|fresh|arrival/i.test(item.badge || '')
      const freshnessMatch = !newOnly || createdAt >= newCutoff || badgeLooksNew

      return categoryMatch && wishlistMatch && searchMatch && stockMatch && priceMatch && freshnessMatch
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'price-low') {
        const aPrice = a.price === null || a.price === undefined ? Number.POSITIVE_INFINITY : Number(a.price)
        const bPrice = b.price === null || b.price === undefined ? Number.POSITIVE_INFINITY : Number(b.price)
        return aPrice - bPrice
      }
      if (sortBy === 'price-high') {
        const aPrice = a.price === null || a.price === undefined ? Number.NEGATIVE_INFINITY : Number(a.price)
        const bPrice = b.price === null || b.price === undefined ? Number.NEGATIVE_INFINITY : Number(b.price)
        return bPrice - aPrice
      }
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '')
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }, [products, query, activeCategory, wishlistOnly, saved, sortBy, stockFilter, priceFilter, newOnly])

  const predictiveProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    return products
      .filter((item) => {
        const categoryMatch = activeCategory === 'All' || item.category === activeCategory
        const haystack = `${item.name || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase()
        return categoryMatch && haystack.includes(q)
      })
      .slice(0, 5)
  }, [products, query, activeCategory])

  const predictiveCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []

    return productCategories
      .filter((category) => category.toLowerCase().includes(q))
      .slice(0, 3)
  }, [query])

  const collectionCards = useMemo(() => roomCollections.map((collection) => {
    const matches = products.filter((product) => product.category === collection.category)
    const featured = matches.find((product) => productMainImage(product)) || matches[0] || null
    return { ...collection, featured, count: matches.length }
  }), [products])

  const activeFilterCount = [
    stockFilter !== 'all',
    priceFilter !== 'all',
    newOnly,
    sortBy !== 'newest',
  ].filter(Boolean).length

  const resetCatalogueControls = () => {
    setSortBy('newest')
    setStockFilter('all')
    setPriceFilter('all')
    setNewOnly(false)
  }

  const detailProduct = useMemo(
    () => detailSlug ? products.find((item) => productSlug(item) === detailSlug) || null : null,
    [products, detailSlug],
  )

  const detailImages = useMemo(() => detailProduct ? productImages(detailProduct) : [], [detailProduct])
  const activeDetailImage = detailImages[galleryIndex]?.public_url || productMainImage(detailProduct)
  const detailVariants = useMemo(() => detailProduct ? activeVariants(detailProduct) : [], [detailProduct])
  const selectedVariant = detailVariants.find((variant) => variant.id === selectedVariantId) || null

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const requestedVariant = new URLSearchParams(window.location.search).get('variant')
      if (requestedVariant && detailVariants.some((variant) => variant.id === requestedVariant)) {
        setSelectedVariantId(requestedVariant)
        return
      }
    }

    if (detailVariants.length === 1) {
      setSelectedVariantId(detailVariants[0].id)
    } else {
      setSelectedVariantId('')
    }
  }, [detailProduct?.id])

  const detailStock = selectedVariant?.stock_quantity !== null && selectedVariant?.stock_quantity !== undefined
    ? selectedVariant.stock_quantity
    : detailProduct?.stock_quantity

  const canRequestStockAlert = Boolean(
    detailProduct
    && !(Number(detailStock) > 0)
    && (detailVariants.length === 0 || selectedVariant),
  )

  useEffect(() => {
    setStockAlertState({ status: 'idle', message: '' })
  }, [detailProduct?.id, selectedVariantId])

  const detailSpecs = detailProduct ? [
    { label: 'Category', value: detailProduct.category },
    {
      label: 'Availability',
      value: detailStock > 0 ? `${detailStock} in stock` : 'Confirm current stock',
    },
    {
      label: 'Pricing',
      value: formatPrice(detailProduct, selectedVariant),
    },
    { label: 'Size', value: selectedVariant?.size || detailProduct.dimensions },
    { label: 'Material', value: detailProduct.material },
    { label: 'Colour', value: selectedVariant?.colour || detailProduct.colour },
  ].filter((item) => item.value) : []

  const detailFeatureLines = detailProduct ? featureLines(detailProduct.key_features || '') : []

  useEffect(() => {
    if (typeof document === 'undefined') return

    const siteUrl = 'https://sancity-mall-ke-v3.vercel.app'
    const isMissingProduct = Boolean(detailSlug && !detailProduct)
    const title = detailProduct
      ? `${detailProduct.name} | Sancity Mall KE`
      : legalPage
        ? `${legalPage.title} | Sancity Mall KE`
        : isNotFoundRoute || isMissingProduct
          ? 'Page not found | Sancity Mall KE'
          : 'Sancity Mall KE | Home Essentials in Nairobi'
    const description = detailProduct?.description
      ? detailProduct.description.slice(0, 160)
      : legalPage?.description
        || (isNotFoundRoute || isMissingProduct
          ? 'The page you requested could not be found on Sancity Mall KE.'
          : 'Shop home essentials in Nairobi from Sancity Mall KE, with pickup in Nairobi and delivery options across Kenya.')
    const canonical = detailProduct
      ? `${siteUrl}/products/${productSlug(detailProduct)}`
      : legalPage
        ? `${siteUrl}${normalizedRoute}`
        : `${siteUrl}/`
    const image = detailProduct
      ? productMainImage(detailProduct)
      : `${siteUrl}/hero-bedroom-hq.jpeg`

    document.title = title

    const upsertMeta = (selector, attrName, attrValue, content) => {
      let element = document.head.querySelector(selector)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attrName, attrValue)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    upsertMeta('meta[name="description"]', 'name', 'description', description)
    upsertMeta('meta[name="robots"]', 'name', 'robots', isNotFoundRoute || isMissingProduct ? 'noindex,nofollow' : 'index,follow,max-image-preview:large')
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description)
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', detailProduct ? 'product' : 'website')
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical)
    upsertMeta('meta[property="og:image"]', 'property', 'og:image', image)
    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image)

    let canonicalLink = document.head.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', canonical)
  }, [detailProduct?.id, detailSlug, legalPage, normalizedRoute, isNotFoundRoute])

  const relatedProducts = useMemo(() => {
    if (!detailProduct) return []
    return products
      .filter((item) => item.id !== detailProduct.id && item.category === detailProduct.category)
      .slice(0, 4)
  }, [products, detailProduct])

  const recentlyViewedProducts = useMemo(() => recentlyViewed
    .map((id) => products.find((item) => item.id === id))
    .filter((item) => item && item.id !== detailProduct?.id)
    .slice(0, 4), [recentlyViewed, products, detailProduct])

  useEffect(() => {
    if (!detailProduct) return
    setRecentlyViewed((items) => [detailProduct.id, ...items.filter((id) => id !== detailProduct.id)].slice(0, 8))
  }, [detailProduct])

  useEffect(() => {
    if (!detailProduct || trackedProductViewsRef.current.has(detailProduct.id)) return
    trackedProductViewsRef.current.add(detailProduct.id)
    trackStoreEvent('product_view', { productId: detailProduct.id })
  }, [detailProduct?.id])

  const cartItems = useMemo(() => cart
    .map((entry) => {
      const productId = entry.productId || entry.id
      const product = products.find((item) => item.id === productId)
      if (!product) return null
      const variant = entry.variantId
        ? activeVariants(product).find((item) => item.id === entry.variantId) || null
        : null
      return {
        ...product,
        qty: entry.qty,
        selectedVariant: variant,
        cartKey: cartEntryKey(productId, entry.variantId),
      }
    })
    .filter(Boolean), [cart, products])

  const cartCount = cart.reduce((total, item) => total + item.qty, 0)
  const knownCartTotal = cartItems.reduce((total, item) => {
    const unresolvedVariant = activeVariants(item).length > 0 && !item.selectedVariant
    const price = effectivePrice(item, item.selectedVariant)
    if (price === null || unresolvedVariant || (!item.selectedVariant && item.price_from)) return total
    return total + price * item.qty
  }, 0)
  const hasUnpricedCartItems = cartItems.some((item) => {
    const unresolvedVariant = activeVariants(item).length > 0 && !item.selectedVariant
    return effectivePrice(item, item.selectedVariant) === null
      || unresolvedVariant
      || (!item.selectedVariant && item.price_from)
  })

  const selectedDeliveryZone = checkoutForm.delivery_zone_id
    ? deliveryZones.find((zone) => zone.id === checkoutForm.delivery_zone_id) || null
    : null
  const selectedDeliveryFee = selectedDeliveryZone?.fee === null || selectedDeliveryZone?.fee === undefined
    ? null
    : Number(selectedDeliveryZone.fee)
  const appliedDiscount = promoPreview?.valid
    ? Number(promoPreview.discount_amount || 0)
    : 0
  const discountedCartTotal = Math.max(knownCartTotal - appliedDiscount, 0)
  const checkoutHasKnownTotal = checkoutForm.delivery_method === 'pickup'
    || (checkoutForm.delivery_method === 'delivery' && selectedDeliveryFee !== null)
  const checkoutEstimatedTotal = checkoutForm.delivery_method === 'pickup'
    ? discountedCartTotal
    : selectedDeliveryFee === null ? null : discountedCartTotal + selectedDeliveryFee

  const toggleSaved = (id) => {
    setSaved((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]))
  }

  const openWishlist = () => {
    if (detailSlug) {
      window.history.pushState({}, '', '/')
      setDetailSlug('')
    }
    setWishlistOnly(true)
    setActiveCategory('All')
    setQuery('')
    window.setTimeout(() => {
      document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  const addToCart = (product, variant = null) => {
    const variants = activeVariants(product)
    if (variants.length > 0 && !variant) {
      openProductPage(product)
      return
    }

    const key = cartEntryKey(product.id, variant?.id)
    setCart((items) => {
      const existing = items.find((item) => cartEntryKey(item.productId || item.id, item.variantId) === key)
      if (existing) {
        return items.map((item) => (
          cartEntryKey(item.productId || item.id, item.variantId) === key
            ? { ...item, qty: item.qty + 1 }
            : item
        ))
      }
      return [...items, { productId: product.id, variantId: variant?.id || null, qty: 1 }]
    })

    trackStoreEvent('add_to_cart', {
      productId: product.id,
      variantId: variant?.id || null,
      value: effectivePrice(product, variant),
    })

    setRecentlyAddedId(product.id)
    setToastProduct(product)
    window.clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setRecentlyAddedId(null)
      setToastProduct(null)
    }, 2600)
  }

  const changeCartQty = (key, amount) => {
    setCart((items) => items
      .map((item) => (
        cartEntryKey(item.productId || item.id, item.variantId) === key
          ? { ...item, qty: Math.max(0, item.qty + amount) }
          : item
      ))
      .filter((item) => item.qty > 0))
  }

  const removeFromCart = (key) => {
    setCart((items) => items.filter(
      (item) => cartEntryKey(item.productId || item.id, item.variantId) !== key,
    ))
  }

  const cartWhatsappLink = () => {
    const lines = cartItems.map((item) => {
      const variantText = item.selectedVariant
        ? ` — ${item.selectedVariant.label}${item.selectedVariant.size ? ` (${item.selectedVariant.size})` : ''}${item.selectedVariant.colour ? `, ${item.selectedVariant.colour}` : ''}`
        : ''
      return `• ${item.name}${variantText} × ${item.qty}`
    })
    const message = [
      'Hello Sancity Mall KE, I would like to place this order:',
      '',
      ...lines,
      '',
      'Please confirm availability, final price and delivery options.'
    ].join('\n')
    return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
  }


  const submitStockAlert = async (event) => {
    event.preventDefault()
    if (!detailProduct || stockAlertState.status === 'submitting') return

    if (detailVariants.length > 0 && !selectedVariant) {
      setStockAlertState({ status: 'error', message: 'Choose the exact product option first.' })
      return
    }

    setStockAlertState({ status: 'submitting', message: '' })

    try {
      const { data, error } = await supabase.rpc('request_stock_alert', {
        p_product_id: detailProduct.id,
        p_variant_id: selectedVariant?.id || null,
        p_customer_phone: stockAlertPhone.trim(),
      })

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data
      setStockAlertState({
        status: 'success',
        message: result?.already_requested
          ? 'You already have an active availability request for this item.'
          : 'Request saved. Sancity can contact you on WhatsApp when availability is confirmed.',
      })

      if (!result?.already_requested) {
        trackStoreEvent('stock_alert_request', {
          productId: detailProduct.id,
          variantId: selectedVariant?.id || null,
        })
      }
    } catch (error) {
      setStockAlertState({
        status: 'error',
        message: error.message || 'Could not save your availability request.',
      })
    }
  }

  const openCheckout = () => {
    if (cartItems.length === 0 || hasUnpricedCartItems) return
    setCheckoutError('')
    setCheckoutResult(null)
    setPromoCodeInput('')
    setPromoPreview(null)
    trackStoreEvent('checkout_open', {
      value: knownCartTotal,
      metadata: { cart_items: cartCount },
    })
    setCheckoutOpen(true)
    setCartOpen(false)
  }

  const closeCheckout = () => {
    if (checkoutSubmitting) return
    setCheckoutOpen(false)
    setCheckoutError('')
    setCheckoutResult(null)
    setPromoCodeInput('')
    setPromoPreview(null)
  }

  const applyPromoCode = async () => {
    const code = promoCodeInput.trim().toUpperCase()
    if (!code || promoApplying) return

    setPromoApplying(true)
    setPromoPreview(null)

    try {
      const { data, error } = await supabase.rpc('preview_promotion', {
        p_code: code,
        p_subtotal: knownCartTotal,
      })

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data
      setPromoPreview(result || {
        valid: false,
        promo_code: code,
        message: 'Could not validate this promo code.',
        discount_amount: 0,
      })

      if (result?.valid) {
        setPromoCodeInput(result.promo_code || code)
        trackStoreEvent('promo_applied', {
          value: Number(result.discount_amount || 0),
          metadata: { code: result.promo_code || code },
        })
      }
    } catch (error) {
      setPromoPreview({
        valid: false,
        promo_code: code,
        message: error.message || 'Could not validate this promo code.',
        discount_amount: 0,
      })
    } finally {
      setPromoApplying(false)
    }
  }

  const clearPromoCode = () => {
    setPromoCodeInput('')
    setPromoPreview(null)
  }

  const checkoutWhatsappLink = (result = checkoutResult) => {
    const reference = result?.order_number || 'my Sancity order'
    const message = result?.total_amount
      ? `Hello Sancity Mall KE, I have placed order ${reference} and submitted my M-Pesa confirmation code for verification.`
      : `Hello Sancity Mall KE, I have placed order ${reference}. Please confirm my delivery fee and final total.`
    return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
  }

  const submitCheckout = async (event) => {
    event.preventDefault()
    if (checkoutSubmitting || cartItems.length === 0) return

    setCheckoutError('')

    if (hasUnpricedCartItems) {
      setCheckoutError('One or more items need price confirmation. Please use WhatsApp for this order.')
      return
    }

    if (checkoutForm.delivery_method === 'delivery' && !checkoutForm.delivery_location.trim()) {
      setCheckoutError('Enter the delivery address, estate or landmark.')
      return
    }

    if (checkoutHasKnownTotal && !checkoutForm.mpesa_code.trim()) {
      setCheckoutError('Enter the M-Pesa confirmation code after paying the displayed total.')
      return
    }

    setCheckoutSubmitting(true)

    try {
      const items = cart.map((entry) => ({
        product_id: entry.productId || entry.id,
        variant_id: entry.variantId || null,
        quantity: entry.qty,
      }))

      const { data, error } = await supabase.rpc('create_store_order_v3', {
        p_customer_name: checkoutForm.customer_name.trim(),
        p_customer_phone: checkoutForm.customer_phone.trim(),
        p_delivery_method: checkoutForm.delivery_method,
        p_delivery_location: checkoutForm.delivery_location.trim() || null,
        p_delivery_notes: checkoutForm.delivery_notes.trim() || null,
        p_items: items,
        p_mpesa_code: checkoutHasKnownTotal
          ? checkoutForm.mpesa_code.trim().toUpperCase()
          : null,
        p_delivery_zone_id: checkoutForm.delivery_method === 'delivery'
          ? checkoutForm.delivery_zone_id || null
          : null,
        p_promo_code: promoPreview?.valid ? promoPreview.promo_code : null,
        p_session_id: getAnalyticsSessionId(),
      })

      if (error) throw error

      const result = Array.isArray(data) ? data[0] : data
      if (!result?.order_number) throw new Error('The order was not created. Please try again.')

      setCheckoutResult(result)
      setCart([])
    } catch (error) {
      setCheckoutError(error.message || 'Could not place the order. Please try again.')
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const jumpToProducts = (category = 'All') => {
    if (detailSlug) {
      window.history.pushState({}, '', '/')
      setDetailSlug('')
    }
    setWishlistOnly(false)
    setActiveCategory(category)
    window.setTimeout(() => {
      document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  const handleDepartment = (department) => {
    if (department.wholesale) {
      if (detailSlug) {
        window.history.pushState({}, '', '/')
        setDetailSlug('')
      }
      window.setTimeout(() => {
        document.querySelector('#wholesale')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 40)
      return
    }

    jumpToProducts(department.name)
  }

  const focusSearch = () => {
    if (detailSlug) {
      window.history.pushState({}, '', '/')
      setDetailSlug('')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => searchRef.current?.focus(), 220)
  }

  const openQuickView = (product) => {
    setQuickViewProduct(product)
    trackStoreEvent('quick_view', { productId: product.id })
  }

  const openProductPage = (product) => {
    const slug = productSlug(product)
    if (!slug) return
    window.history.pushState({}, '', `/products/${encodeURIComponent(slug)}`)
    setDetailSlug(slug)
    setGalleryIndex(0)
    setQuickViewProduct(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitSearch = () => {
    setSearchActive(false)
    if (detailSlug) {
      window.history.pushState({}, '', '/')
      setDetailSlug('')
    }
    window.setTimeout(() => {
      document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 40)
  }

  const choosePredictiveCategory = (category) => {
    setQuery('')
    setSearchActive(false)
    jumpToProducts(category)
  }

  const openCollection = (collection) => {
    setQuery('')
    setSearchActive(false)
    jumpToProducts(collection.category)
  }

  const backToShop = () => {
    window.history.pushState({}, '', '/')
    setDetailSlug('')
    setGalleryIndex(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const whatsapp = waLink()

  return (
    <div className="storefront" id="home">
      <div className="utility-bar">
        <div className="utility-left">
          <span>🚚 Fast Delivery Across Kenya</span>
          <i />
          <span>🛡️ Quality Products</span>
          <i />
          <span>🏷️ Great Prices</span>
          <i />
          <span>👥 Wholesale Available</span>
        </div>
        <div className="utility-right">
          <strong>A Better Home. A Brighter You.</strong>
          <span>•</span>
          <span>◉</span>
          <span>◎</span>
          <span>◈</span>
        </div>
      </div>

      <header className="store-header">
        <div className="header-main">
          <a href="#home" className="brand-lockup" aria-label="Sancity Mall home">
            <span className="brand-bag">🛍️</span>
            <span className="brand-copy">
              <strong>SANCITY <b>MALL</b></strong>
              <small>Home Essentials for a Better Tomorrow</small>
            </span>
          </a>

          <div
            className={`global-search ${searchActive && query.trim() ? 'predictive-open' : ''}`}
            onFocus={() => setSearchActive(true)}
            onBlur={() => window.setTimeout(() => setSearchActive(false), 140)}
          >
            <Search size={19} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSearchActive(true)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch()
              }}
              placeholder="Search for products, categories or brands..."
              aria-label="Search Sancity products"
              autoComplete="off"
            />
            <select
              value={activeCategory}
              onChange={(e) => {
                setActiveCategory(e.target.value)
                setSearchActive(true)
              }}
              aria-label="Choose search category"
            >
              <option value="All">All categories</option>
              {productCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button className="search-button" onClick={submitSearch}>
              Search
            </button>
            {query && (
              <button
                className="clear-search"
                onClick={() => {
                  setQuery('')
                  setSearchActive(false)
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}

            {searchActive && query.trim() && (
              <div className="predictive-search" role="listbox" aria-label="Search suggestions">
                <div className="predictive-search-top">
                  <span>Search suggestions</span>
                  <small>{predictiveProducts.length} product{predictiveProducts.length === 1 ? '' : 's'} found</small>
                </div>

                {predictiveCategories.length > 0 && (
                  <div className="predictive-categories">
                    {predictiveCategories.map((category) => (
                      <button key={category} onMouseDown={(e) => e.preventDefault()} onClick={() => choosePredictiveCategory(category)}>
                        <Search size={13} />
                        <span>{category}</span>
                        <ChevronRight size={13} />
                      </button>
                    ))}
                  </div>
                )}

                {predictiveProducts.length > 0 ? (
                  <div className="predictive-products">
                    {predictiveProducts.map((product) => (
                      <button
                        key={product.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openProductPage(product)}
                      >
                        <span className={`predictive-image ${productMainImage(product) ? 'has-photo' : ''}`}>
                          {productMainImage(product)
                            ? <img src={productMainImage(product)} alt="" />
                            : <span>{categoryEmoji(product.category)}</span>}
                        </span>
                        <span className="predictive-copy">
                          <small>{product.category}</small>
                          <strong>{product.name}</strong>
                          <b>{formatPrice(product)}</b>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="predictive-empty">
                    <Search size={20} />
                    <span>
                      <strong>No direct matches yet</strong>
                      <small>Try a broader product name or another category.</small>
                    </span>
                  </div>
                )}

                <button className="predictive-view-all" onMouseDown={(e) => e.preventDefault()} onClick={submitSearch}>
                  View all matching products <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="header-actions">
            <button
              className="header-action"
              onClick={() => {
                setAccountOpen((open) => !open)
                setCartOpen(false)
              }}
              aria-label="Account"
              aria-expanded={accountOpen}
            >
              <span className="header-action-icon"><UserRound size={22} strokeWidth={1.8} /></span>
              <span>Account</span>
            </button>

            <button
              className={`header-action ${wishlistOnly ? 'active' : ''}`}
              onClick={openWishlist}
              aria-label="Wishlist"
            >
              <span className="header-action-icon"><Heart size={23} strokeWidth={1.8} /></span>
              <span>Wishlist</span>
              {saved.length > 0 && <b>{saved.length}</b>}
            </button>

            <button
              className="header-action cart-header-action"
              onClick={() => {
                setCartOpen(true)
                setAccountOpen(false)
              }}
              aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
            >
              <span className="header-action-icon"><ShoppingCart size={23} strokeWidth={1.8} /></span>
              <span>Cart</span>
              <b className="cart-count">{cartCount}</b>
            </button>

            {accountOpen && (
              <div className="account-popover">
                <div className="account-popover-icon"><UserRound size={20} /></div>
                <div>
                  <strong>Your Sancity account</strong>
                  <p>Need help with an order? Our team can assist you directly.</p>
                </div>
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle size={15} /> Customer support
                </a>
                <a href="/admin" className="admin-login-link">
                  <LogIn size={15} /> Store admin login
                </a>
              </div>
            )}

            <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={24} />
            </button>
          </div>
        </div>

        <nav className="department-nav" aria-label="Shopping departments">
          <button className="all-departments" onClick={() => jumpToProducts('All')}>
            <Menu size={18} strokeWidth={2} /> All Departments
          </button>

          <div className="department-links">
            {departments.map((department) => (
              <button
                key={department.short}
                className={department.className}
                onClick={() => handleDepartment(department)}
              >
                <span className="department-icon" aria-hidden="true">
                  <department.icon strokeWidth={1.9} />
                </span>
                {department.short}
              </button>
            ))}
          </div>

          <div className="nav-help">
            <button onClick={() => jumpToProducts('All')}><Tag size={15} /> Offers</button>
            <a href={whatsapp} target="_blank" rel="noreferrer"><CircleHelp size={15} /> Help</a>
          </div>
        </nav>
      </header>

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart" onClick={(event) => event.stopPropagation()}>
            <div className="cart-drawer-head">
              <div>
                <span>Your cart</span>
                <strong>{cartCount} item{cartCount === 1 ? '' : 's'}</strong>
              </div>
              <button autoFocus onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={20} /></button>
            </div>

            <div className="cart-drawer-body">
              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <span>🛒</span>
                  <strong>Your cart is empty</strong>
                  <p>Add a few Sancity finds and send the whole order on WhatsApp.</p>
                  <button onClick={() => {
                    setCartOpen(false)
                    jumpToProducts('All')
                  }}>Start shopping</button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <article className="cart-line" key={item.cartKey}>
                    <span className={`cart-line-emoji ${productMainImage(item) ? 'has-photo' : ''}`}>
                      {productMainImage(item) ? (
                        <img src={productMainImage(item)} alt="" loading="lazy" decoding="async" />
                      ) : categoryEmoji(item.category)}
                    </span>
                    <div className="cart-line-copy">
                      <small>{item.category}</small>
                      <strong>{item.name}</strong>
                      {item.selectedVariant && (
                        <em>
                          {item.selectedVariant.label}
                          {item.selectedVariant.size ? ` • ${item.selectedVariant.size}` : ''}
                          {item.selectedVariant.colour ? ` • ${item.selectedVariant.colour}` : ''}
                        </em>
                      )}
                      <span>{formatPrice(item, item.selectedVariant)}</span>
                    </div>
                    <div className="cart-line-controls">
                      <button onClick={() => changeCartQty(item.cartKey, -1)} aria-label={`Reduce ${item.name}`}><Minus size={13} /></button>
                      <b>{item.qty}</b>
                      <button onClick={() => changeCartQty(item.cartKey, 1)} aria-label={`Add another ${item.name}`}><Plus size={13} /></button>
                    </div>
                    <button className="remove-cart-line" onClick={() => removeFromCart(item.cartKey)} aria-label={`Remove ${item.name}`}>
                      <X size={14} />
                    </button>
                  </article>
                ))
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-drawer-foot">
                <div className="cart-total-row">
                  <span>{hasUnpricedCartItems ? 'Known subtotal' : 'Subtotal'}</span>
                  <strong>KSh {knownCartTotal.toLocaleString('en-KE')}</strong>
                </div>
                {hasUnpricedCartItems && <small>Some items have variable or enquiry pricing. We’ll confirm the final total on WhatsApp.</small>}
                {!hasUnpricedCartItems && (
                  <button type="button" className="cart-checkout-btn" onClick={openCheckout}>
                    Secure checkout <Banknote size={17} />
                  </button>
                )}
                <a
                  className="cart-whatsapp-fallback"
                  href={cartWhatsappLink()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsappClick(null, null, 'cart')}
                >
                  {hasUnpricedCartItems ? 'Checkout on WhatsApp' : 'Prefer WhatsApp?'} <MessageCircle size={17} />
                </a>
              </div>
            )}
          </aside>
        </div>
      )}

      {checkoutOpen && (
        <div className="checkout-overlay" onMouseDown={closeCheckout}>
          <section className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="checkout-head">
              <div>
                <span>Sancity secure checkout</span>
                <h2 id="checkout-title">{checkoutResult ? 'Order received' : 'Complete your order'}</h2>
              </div>
              <button type="button" onClick={closeCheckout} disabled={checkoutSubmitting} aria-label="Close checkout"><X size={20} /></button>
            </div>

            {checkoutResult ? (
              <div className="checkout-success">
                <div className="checkout-success-icon"><Check size={25} /></div>
                <span>Order reference</span>
                <strong>{checkoutResult.order_number}</strong>

                {checkoutResult.total_amount ? (
                  <>
                    <h3>Payment submitted for verification</h3>
                    <p>Your M-Pesa code has been attached to the order. Sancity will verify the transaction before fulfilment.</p>
                    {Number(checkoutResult.discount_amount || 0) > 0 && (
                      <div className="checkout-promo-success">
                        <Tag size={15} />
                        <span>{checkoutResult.promotion_code} saved KSh {Number(checkoutResult.discount_amount).toLocaleString('en-KE')}</span>
                      </div>
                    )}
                    <div className="checkout-summary-line">
                      <span>Amount submitted</span>
                      <b>KSh {Number(checkoutResult.total_amount || 0).toLocaleString('en-KE')}</b>
                    </div>
                  </>
                ) : (
                  <>
                    <h3>Delivery total will be confirmed first</h3>
                    <p>Your products are reserved in the order. Sancity will confirm the delivery fee and final amount before asking you to pay.</p>
                    {Number(checkoutResult.discount_amount || 0) > 0 && (
                      <div className="checkout-promo-success">
                        <Tag size={15} />
                        <span>{checkoutResult.promotion_code} saved KSh {Number(checkoutResult.discount_amount).toLocaleString('en-KE')}</span>
                      </div>
                    )}
                    <div className="checkout-summary-line">
                      <span>Product subtotal after discount</span>
                      <b>KSh {Math.max(Number(checkoutResult.subtotal || 0) - Number(checkoutResult.discount_amount || 0), 0).toLocaleString('en-KE')}</b>
                    </div>
                  </>
                )}

                <a
                  className="checkout-whatsapp-result"
                  href={checkoutWhatsappLink(checkoutResult)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsappClick(null, null, 'checkout_success')}
                >
                  <MessageCircle size={18} /> Continue with Sancity on WhatsApp
                </a>
                <button type="button" className="checkout-done" onClick={closeCheckout}>Done</button>
              </div>
            ) : (
              <form className="checkout-form" onSubmit={submitCheckout}>
                <div className="checkout-order-total">
                  <span>Product subtotal</span>
                  <strong>KSh {knownCartTotal.toLocaleString('en-KE')}</strong>
                </div>

                <div className="checkout-promo">
                  <div className="checkout-promo-heading">
                    <Tag size={17} />
                    <span>
                      <strong>Promo code</strong>
                      <small>Discount applies to products, not delivery.</small>
                    </span>
                  </div>
                  <div className="checkout-promo-entry">
                    <input
                      value={promoCodeInput}
                      onChange={(event) => {
                        setPromoCodeInput(event.target.value.toUpperCase().replace(/\s+/g, ''))
                        setPromoPreview(null)
                      }}
                      placeholder="e.g. SANCITY10"
                      maxLength="24"
                      disabled={promoApplying}
                    />
                    {promoPreview?.valid ? (
                      <button type="button" className="remove" onClick={clearPromoCode}>Remove</button>
                    ) : (
                      <button type="button" onClick={applyPromoCode} disabled={promoApplying || !promoCodeInput.trim()}>
                        {promoApplying ? 'Checking…' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {promoPreview && (
                    <div className={`checkout-promo-message ${promoPreview.valid ? 'valid' : 'invalid'}`}>
                      {promoPreview.valid ? <Check size={15} /> : <CircleHelp size={15} />}
                      <span>
                        {promoPreview.valid
                          ? `${promoPreview.message} — save KSh ${Number(promoPreview.discount_amount || 0).toLocaleString('en-KE')}`
                          : promoPreview.message}
                      </span>
                    </div>
                  )}
                </div>

                <div className="checkout-fields-grid">
                  <label>
                    <span>Name</span>
                    <input
                      required
                      autoComplete="name"
                      value={checkoutForm.customer_name}
                      onChange={(event) => setCheckoutForm({ ...checkoutForm, customer_name: event.target.value })}
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    <span>Phone number</span>
                    <input
                      required
                      inputMode="tel"
                      autoComplete="tel"
                      value={checkoutForm.customer_phone}
                      onChange={(event) => setCheckoutForm({ ...checkoutForm, customer_phone: event.target.value })}
                      placeholder="07XX XXX XXX"
                    />
                  </label>
                </div>

                <fieldset className="checkout-methods">
                  <legend>How would you like to receive the order?</legend>
                  <label className={checkoutForm.delivery_method === 'delivery' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="delivery-method"
                      value="delivery"
                      checked={checkoutForm.delivery_method === 'delivery'}
                      onChange={() => setCheckoutForm({ ...checkoutForm, delivery_method: 'delivery', mpesa_code: '' })}
                    />
                    <Truck size={20} />
                    <span><strong>Delivery</strong><small>Fee confirmed before payment</small></span>
                  </label>
                  <label className={checkoutForm.delivery_method === 'pickup' ? 'active' : ''}>
                    <input
                      type="radio"
                      name="delivery-method"
                      value="pickup"
                      checked={checkoutForm.delivery_method === 'pickup'}
                      onChange={() => setCheckoutForm({ ...checkoutForm, delivery_method: 'pickup', delivery_zone_id: '', delivery_location: '' })}
                    />
                    <MapPin size={20} />
                    <span><strong>Pickup</strong><small>RNG Plaza, Ronald Ngala Street</small></span>
                  </label>
                </fieldset>

                {checkoutForm.delivery_method === 'delivery' && (
                  <div className="checkout-delivery-block">
                    <label>
                      <span>Delivery zone</span>
                      <select
                        value={checkoutForm.delivery_zone_id}
                        onChange={(event) => setCheckoutForm({
                          ...checkoutForm,
                          delivery_zone_id: event.target.value,
                          mpesa_code: '',
                        })}
                      >
                        <option value="">My area is not listed / request a quote</option>
                        {deliveryZones.map((zone) => (
                          <option key={zone.id} value={zone.id}>
                            {zone.name}{zone.fee === null || zone.fee === undefined ? ' — quote required' : ` — KSh ${Number(zone.fee).toLocaleString('en-KE')}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Exact delivery address / landmark</span>
                      <input
                        required
                        value={checkoutForm.delivery_location}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, delivery_location: event.target.value })}
                        placeholder="Estate, building, street or nearby landmark"
                      />
                    </label>

                    {selectedDeliveryZone && (
                      <div className="checkout-zone-summary">
                        <span>
                          <strong>{selectedDeliveryZone.name}</strong>
                          <small>{selectedDeliveryZone.eta_text || 'Delivery timing confirmed with your order.'}</small>
                        </span>
                        <b>{selectedDeliveryFee === null ? 'Quote required' : `KSh ${selectedDeliveryFee.toLocaleString('en-KE')}`}</b>
                      </div>
                    )}

                    {selectedDeliveryFee === null ? (
                      <div className="checkout-info-note">
                        <Truck size={18} />
                        <span><strong>Do not pay yet.</strong> Submit the order first. Sancity will confirm the delivery fee and final total before payment.</span>
                      </div>
                    ) : (
                      <div className="checkout-final-total">
                        <span><small>Products</small><b>KSh {knownCartTotal.toLocaleString('en-KE')}</b></span>
                        {appliedDiscount > 0 && (
                          <span className="discount"><small>Promo {promoPreview?.promo_code}</small><b>− KSh {appliedDiscount.toLocaleString('en-KE')}</b></span>
                        )}
                        <span><small>Delivery</small><b>KSh {selectedDeliveryFee.toLocaleString('en-KE')}</b></span>
                        <strong><small>Final total</small><b>KSh {checkoutEstimatedTotal.toLocaleString('en-KE')}</b></strong>
                      </div>
                    )}
                  </div>
                )}

                {checkoutHasKnownTotal && (
                  <div className="checkout-payment-card">
                    <div className="checkout-payment-title">
                      <Banknote size={20} />
                      <span><strong>Pay with M-Pesa via Equity</strong><small>The recipient should reflect Sancity Mall.</small></span>
                    </div>
                    <ol>
                      <li>Open <strong>Lipa na M-Pesa → Paybill</strong></li>
                      <li>Business No. <strong>247247</strong></li>
                      <li>Account / Till <strong>0705287264</strong></li>
                      <li>Amount <strong>KSh {Number(checkoutEstimatedTotal || knownCartTotal).toLocaleString('en-KE')}</strong></li>
                    </ol>
                    <label>
                      <span>M-Pesa confirmation code</span>
                      <input
                        required
                        autoCapitalize="characters"
                        value={checkoutForm.mpesa_code}
                        onChange={(event) => setCheckoutForm({ ...checkoutForm, mpesa_code: event.target.value.toUpperCase().replace(/\s/g, '') })}
                        placeholder="e.g. TXX123ABCD"
                        maxLength="16"
                      />
                      <small>Payment is marked pending until Sancity verifies the transaction.</small>
                    </label>
                  </div>
                )}

                <label className="checkout-notes">
                  <span>Order notes <small>optional</small></span>
                  <textarea
                    rows="3"
                    value={checkoutForm.delivery_notes}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, delivery_notes: event.target.value })}
                    placeholder="Colour preference, landmark, pickup note…"
                  />
                </label>

                {checkoutError && <div className="checkout-error"><CircleHelp size={17} /> {checkoutError}</div>}

                <button className="checkout-submit" disabled={checkoutSubmitting}>
                  {checkoutSubmitting
                    ? 'Placing order…'
                    : checkoutHasKnownTotal
                      ? 'Submit paid order'
                      : 'Request delivery total'}
                </button>
                <small className="checkout-privacy">Your details are used only to fulfil this order and contact you about it.</small>
              </form>
            )}
          </section>
        </div>
      )}

      {menuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-top">
              <div className="brand-lockup compact">
                <span className="brand-bag">🛍️</span>
                <span className="brand-copy"><strong>SANCITY <b>MALL</b></strong></span>
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
            </div>
            {departments.map((department) => (
              <button
                key={department.short}
                className={department.className}
                onClick={() => {
                  setMenuOpen(false)
                  handleDepartment(department)
                }}
              >
                <span className="drawer-department-icon" aria-hidden="true">
                  <department.icon strokeWidth={1.9} />
                </span>
                {department.short}
              </button>
            ))}
            <a href={whatsapp} target="_blank" rel="noreferrer" className="drawer-whatsapp">
              <MessageCircle size={18} /> Ask on WhatsApp
            </a>
          </aside>
        </div>
      )}

      {quickViewProduct && (
        <div className="quick-view-overlay" onClick={() => setQuickViewProduct(null)}>
          <section
            className="quick-view-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-view-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="quick-view-mobile-toolbar">
              <span>Quick view</span>
              <button autoFocus className="quick-view-close" onClick={() => setQuickViewProduct(null)} aria-label="Close product details">
                <X size={20} />
              </button>
            </div>

            <div className={`quick-view-media ${productMainImage(quickViewProduct) ? 'has-photo' : ''}`}>
              {productMainImage(quickViewProduct) ? (
                <img src={productMainImage(quickViewProduct)} alt={quickViewProduct.name} />
              ) : (
                <span>{categoryEmoji(quickViewProduct.category)}</span>
              )}
              {quickViewProduct.badge && <small>{quickViewProduct.badge}</small>}
            </div>

            <div className="quick-view-copy">
              <span>{quickViewProduct.category}</span>
              <h2 id="quick-view-title">{quickViewProduct.name}</h2>
              <p>{quickViewProduct.description}</p>

              <div className="quick-view-meta">
                <strong>
                  {formatPrice(quickViewProduct)}
                </strong>
                <span>
                  {quickViewProduct.stock_quantity > 0
                    ? `${quickViewProduct.stock_quantity} in stock`
                    : 'Confirm current stock'}
                </span>
              </div>

              <div className="quick-view-actions">
                <button
                  className={recentlyAddedId === quickViewProduct.id ? 'added' : ''}
                  onClick={() => activeVariants(quickViewProduct).length > 0 ? openProductPage(quickViewProduct) : addToCart(quickViewProduct)}
                >
                  {recentlyAddedId === quickViewProduct.id ? <Check size={17} /> : <ShoppingCart size={17} />}
                  {activeVariants(quickViewProduct).length > 0
                    ? 'Choose options'
                    : recentlyAddedId === quickViewProduct.id ? 'Added to cart' : 'Add to cart'}
                </button>
                <a
                  href={waLink(quickViewProduct.name)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsappClick(quickViewProduct, null, 'quick_view')}
                >
                  <MessageCircle size={17} /> Order on WhatsApp
                </a>
                <button className="quick-view-full" onClick={() => openProductPage(quickViewProduct)}>
                  View full product <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <main>
        {detailSlug ? (
          detailProduct ? (
            <section className="product-detail-page" aria-label={detailProduct.name}>
              <div className="product-detail-shell">
                <button className="product-back" onClick={backToShop}>
                  <ArrowLeft size={17} /> Back to shop
                </button>

                <div className="product-breadcrumbs" aria-label="Breadcrumb">
                  <button onClick={backToShop}>Home</button>
                  <ChevronRight size={13} />
                  <span>{detailProduct.category}</span>
                  <ChevronRight size={13} />
                  <strong>{detailProduct.name}</strong>
                </div>

                <div className="product-detail-grid">
                  <div className="product-gallery">
                    <div className={`product-gallery-main ${activeDetailImage ? 'has-photo' : ''}`}>
                      {activeDetailImage ? (
                        <img src={activeDetailImage} alt={detailProduct.name} />
                      ) : (
                        <span className="product-detail-fallback">{categoryEmoji(detailProduct.category)}</span>
                      )}
                      {detailProduct.badge && <small>{detailProduct.badge}</small>}
                    </div>

                    {detailImages.length > 1 && (
                      <div className="product-gallery-thumbs" aria-label="Product images">
                        {detailImages.map((image, index) => (
                          <button
                            key={`${image.public_url}-${index}`}
                            className={galleryIndex === index ? 'active' : ''}
                            onClick={() => setGalleryIndex(index)}
                            aria-label={`View image ${index + 1} of ${detailProduct.name}`}
                          >
                            <img src={image.public_url} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="product-detail-copy">
                    <span className="product-detail-category">{detailProduct.category}</span>
                    <h1>{detailProduct.name}</h1>
                    <p className="product-detail-description">{detailProduct.description}</p>

                    {detailVariants.length > 0 && (
                      <div className="product-variant-picker">
                        <div className="product-variant-heading">
                          <span>Choose your option</span>
                          <small>{selectedVariant ? selectedVariant.label : 'Select one before adding to cart'}</small>
                        </div>
                        <div className="product-variant-grid">
                          {detailVariants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              className={selectedVariantId === variant.id ? 'active' : ''}
                              onClick={() => setSelectedVariantId(variant.id)}
                            >
                              <strong>{variant.label}</strong>
                              {(variant.size || variant.colour) && (
                                <span>
                                  {variant.size || ''}
                                  {variant.size && variant.colour ? ' • ' : ''}
                                  {variant.colour || ''}
                                </span>
                              )}
                              <b>{formatPrice(detailProduct, variant)}</b>
                              {variant.stock_quantity !== null && variant.stock_quantity !== undefined && (
                                <small>{variant.stock_quantity > 0 ? `${variant.stock_quantity} available` : 'Confirm stock'}</small>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="product-detail-price-row">
                      <div className="product-detail-pricing">
                        <strong>
                          {formatPrice(detailProduct, selectedVariant)}
                        </strong>
                        {detailProduct.compare_at_price !== null
                          && detailProduct.compare_at_price !== undefined
                          && detailProduct.price !== null
                          && Number(detailProduct.compare_at_price) > Number(detailProduct.price) && (
                            <del>KSh {Number(detailProduct.compare_at_price).toLocaleString('en-KE')}</del>
                          )}
                      </div>
                      <span className={detailStock > 0 ? 'in-stock' : ''}>
                        {detailStock > 0
                          ? `${detailStock} in stock`
                          : 'Confirm current stock'}
                      </span>
                    </div>

                    <div className="product-detail-actions">
                      <button
                        className={recentlyAddedId === detailProduct.id ? 'added' : ''}
                        disabled={detailVariants.length > 0 && !selectedVariant}
                        onClick={() => addToCart(detailProduct, selectedVariant)}
                      >
                        {recentlyAddedId === detailProduct.id ? <Check size={18} /> : <ShoppingCart size={18} />}
                        {detailVariants.length > 0 && !selectedVariant
                          ? 'Choose an option'
                          : recentlyAddedId === detailProduct.id ? 'Added to cart' : 'Add to cart'}
                      </button>
                      <a href={waLink(
                        `${detailProduct.name}${selectedVariant ? ` — ${selectedVariant.label}${selectedVariant.colour ? `, ${selectedVariant.colour}` : ''}` : ''}`,
                      )}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackWhatsappClick(detailProduct, selectedVariant, 'product_detail')}
                      >
                        <MessageCircle size={18} /> Order on WhatsApp
                      </a>
                      <button
                        className={`product-detail-save ${saved.includes(detailProduct.id) ? 'active' : ''}`}
                        onClick={() => toggleSaved(detailProduct.id)}
                        aria-label={saved.includes(detailProduct.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                      >
                        <Heart size={18} fill={saved.includes(detailProduct.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {canRequestStockAlert && (
                      <section className="stock-alert-panel" aria-label="Availability notification">
                        <div className="stock-alert-copy">
                          <span className="stock-alert-icon"><Bell size={18} /></span>
                          <div>
                            <strong>Get an availability update</strong>
                            <p>
                              Leave your WhatsApp number and Sancity can contact you when
                              {selectedVariant ? ` ${selectedVariant.label}` : ' this item'} is confirmed available.
                            </p>
                          </div>
                        </div>

                        {stockAlertState.status === 'success' ? (
                          <div className="stock-alert-success">
                            <Check size={17} />
                            <span>{stockAlertState.message}</span>
                          </div>
                        ) : (
                          <form className="stock-alert-form" onSubmit={submitStockAlert}>
                            <label>
                              <span>WhatsApp number</span>
                              <input
                                required
                                inputMode="tel"
                                autoComplete="tel"
                                value={stockAlertPhone}
                                onChange={(event) => setStockAlertPhone(event.target.value)}
                                placeholder="07XX XXX XXX"
                              />
                            </label>
                            <button type="submit" disabled={stockAlertState.status === 'submitting'}>
                              <Bell size={16} />
                              {stockAlertState.status === 'submitting' ? 'Saving…' : 'Notify me'}
                            </button>
                          </form>
                        )}

                        {stockAlertState.status === 'error' && (
                          <div className="stock-alert-error">{stockAlertState.message}</div>
                        )}

                        <small>Your number is used only for this availability request and order support.</small>
                      </section>
                    )}

                    <div className="product-confidence-grid">
                      <div>
                        <ShieldCheck size={20} />
                        <span><strong>Stock checked before dispatch</strong><small>We can confirm current availability before you commit to the order.</small></span>
                      </div>
                      <div>
                        <Eye size={20} />
                        <span><strong>Verify the exact item</strong><small>Ask for colour, size or additional photo confirmation where needed.</small></span>
                      </div>
                      <div>
                        <MessageCircle size={20} />
                        <span><strong>Direct shopping support</strong><small>Speak to Sancity on WhatsApp before or after adding to cart.</small></span>
                      </div>
                    </div>

                    <section className="product-specification-panel" aria-label="Product specifications">
                      <div className="product-specification-heading">
                        <span>Product information</span>
                        <h2>Details at a glance</h2>
                      </div>

                      <div className="product-specification-grid">
                        {detailSpecs.map((spec) => (
                          <div key={spec.label}>
                            <small>{spec.label}</small>
                            <strong>{spec.value}</strong>
                          </div>
                        ))}
                      </div>

                      {detailFeatureLines.length > 0 && (
                        <div className="product-feature-list">
                          <span>Key features</span>
                          <ul>
                            {detailFeatureLines.map((feature) => <li key={feature}>{feature}</li>)}
                          </ul>
                        </div>
                      )}

                      {detailProduct.care_instructions && (
                        <div className="product-care-note">
                          <span>Care</span>
                          <p>{detailProduct.care_instructions}</p>
                        </div>
                      )}
                    </section>

                    <section className="product-delivery-panel" aria-label="Delivery and collection">
                      <div className="product-delivery-heading">
                        <span>Delivery & collection</span>
                        <h2>Know what happens next</h2>
                      </div>

                      <div className="product-delivery-options">
                        <div>
                          <Truck size={20} />
                          <span>
                            <strong>Delivery across Kenya</strong>
                            <small>Delivery fee and expected arrival timing are confirmed for your location before dispatch.</small>
                          </span>
                        </div>
                        <div>
                          <PackageCheck size={20} />
                          <span>
                            <strong>Nairobi CBD pickup</strong>
                            <small>Collection is available from RNG Plaza, Ronald Ngala Street, after stock confirmation.</small>
                          </span>
                        </div>
                      </div>

                      {detailProduct.delivery_note && (
                        <div className="product-special-delivery">
                          <strong>Item-specific note</strong>
                          <span>{detailProduct.delivery_note}</span>
                        </div>
                      )}
                    </section>

                    <section className="product-concierge">
                      <div>
                        <span>Sancity shopping concierge</span>
                        <h2>Want us to verify something first?</h2>
                        <p>Use one of these shortcuts and WhatsApp will open with the product already included.</p>
                      </div>

                      <div className="product-concierge-actions">
                        <a
                          href={conciergeLink(detailProduct, 'Please confirm the dimensions, colour and any available variants for me.')}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Boxes size={17} /> Confirm size & colour
                        </a>
                        <a
                          href={conciergeLink(detailProduct, 'Could you send me more real photos or close-up photos of this exact item?')}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Eye size={17} /> Request more photos
                        </a>
                        <a
                          href={conciergeLink(detailProduct, 'Please check the delivery options, fee and expected timing to my area.')}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Truck size={17} /> Check delivery
                        </a>
                      </div>
                    </section>
                  </div>
                </div>

                {relatedProducts.length > 0 && (
                  <div className="product-recommendations">
                    <div>
                      <span>Complete the room</span>
                      <h2>More from {detailProduct.category}</h2>
                    </div>
                    <div className="product-recommendation-grid">
                      {relatedProducts.map((product) => (
                        <button key={product.id} onClick={() => openProductPage(product)}>
                          <div className={productMainImage(product) ? 'has-photo' : ''}>
                            {productMainImage(product)
                              ? <img src={productMainImage(product)} alt={product.name} loading="lazy" />
                              : <span>{categoryEmoji(product.category)}</span>}
                          </div>
                          <small>{product.category}</small>
                          <strong>{product.name}</strong>
                          <b>{formatPrice(product)}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {recentlyViewedProducts.length > 0 && (
                  <div className="product-recommendations recently-viewed">
                    <div>
                      <span>Recently viewed</span>
                      <h2>Pick up where you left off</h2>
                    </div>
                    <div className="product-recommendation-grid">
                      {recentlyViewedProducts.map((product) => (
                        <button key={product.id} onClick={() => openProductPage(product)}>
                          <div className={productMainImage(product) ? 'has-photo' : ''}>
                            {productMainImage(product)
                              ? <img src={productMainImage(product)} alt={product.name} loading="lazy" />
                              : <span>{categoryEmoji(product.category)}</span>}
                          </div>
                          <small>{product.category}</small>
                          <strong>{product.name}</strong>
                          <b>{formatPrice(product)}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="product-mobile-buybar">
                  <div>
                    <small>{selectedVariant ? `${detailProduct.name} • ${selectedVariant.label}` : detailProduct.name}</small>
                    <strong>{formatPrice(detailProduct, selectedVariant)}</strong>
                  </div>
                  <button
                    disabled={detailVariants.length > 0 && !selectedVariant}
                    onClick={() => addToCart(detailProduct, selectedVariant)}
                  >
                    <ShoppingCart size={17} /> {detailVariants.length > 0 && !selectedVariant ? 'Choose' : 'Add'}
                  </button>
                  <a
                    href={waLink(`${detailProduct.name}${selectedVariant ? ` — ${selectedVariant.label}` : ''}`)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Order on WhatsApp"
                    onClick={() => trackWhatsappClick(detailProduct, selectedVariant, 'mobile_buybar')}
                  >
                    <MessageCircle size={18} />
                  </a>
                </div>
              </div>
            </section>
          ) : (
            <section className="product-not-found">
              <span>Product unavailable</span>
              <h1>We couldn’t find this product.</h1>
              <p>It may have been renamed, unpublished or removed from the current catalogue.</p>
              <button onClick={backToShop}><ArrowLeft size={17} /> Return to Sancity Mall</button>
            </section>
          )
        ) : (
          <>
        <section className="reference-hero">
          <div className="hero-left">
            <span className="hero-pill">🏠 Everyday Home Essentials</span>
            <h1>Make home feel <em>better,</em> for you.</h1>
            <p>
              Quality home and lifestyle products at great prices. Discover real Sancity stock,
              check availability instantly and order easily on WhatsApp.
            </p>

            <div className="hero-cta-row">
              <button className="primary-cta" onClick={() => jumpToProducts('All')}>
                Shop New Arrivals
              </button>
              <a href="#categories" className="secondary-cta">Browse Departments</a>
            </div>

            <div className="hero-benefits">
              <div><span>🚚</span><strong>Fast & Reliable<br />Delivery</strong></div>
              <div><span>🛡️</span><strong>Quality Products<br />You Can Trust</strong></div>
              <div><span>🎧</span><strong>Friendly<br />Customer Support</strong></div>
            </div>
          </div>

          <div className="hero-stage hero-photo-stage" aria-label="Chocolate brown bedroom collection">
            <img
              className="hero-bedroom-photo"
              src="/hero-bedroom-hq.jpeg"
              alt="Chocolate brown plush bedding styled in a bright modern bedroom"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = '/hero-bedroom.webp'
              }}
            />
            <div className="hero-photo-scrim" aria-hidden="true" />
            <div className="tribal tribal-left" aria-hidden="true" />
            <div className="tribal tribal-right" aria-hidden="true" />

            <div className="stage-copy hero-photo-copy">
              <strong>Beautiful<br />Spaces</strong>
              <span>Happier<br />Days</span>
              <i />
            </div>

            <div className="stage-promos hero-photo-promos">
              <button className="stage-card stage-bedroom" onClick={() => jumpToProducts('Bedroom & Sleep')}>
                <div>
                  <small>Bedroom Comfort</small>
                  <strong>Sleep<br />Better</strong>
                </div>
                <span className="stage-emoji">🛏️</span>
              </button>

              <button className="stage-card stage-kitchen" onClick={() => jumpToProducts('Kitchen & Dining')}>
                <div>
                  <small>Kitchen Essentials</small>
                  <strong>Cook<br />Happier</strong>
                </div>
                <span className="stage-emoji">🍲</span>
              </button>

              <button className="stage-card stage-storage" onClick={() => jumpToProducts('Storage & Organisation')}>
                <div>
                  <small>Smart Storage</small>
                  <strong>More<br />Space</strong>
                </div>
                <span className="stage-emoji">🧺</span>
              </button>
            </div>
          </div>
        </section>

        <section className="category-showcase" id="categories">
          <div className="category-heading">
            <div>
              <span>Shop by category</span>
              <h2>Everything for a Better Home</h2>
            </div>
            <button onClick={() => jumpToProducts('All')}>View all categories</button>
          </div>

          <div className="category-card-grid">
            {departments.map((department) => (
              <button
                key={department.short}
                className={`category-card ${department.className}`}
                onClick={() => handleDepartment(department)}
              >
                <span className="category-emoji" aria-hidden="true">
                  <department.icon strokeWidth={1.8} />
                </span>
                <div>
                  <strong>{department.short}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="room-collections" id="collections">
          <div className="room-collections-heading">
            <div>
              <span>Curated for the home</span>
              <h2>Shop the Sancity Edit</h2>
              <p>Start with a room, then discover products that naturally belong together.</p>
            </div>
            <button onClick={() => jumpToProducts('All')}>Explore all products <ChevronRight size={15} /></button>
          </div>

          <div className="room-collection-grid">
            {collectionCards.map((collection) => (
              <article key={collection.key} className={`room-collection-card ${collection.className}`}>
                <button className="room-card-hitarea" onClick={() => openCollection(collection)} aria-label={`Shop ${collection.eyebrow}`} />
                <div className={`room-collection-media ${collection.featured && productMainImage(collection.featured) ? 'has-photo' : ''}`}>
                  {collection.featured && productMainImage(collection.featured) ? (
                    <img src={productMainImage(collection.featured)} alt={collection.featured.name} loading="lazy" />
                  ) : (
                    <span>{categoryEmoji(collection.category)}</span>
                  )}
                  <div className="room-collection-scrim" />
                  <small>{collection.count > 0 ? `${collection.count} products` : 'Collection building'}</small>
                </div>
                <div className="room-collection-copy">
                  <span>{collection.eyebrow}</span>
                  <h3>{collection.title}</h3>
                  <p>{collection.description}</p>
                  <strong>Shop collection <ChevronRight size={15} /></strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="catalogue-section" id="products">
          <div className="catalogue-heading">
            <div>
              <span>Shop Sancity</span>
              <h2>{wishlistOnly ? 'Your wishlist' : activeCategory === 'All' ? 'Popular home finds' : activeCategory}</h2>
              <p>{visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'} in this view.</p>
            </div>
            <div className="catalogue-filter">
              <button className={!wishlistOnly && activeCategory === 'All' ? 'active' : ''} onClick={() => { setWishlistOnly(false); setActiveCategory('All') }}>All</button>
              <button className={wishlistOnly ? 'active' : ''} onClick={openWishlist}>Wishlist</button>
              {productCategories.map((category) => (
                <button
                  key={category}
                  className={!wishlistOnly && activeCategory === category ? 'active' : ''}
                  onClick={() => { setWishlistOnly(false); setActiveCategory(category) }}
                >
                  {category.replace(' & Dining', '').replace(' & Sleep', '').replace(' & Organisation', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="catalogue-controls">
            <div className="catalogue-control-group">
              <span className="catalogue-control-label"><SlidersHorizontal size={15} /> Refine</span>

              <label>
                <span>Availability</span>
                <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
                  <option value="all">All stock</option>
                  <option value="in-stock">In stock</option>
                  <option value="confirm">Confirm stock</option>
                </select>
              </label>

              <label>
                <span>Pricing</span>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
                  <option value="all">All pricing</option>
                  <option value="priced">Priced products</option>
                  <option value="request">Price on request</option>
                </select>
              </label>

              <button
                className={`new-arrivals-toggle ${newOnly ? 'active' : ''}`}
                onClick={() => setNewOnly((value) => !value)}
              >
                <Sparkles size={14} /> New arrivals
              </button>
            </div>

            <div className="catalogue-sort">
              <ArrowUpDown size={15} />
              <span>Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          {(query || activeFilterCount > 0) && (
            <div className="active-filter-chips">
              {query && (
                <button onClick={() => setQuery('')}>
                  Search: <strong>{query}</strong> <X size={12} />
                </button>
              )}
              {stockFilter !== 'all' && (
                <button onClick={() => setStockFilter('all')}>
                  {stockFilter === 'in-stock' ? 'In stock' : 'Confirm stock'} <X size={12} />
                </button>
              )}
              {priceFilter !== 'all' && (
                <button onClick={() => setPriceFilter('all')}>
                  {priceFilter === 'priced' ? 'Priced products' : 'Price on request'} <X size={12} />
                </button>
              )}
              {newOnly && (
                <button onClick={() => setNewOnly(false)}>
                  New arrivals <X size={12} />
                </button>
              )}
              {sortBy !== 'newest' && (
                <button onClick={() => setSortBy('newest')}>
                  {sortBy === 'price-low' ? 'Price ↑' : sortBy === 'price-high' ? 'Price ↓' : 'Name A–Z'} <X size={12} />
                </button>
              )}
              {activeFilterCount > 1 && (
                <button className="clear-all-filters" onClick={resetCatalogueControls}>
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
          )}

          <div className="emoji-product-grid">
            {visibleProducts.map((product, index) => {
              const imageUrl = productMainImage(product)
              const isRecentlyAdded = recentlyAddedId === product.id

              return (
              <article className="emoji-product-card" key={product.id} style={{ '--card-delay': `${Math.min(index, 10) * 28}ms` }}>
                <button
                  className="product-card-click-target"
                  onClick={() => openQuickView(product)}
                  aria-label={`View details for ${product.name}`}
                  aria-haspopup="dialog"
                />

                <div className={`emoji-product-art ${imageUrl ? 'has-photo' : ''} art-${(product.category || 'other').toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                  {imageUrl ? (
                    <>
                      <span className="product-photo-fallback" aria-hidden="true">{categoryEmoji(product.category)}</span>
                      <img
                        className="product-photo"
                        src={imageUrl}
                        alt={product.name}
                        loading={index < 6 ? 'eager' : 'lazy'}
                        fetchPriority={index < 4 ? 'high' : 'auto'}
                        decoding="async"
                        onError={(event) => { event.currentTarget.style.display = 'none' }}
                      />
                    </>
                  ) : (
                    <span className="product-emoji">{categoryEmoji(product.category)}</span>
                  )}
                  <span className="product-quick-view-label" aria-hidden="true">
                    <Eye size={17} /> Quick view
                  </span>
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <button
                    className={`save-button ${saved.includes(product.id) ? 'active' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleSaved(product.id)
                    }}
                    aria-label={`Save ${product.name}`}
                  >
                    <Heart size={17} fill={saved.includes(product.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="emoji-product-copy">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>

                  <div className="product-meta">
                    <strong>
                      {formatPrice(product)}
                    </strong>
                    <span>
                      {product.stock_quantity === null || product.stock_quantity === undefined
                        ? 'Confirm current stock'
                        : product.stock_quantity > 0
                          ? `${product.stock_quantity} in stock`
                          : 'Confirm current stock'}
                    </span>
                  </div>

                  <div className="product-card-actions">
                    <button
                      className={isRecentlyAdded ? 'added' : ''}
                      onClick={() => activeVariants(product).length > 0 ? openProductPage(product) : addToCart(product)}
                    >
                      {isRecentlyAdded ? <Check size={14} /> : <ShoppingCart size={14} />}
                      {activeVariants(product).length > 0
                        ? 'Choose options'
                        : isRecentlyAdded ? 'Added' : 'Add to cart'}
                    </button>
                    <button className="product-card-details" onClick={() => openProductPage(product)} aria-label={`Open full details for ${product.name}`}>
                      <Eye size={15} />
                    </button>
                    <a
                      href={waLink(product.name)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Ask about ${product.name} on WhatsApp`}
                      onClick={() => trackWhatsappClick(product, null, 'product_card')}
                    >
                      <MessageCircle size={15} />
                    </a>
                  </div>
                </div>
              </article>
              )
            })}
          </div>

          {visibleProducts.length === 0 && (
            <div className="empty-products">
              <span>✨</span>
              <strong>No products match this view yet.</strong>
              <button onClick={() => { setQuery(''); setWishlistOnly(false); setActiveCategory('All') }}>Show all products</button>
            </div>
          )}
        </section>

        <section className="wholesale-section" id="wholesale">
          <div>
            <span>📦 Wholesale buyers</span>
            <h2>Buying for resale, business or an institution?</h2>
            <p>Send the product name and quantity you need. We’ll reply with current bulk availability and pricing.</p>
          </div>
          <a href={waLink('a wholesale / bulk order')} target="_blank" rel="noreferrer">
            Request wholesale pricing
          </a>
        </section>

        <section className="contact-section" id="contact">
          <div>
            <span>Visit or contact</span>
            <h2>Nairobi CBD shopping, direct support.</h2>
            <p>RNG Plaza, Ronald Ngala Street, Nairobi. Retail and wholesale enquiries are welcome.</p>
          </div>

          <div className="contact-grid">
            <a href={whatsapp} target="_blank" rel="noreferrer"><span>💬</span><strong>WhatsApp</strong><small>0710 900 548</small></a>
            <a href="mailto:Sancitymallke@gmail.com"><span>✉️</span><strong>Email</strong><small>Sancitymallke@gmail.com</small></a>
            <div><span>📍</span><strong>Store</strong><small>RNG Plaza, Ronald Ngala St</small></div>
          </div>
        </section>
          </>
        )}
      </main>

      <footer className="store-footer">
        <div className="brand-lockup footer-brand-lockup">
          <span className="brand-bag">🛍️</span>
          <span className="brand-copy">
            <strong>SANCITY <b>MALL</b></strong>
            <small>Home Essentials for a Better Tomorrow</small>
          </span>
        </div>
        <div className="footer-links">
          <a href="#categories">Departments</a>
          <a href="/#products">Products</a>
          <a href="/#wholesale">Wholesale</a>
          <a href="/#contact">Contact</a>
        </div>
        <small>© 2026 Sancity Mall KE</small>
      </footer>

      {!detailSlug && (
        <>
          <a
            className="mobile-whatsapp-fab"
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with Sancity Mall on WhatsApp"
            onClick={() => trackWhatsappClick(null, null, 'floating_button')}
          >
            <MessageCircle size={18} /> WhatsApp
          </a>

          <nav className="mobile-bottom-bar" aria-label="Mobile shopping navigation">
            <a href="#home"><span>🏠</span>Home</a>
            <a href="#categories"><span>🧺</span>Categories</a>
            <button onClick={focusSearch}><span>🔎</span>Search</button>
            <button onClick={openWishlist}><span>♡</span>Wishlist</button>
            <button onClick={() => setCartOpen(true)}><span>🛒</span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</button>
          </nav>
        </>
      )}

      {toastProduct && (
        <div className="cart-toast" role="status" aria-live="polite">
          <span><Check size={17} /></span>
          <div>
            <strong>Added to cart</strong>
            <small>{toastProduct.name}</small>
          </div>
          <button onClick={() => {
            setQuickViewProduct(null)
            setToastProduct(null)
            setCartOpen(true)
          }}>View cart</button>
        </div>
      )}
    </div>
  )
}
