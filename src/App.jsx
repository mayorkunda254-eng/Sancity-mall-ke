import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpDown, Baby, BedDouble, Boxes, Check, ChevronRight, CircleHelp, CookingPot, Dumbbell, Eye, Heart, HousePlug, LogIn, Menu, MessageCircle, Minus, PackageCheck, Plus, RotateCcw, Search, ShieldCheck, ShoppingCart, SlidersHorizontal, Sparkles, Tag, Truck, UserRound, X } from 'lucide-react'
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

function waLink(product) {
  const message = product
    ? `Hello Sancity Mall KE, I would like the current price and availability for ${product}.`
    : 'Hello Sancity Mall KE, I would like to enquire about your household products.'
  return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
}

export default function App() {
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
  const [storageReady, setStorageReady] = useState(false)
  const [products, setProducts] = useState(fallbackProducts)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [detailSlug, setDetailSlug] = useState('')
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [recentlyViewed, setRecentlyViewed] = useState([])
  const [recentlyAddedId, setRecentlyAddedId] = useState(null)
  const [toastProduct, setToastProduct] = useState(null)
  const searchRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true

    async function loadPublishedProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,slug,category,badge,description,price,stock_quantity,created_at,product_images(public_url,sort_order)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (!active || error || !data) return

      setProducts(data.length > 0 ? data : fallbackProducts)
    }

    loadPublishedProducts()

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
    const overlayOpen = cartOpen || menuOpen || Boolean(quickViewProduct)
    if (!overlayOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const closeOverlays = (event) => {
      if (event.key !== 'Escape') return
      setCartOpen(false)
      setMenuOpen(false)
      setQuickViewProduct(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOverlays)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOverlays)
    }
  }, [cartOpen, menuOpen, quickViewProduct])

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

  const cartItems = useMemo(() => cart
    .map((entry) => {
      const product = products.find((item) => item.id === entry.id)
      return product ? { ...product, qty: entry.qty } : null
    })
    .filter(Boolean), [cart, products])

  const cartCount = cart.reduce((total, item) => total + item.qty, 0)
  const knownCartTotal = cartItems.reduce((total, item) => {
    if (item.price === null || item.price === undefined) return total
    return total + Number(item.price) * item.qty
  }, 0)
  const hasUnpricedCartItems = cartItems.some((item) => item.price === null || item.price === undefined)

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

  const addToCart = (product) => {
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) {
        return items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...items, { id: product.id, qty: 1 }]
    })

    setRecentlyAddedId(product.id)
    setToastProduct(product)
    window.clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setRecentlyAddedId(null)
      setToastProduct(null)
    }, 2600)
  }

  const changeCartQty = (id, amount) => {
    setCart((items) => items
      .map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + amount) } : item)
      .filter((item) => item.qty > 0))
  }

  const removeFromCart = (id) => {
    setCart((items) => items.filter((item) => item.id !== id))
  }

  const cartWhatsappLink = () => {
    const lines = cartItems.map((item) => `• ${item.name} × ${item.qty}`)
    const message = [
      'Hello Sancity Mall KE, I would like to place this order:',
      '',
      ...lines,
      '',
      'Please confirm availability, final price and delivery options.'
    ].join('\n')
    return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
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
                          <b>{product.price !== null && product.price !== undefined ? `KSh ${Number(product.price).toLocaleString('en-KE')}` : 'Price on request'}</b>
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
                  <article className="cart-line" key={item.id}>
                    <span className={`cart-line-emoji ${productMainImage(item) ? 'has-photo' : ''}`}>
                      {productMainImage(item) ? (
                        <img src={productMainImage(item)} alt="" loading="lazy" decoding="async" />
                      ) : categoryEmoji(item.category)}
                    </span>
                    <div className="cart-line-copy">
                      <small>{item.category}</small>
                      <strong>{item.name}</strong>
                      <span>{item.price !== null && item.price !== undefined ? `KSh ${Number(item.price).toLocaleString('en-KE')}` : 'Price on request'}</span>
                    </div>
                    <div className="cart-line-controls">
                      <button onClick={() => changeCartQty(item.id, -1)} aria-label={`Reduce ${item.name}`}><Minus size={13} /></button>
                      <b>{item.qty}</b>
                      <button onClick={() => changeCartQty(item.id, 1)} aria-label={`Add another ${item.name}`}><Plus size={13} /></button>
                    </div>
                    <button className="remove-cart-line" onClick={() => removeFromCart(item.id)} aria-label={`Remove ${item.name}`}>
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
                {hasUnpricedCartItems && <small>Some items are price-on-request. We’ll confirm the final total on WhatsApp.</small>}
                <a href={cartWhatsappLink()} target="_blank" rel="noreferrer">
                  Checkout on WhatsApp <MessageCircle size={17} />
                </a>
              </div>
            )}
          </aside>
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
            <button autoFocus className="quick-view-close" onClick={() => setQuickViewProduct(null)} aria-label="Close product details">
              <X size={20} />
            </button>

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
                  {quickViewProduct.price !== null && quickViewProduct.price !== undefined
                    ? `KSh ${Number(quickViewProduct.price).toLocaleString('en-KE')}`
                    : 'Price on request'}
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
                  onClick={() => addToCart(quickViewProduct)}
                >
                  {recentlyAddedId === quickViewProduct.id ? <Check size={17} /> : <ShoppingCart size={17} />}
                  {recentlyAddedId === quickViewProduct.id ? 'Added to cart' : 'Add to cart'}
                </button>
                <a href={waLink(quickViewProduct.name)} target="_blank" rel="noreferrer">
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

                    <div className="product-detail-price-row">
                      <strong>
                        {detailProduct.price !== null && detailProduct.price !== undefined
                          ? `KSh ${Number(detailProduct.price).toLocaleString('en-KE')}`
                          : 'Price on request'}
                      </strong>
                      <span className={detailProduct.stock_quantity > 0 ? 'in-stock' : ''}>
                        {detailProduct.stock_quantity > 0
                          ? `${detailProduct.stock_quantity} in stock`
                          : 'Confirm current stock'}
                      </span>
                    </div>

                    <div className="product-detail-actions">
                      <button
                        className={recentlyAddedId === detailProduct.id ? 'added' : ''}
                        onClick={() => addToCart(detailProduct)}
                      >
                        {recentlyAddedId === detailProduct.id ? <Check size={18} /> : <ShoppingCart size={18} />}
                        {recentlyAddedId === detailProduct.id ? 'Added to cart' : 'Add to cart'}
                      </button>
                      <a href={waLink(detailProduct.name)} target="_blank" rel="noreferrer">
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

                    <div className="product-confidence-grid">
                      <div>
                        <Truck size={20} />
                        <span><strong>Delivery across Kenya</strong><small>Exact fee and arrival timing confirmed before dispatch.</small></span>
                      </div>
                      <div>
                        <ShieldCheck size={20} />
                        <span><strong>Buy with confidence</strong><small>Confirm availability and product details before payment.</small></span>
                      </div>
                      <div>
                        <PackageCheck size={20} />
                        <span><strong>Nairobi CBD pickup</strong><small>RNG Plaza, Ronald Ngala Street.</small></span>
                      </div>
                    </div>

                    <div className="product-detail-info">
                      <span>Product details</span>
                      <p>{detailProduct.description}</p>
                      <small>Need dimensions, colour confirmation or more photos? Ask us on WhatsApp and we’ll verify the exact item before you order.</small>
                    </div>
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
                          <b>{product.price !== null && product.price !== undefined ? `KSh ${Number(product.price).toLocaleString('en-KE')}` : 'Price on request'}</b>
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
                          <b>{product.price !== null && product.price !== undefined ? `KSh ${Number(product.price).toLocaleString('en-KE')}` : 'Price on request'}</b>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="product-mobile-buybar">
                  <div>
                    <small>{detailProduct.name}</small>
                    <strong>{detailProduct.price !== null && detailProduct.price !== undefined ? `KSh ${Number(detailProduct.price).toLocaleString('en-KE')}` : 'Price on request'}</strong>
                  </div>
                  <button onClick={() => addToCart(detailProduct)}>
                    <ShoppingCart size={17} /> Add
                  </button>
                  <a href={waLink(detailProduct.name)} target="_blank" rel="noreferrer" aria-label="Order on WhatsApp">
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
                  onClick={() => setQuickViewProduct(product)}
                  aria-label={`View details for ${product.name}`}
                  aria-haspopup="dialog"
                />

                <div className={`emoji-product-art ${imageUrl ? 'has-photo' : ''} art-${(product.category || 'other').toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                  {imageUrl ? (
                    <img
                      className="product-photo"
                      src={imageUrl}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                    />
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
                      {product.price !== null && product.price !== undefined
                        ? `KSh ${Number(product.price).toLocaleString('en-KE')}`
                        : 'Price on request'}
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
                    <button className={isRecentlyAdded ? 'added' : ''} onClick={() => addToCart(product)}>
                      {isRecentlyAdded ? <Check size={14} /> : <ShoppingCart size={14} />}
                      {isRecentlyAdded ? 'Added' : 'Add to cart'}
                    </button>
                    <button className="product-card-details" onClick={() => openProductPage(product)} aria-label={`Open full details for ${product.name}`}>
                      <Eye size={15} />
                    </button>
                    <a href={waLink(product.name)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`}>
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
