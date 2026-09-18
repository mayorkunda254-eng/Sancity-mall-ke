import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, LogIn, Menu, MessageCircle, Minus, Plus, Search, ShoppingCart, UserRound, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

const departments = [
  { name: 'Kitchen & Dining', short: 'Kitchen', emoji: '🍲', className: 'dept-kitchen' },
  { name: 'Bedroom & Sleep', short: 'Bedroom', emoji: '🛏️', className: 'dept-bedroom' },
  { name: 'Storage & Organisation', short: 'Storage', emoji: '🧺', className: 'dept-storage' },
  { name: 'Everyday Home Utility', short: 'Home Utility', emoji: '🧹', className: 'dept-utility' },
  { name: 'Kids & Baby', short: 'Kids & Baby', emoji: '🧸', className: 'dept-kids' },
  { name: 'Mosquito Nets', short: 'Mosquito Nets', emoji: '🦟', className: 'dept-nets' },
  { name: 'Home Fitness', short: 'Fitness', emoji: '🏋️', className: 'dept-fitness' },
  { name: 'Wholesale', short: 'Wholesale', emoji: '📦', className: 'dept-wholesale', wholesale: true },
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

function waLink(product) {
  const message = product
    ? `Hello Sancity Mall KE, I would like the current price and availability for ${product}.`
    : 'Hello Sancity Mall KE, I would like to enquire about your household products.'
  return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [saved, setSaved] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(window.localStorage.getItem('sancity-wishlist') || '[]')
    } catch {
      return []
    }
  })
  const [wishlistOnly, setWishlistOnly] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCart] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(window.localStorage.getItem('sancity-cart') || '[]')
    } catch {
      return []
    }
  })
  const [products, setProducts] = useState(fallbackProducts)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true

    async function loadPublishedProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,category,badge,description,price,stock_quantity,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (!active || error || !data) return

      const dynamicNames = new Set(data.map((product) => product.name.toLowerCase()))
      const staticProducts = fallbackProducts.filter((product) => !dynamicNames.has(product.name.toLowerCase()))
      setProducts([...data, ...staticProducts])
    }

    loadPublishedProducts()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('sancity-wishlist', JSON.stringify(saved))
  }, [saved])

  useEffect(() => {
    window.localStorage.setItem('sancity-cart', JSON.stringify(cart))
  }, [cart])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()

    return products.filter((item) => {
      const categoryMatch = activeCategory === 'All' || item.category === activeCategory
      const wishlistMatch = !wishlistOnly || saved.includes(item.id)
      const haystack = `${item.name || ''} ${item.category || ''} ${item.description || ''}`.toLowerCase()
      return categoryMatch && wishlistMatch && (!q || haystack.includes(q))
    })
  }, [products, query, activeCategory, wishlistOnly, saved])

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
    setWishlistOnly(true)
    setActiveCategory('All')
    setQuery('')
    window.setTimeout(() => {
      document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 20)
  }

  const addToCart = (product) => {
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id)
      if (existing) {
        return items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      }
      return [...items, { id: product.id, qty: 1 }]
    })
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
    setWishlistOnly(false)
    setActiveCategory(category)
    window.setTimeout(() => {
      document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 20)
  }

  const handleDepartment = (department) => {
    if (department.wholesale) {
      document.querySelector('#wholesale')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    jumpToProducts(department.name)
  }

  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => searchRef.current?.focus(), 220)
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

          <div className="global-search">
            <Search size={19} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, categories or brands..."
              aria-label="Search Sancity products"
            />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              aria-label="Choose search category"
            >
              <option value="All">All categories</option>
              {productCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              className="search-button"
              onClick={() => document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Search
            </button>
            {query && (
              <button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={15} />
              </button>
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
            <span>☰</span> All Departments
          </button>

          <div className="department-links">
            {departments.map((department) => (
              <button key={department.short} onClick={() => handleDepartment(department)}>
                <span>{department.emoji}</span>
                {department.short}
              </button>
            ))}
          </div>

          <div className="nav-help">
            <button onClick={() => jumpToProducts('All')}>🏷️ Offers</button>
            <a href={whatsapp} target="_blank" rel="noreferrer">❔ Help</a>
          </div>
        </nav>
      </header>

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="cart-drawer-head">
              <div>
                <span>Your cart</span>
                <strong>{cartCount} item{cartCount === 1 ? '' : 's'}</strong>
              </div>
              <button onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={20} /></button>
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
                    <span className="cart-line-emoji">{categoryEmoji(item.category)}</span>
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
                onClick={() => {
                  setMenuOpen(false)
                  handleDepartment(department)
                }}
              >
                <span>{department.emoji}</span>
                {department.short}
              </button>
            ))}
            <a href={whatsapp} target="_blank" rel="noreferrer" className="drawer-whatsapp">
              <MessageCircle size={18} /> Ask on WhatsApp
            </a>
          </aside>
        </div>
      )}

      <main>
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
                <span className="category-emoji">{department.emoji}</span>
                <div>
                  <strong>{department.short}</strong>
                </div>
              </button>
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

          {query && (
            <div className="search-chip">
              Search: <strong>{query}</strong>
              <button onClick={() => setQuery('')}>Clear</button>
            </div>
          )}

          <div className="emoji-product-grid">
            {visibleProducts.map((product) => (
              <article className="emoji-product-card" key={product.id}>
                <div className={`emoji-product-art art-${(product.category || 'other').toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                  <span className="product-emoji">{categoryEmoji(product.category)}</span>
                  {product.badge && <span className="product-badge">{product.badge}</span>}
                  <button
                    className={`save-button ${saved.includes(product.id) ? 'active' : ''}`}
                    onClick={() => toggleSaved(product.id)}
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
                          : 'Enquire for restock'}
                    </span>
                  </div>

                  <div className="product-card-actions">
                    <button onClick={() => addToCart(product)}>
                      <ShoppingCart size={14} /> Add to cart
                    </button>
                    <a href={waLink(product.name)} target="_blank" rel="noreferrer" aria-label={`Ask about ${product.name} on WhatsApp`}>
                      <MessageCircle size={15} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
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
          <a href="#products">Products</a>
          <a href="#wholesale">Wholesale</a>
          <a href="#contact">Contact</a>
        </div>
        <small>© 2026 Sancity Mall KE</small>
      </footer>

      <nav className="mobile-bottom-bar" aria-label="Mobile shopping navigation">
        <a href="#home"><span>🏠</span>Home</a>
        <a href="#categories"><span>🧺</span>Categories</a>
        <button onClick={focusSearch}><span>🔎</span>Search</button>
        <button onClick={openWishlist}><span>♡</span>Wishlist</button>
        <button onClick={() => setCartOpen(true)}><span>🛒</span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</button>
      </nav>
    </div>
  )
}
