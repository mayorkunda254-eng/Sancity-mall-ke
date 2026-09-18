import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BedDouble, Boxes, Heart, Home, MapPin, Menu, MessageCircle,
  Search, ShieldCheck, Sparkles, Store, UtensilsCrossed, X, Truck, PackageCheck
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

const categories = [
  { name: 'Kitchen & Dining', short: 'Kitchen', image: '/products/dish-rack.webp', icon: UtensilsCrossed, className: 'cat-kitchen' },
  { name: 'Bedroom & Sleep', short: 'Bedroom', image: '/products/queen-air-mattress.webp', icon: BedDouble, className: 'cat-bedding' },
  { name: 'Storage & Organisation', short: 'Storage', image: '/products/portable-fabric-wardrobe.webp', icon: Boxes, className: 'cat-storage' },
  { name: 'Everyday Home Utility', short: 'Home utility', image: '/products/foldable-laptop-table.webp', icon: Home, className: 'cat-utility' },
  { name: 'Kids & Baby', short: 'Kids & baby', image: '/products/queen-air-mattress.webp', icon: Heart, className: 'cat-kids' },
  { name: 'Mosquito Nets', short: 'Mosquito nets', image: '/products/portable-fabric-wardrobe.webp', icon: ShieldCheck, className: 'cat-nets' },
  { name: 'Home Fitness', short: 'Fitness', image: '/products/foldable-laptop-table.webp', icon: Sparkles, className: 'cat-fitness' },
  { name: 'Home Essentials', short: 'Essentials', image: '/products/rotating-spice-rack.webp', icon: Store, className: 'cat-essentials' },
]

const fallbackProducts = [
  {
    id: 1,
    name: '2-Tier Dish Rack',
    category: 'Kitchen & Dining',
    badge: 'Fresh arrival',
    image: '/products/dish-rack.webp',
    description: 'A practical countertop rack for keeping plates, cups and cutlery organised.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 2,
    name: '18-Jar Rotating Spice Rack',
    category: 'Kitchen & Dining',
    badge: 'Kitchen pick',
    image: '/products/rotating-spice-rack.webp',
    description: 'Compact rotating spice storage designed to keep everyday seasonings within reach.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 3,
    name: 'Portable Fabric Wardrobe',
    category: 'Storage & Organisation',
    badge: 'Storage pick',
    image: '/products/portable-fabric-wardrobe.webp',
    description: 'Freestanding covered storage for clothes, shoes and everyday bedroom organisation.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 4,
    name: 'Foldable Laptop Table',
    category: 'Everyday Home Utility',
    badge: 'Useful find',
    image: '/products/foldable-laptop-table.webp',
    description: 'A compact folding table for laptop work, studying, meals or bedside use.',
    price: null,
    stock_quantity: null,
  },
  {
    id: 5,
    name: 'Queen Air Mattress',
    category: 'Bedroom & Sleep',
    badge: 'Comfort pick',
    image: '/products/queen-air-mattress.webp',
    description: 'Portable inflatable sleeping solution for guests, travel and flexible home use.',
    price: null,
    stock_quantity: null,
  },
]

function waLink(product) {
  const message = product
    ? `Hello Sancity Mall KE, I would like the current price and availability for ${product}.`
    : 'Hello Sancity Mall KE, I would like to enquire about your household products.'
  return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
}

// deployment-trigger: git-native-assets-confirmed
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [saved, setSaved] = useState([])
  const [products, setProducts] = useState(fallbackProducts)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true

    async function loadPublishedProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,category,badge,description,price,stock_quantity,created_at,product_images(public_url,sort_order)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (!active || error || !data) return

      const dynamicProducts = data.map((product) => {
        const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)
        return {
          ...product,
          image: images[0]?.public_url || '/products/dish-rack.webp',
        }
      })

      const dynamicNames = new Set(dynamicProducts.map((product) => product.name.toLowerCase()))
      const staticProducts = fallbackProducts.filter((product) => !dynamicNames.has(product.name.toLowerCase()))
      setProducts([...dynamicProducts, ...staticProducts])
    }

    loadPublishedProducts()

    return () => {
      active = false
    }
  }, [])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((item) => {
      const categoryMatch = activeCategory === 'All' || item.category === activeCategory
      const searchMatch = !q || (item.name + ' ' + item.category + ' ' + item.description).toLowerCase().includes(q)
      return categoryMatch && searchMatch
    })
  }, [products, query, activeCategory])

  const toggleSaved = (id) => {
    setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  const jumpToProducts = (category = 'All') => {
    setActiveCategory(category)
    window.setTimeout(() => document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20)
  }

  const focusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    window.setTimeout(() => searchRef.current?.focus(), 250)
  }

  const whatsapp = waLink()

  return (
    <div className="app-shell" id="home">
      <div className="topbar">
        <span>Retail & wholesale household products</span>
        <span className="topbar-sep">•</span>
        <a href={whatsapp} target="_blank" rel="noreferrer">WhatsApp orders: 0710 900 548</a>
      </div>

      <header className="header">
        <div className="header-main">
          <a href="#home" className="logo-wrap" aria-label="Sancity Mall KE home">
            <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
          </a>

          <div className="location-chip desktop-flex">
            <MapPin size={17} />
            <span><small>Shop location</small>Ronald Ngala St, Nairobi</span>
          </div>

          <div className="header-actions">
            <button className="action-icon desktop-flex" aria-label={saved.length + ' saved products'}>
              <Heart size={20} />
              {saved.length > 0 && <b>{saved.length}</b>}
            </button>
            <a className="header-whatsapp desktop-flex" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={17} /> WhatsApp
            </a>
            <button className="menu-btn mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={23} />
            </button>
          </div>
        </div>

        <div className="search-row">
          <label className="search-field">
            <Search size={20} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dish racks, spice racks, wardrobes, laptop tables..."
              aria-label="Search Sancity products"
            />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={17} /></button>}
          </label>
          <button
            className="search-submit"
            onClick={() => document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Search
          </button>
        </div>

        <nav className="category-nav desktop-flex" aria-label="Product categories">
          <button className="nav-all" onClick={() => jumpToProducts('All')}><Boxes size={15} /> All departments</button>
          {categories.slice(0, 6).map((category) => (
            <button key={category.name} onClick={() => jumpToProducts(category.name)}>{category.short}</button>
          ))}
          <a href="#wholesale">Wholesale</a>
        </nav>
      </header>

      {menuOpen && (
        <div className="drawer-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top">
              <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
            </div>
            <a href="#categories" onClick={() => setMenuOpen(false)}>Shop categories <ArrowRight /></a>
            <a href="#products" onClick={() => setMenuOpen(false)}>Fresh arrivals <ArrowRight /></a>
            <a href="#wholesale" onClick={() => setMenuOpen(false)}>Wholesale <ArrowRight /></a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Visit & contact <ArrowRight /></a>
            <a className="drawer-whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={20} />
              <span>Ask about stock on WhatsApp</span>
            </a>
          </aside>
        </div>
      )}

      <main>
        <section className="hero hero-v4">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> Everyday home finds, made easier</span>
            <h1>Make home feel better without overthinking the shopping.</h1>
            <p>
              Discover useful household products for the kitchen, bedroom, storage and everyday living.
              Browse real Sancity stock, then confirm today’s price and availability directly on WhatsApp.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => jumpToProducts('All')}>Shop new arrivals <ArrowRight size={18} /></button>
              <a href="#categories" className="btn btn-secondary">Browse departments</a>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> Real product photos</span>
              <span><PackageCheck size={16} /> Retail & wholesale</span>
              <span><MapPin size={16} /> Nairobi CBD shop</span>
            </div>
          </div>

          <div className="hero-gallery hero-retail-grid" aria-label="Featured Sancity collections">
            <button className="hero-photo hero-photo-main hero-merch hero-merch-kitchen" onClick={() => jumpToProducts('Kitchen & Dining')}>
              <div className="hero-merch-copy"><small>Kitchen refresh</small><strong>Organise the everyday.</strong><span>Shop kitchen <ArrowRight size={14} /></span></div>
              <img src="/products/dish-rack.webp" alt="Sancity two-tier dish rack" />
            </button>
            <button className="hero-photo hero-merch hero-merch-storage" onClick={() => jumpToProducts('Storage & Organisation')}>
              <div className="hero-merch-copy"><small>Storage</small><strong>More room, less clutter.</strong><span>Explore <ArrowRight size={13} /></span></div>
              <img src="/products/portable-fabric-wardrobe.webp" alt="Sancity portable fabric wardrobe" />
            </button>
            <button className="hero-photo hero-merch hero-merch-utility" onClick={() => jumpToProducts('Everyday Home Utility')}>
              <div className="hero-merch-copy"><small>Small-space living</small><strong>Useful pieces that flex.</strong><span>Explore <ArrowRight size={13} /></span></div>
              <img src="/products/foldable-laptop-table.webp" alt="Sancity foldable laptop table" />
            </button>
          </div>
        </section>

        <section className="service-strip">
          <div><ShieldCheck /><span><strong>Real product photos</strong><small>From the current Sancity image batch</small></span></div>
          <div><MessageCircle /><span><strong>Direct stock enquiries</strong><small>Ask for current price on WhatsApp</small></span></div>
          <div><Boxes /><span><strong>Retail & wholesale</strong><small>Separate bulk-order enquiries</small></span></div>
        </section>

        <section className="section" id="categories">
          <div className="section-title">
            <div><span className="section-kicker">Shop by department</span><h2>Start with what your home needs.</h2></div>
            <button className="section-link" onClick={() => jumpToProducts('All')}>See all products <ArrowRight size={17} /></button>
          </div>

          <div className="category-grid real-category-grid">
            {categories.map(({ name, image, icon: Icon, className }) => (
              <button key={name} onClick={() => jumpToProducts(name)} className={'category-tile ' + className}>
                <div className="category-visual category-photo">
                  <img src={image} alt="" loading="lazy" />
                  <span className="category-icon"><Icon /></span>
                </div>
                <div className="category-label">
                  <strong>{name}</strong>
                  <span>Shop now <ArrowRight size={14} /></span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section editorial-grid" aria-label="Featured shopping ideas">
          <article className="editorial-card editorial-bedroom">
            <div><span>Bedroom comfort</span><h3>Make space for better rest.</h3><p>Flexible sleep and storage finds for everyday homes and guest spaces.</p><button onClick={() => jumpToProducts('Bedroom & Sleep')}>Shop bedroom <ArrowRight size={15} /></button></div>
            <img src="/products/queen-air-mattress.webp" alt="Queen air mattress" loading="lazy" />
          </article>
          <article className="editorial-card editorial-kitchen">
            <div><span>Kitchen essentials</span><h3>Small upgrades, calmer counters.</h3><button onClick={() => jumpToProducts('Kitchen & Dining')}>Shop kitchen <ArrowRight size={15} /></button></div>
            <img src="/products/rotating-spice-rack.webp" alt="Rotating spice rack" loading="lazy" />
          </article>
          <article className="editorial-card editorial-bulk">
            <div><span>For resellers & institutions</span><h3>Buying more than one?</h3><p>Send the item and quantity. We’ll confirm current bulk pricing and availability.</p><a href={waLink('a wholesale / bulk order')} target="_blank" rel="noreferrer">Wholesale pricing <ArrowRight size={15} /></a></div>
          </article>
        </section>

        <section className="section products-section" id="products">
          <div className="section-title product-title">
            <div>
              <span className="section-kicker">Shop Sancity</span>
              <h2>{activeCategory === 'All' ? 'Fresh home finds' : activeCategory}</h2>
              <p>{visibleProducts.length} product{visibleProducts.length === 1 ? '' : 's'} matching your current view. Use the department filters to shop faster.</p>
            </div>
            <div className="batch-chip">Batch 01 • 5 featured items</div>
          </div>

          {query && (
            <div className="applied-filter">
              Search: <strong>{query}</strong> <button onClick={() => setQuery('')}>Clear</button>
            </div>
          )}

          <div className="filter-scroll" aria-label="Filter products by department">
            <button className={activeCategory === 'All' ? 'active' : ''} onClick={() => setActiveCategory('All')}>All</button>
            {categories.map((category) => (
              <button key={category.name} className={activeCategory === category.name ? 'active' : ''} onClick={() => setActiveCategory(category.name)}>
                {category.short}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-media real-product-media">
                  <img src={product.image} alt={product.name} loading="lazy" />
                  <span className="badge">{product.badge}</span>
                  <button
                    className={'heart-btn ' + (saved.includes(product.id) ? 'active' : '')}
                    onClick={() => toggleSaved(product.id)}
                    aria-label={'Save ' + product.name}
                  >
                    <Heart size={18} fill={saved.includes(product.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="product-details">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="price-line">
                    <strong>{product.price !== null && product.price !== undefined ? `KSh ${Number(product.price).toLocaleString('en-KE')}` : 'Price on request'}</strong>
                    <span>{product.stock_quantity === null || product.stock_quantity === undefined ? 'Confirm current stock & price' : product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock / enquire'}</span>
                  </div>
                  <a
                    href={waLink(product.name)}
                    target="_blank"
                    rel="noreferrer"
                    className="product-cta"
                  >
                    Ask on WhatsApp <MessageCircle size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="no-results">No products match this view yet. <button onClick={() => { setQuery(''); setActiveCategory('All') }}>Show all products</button></div>
          )}
        </section>

        <section className="section needs-section">
          <div className="section-title">
            <div><span className="section-kicker">Quick shop</span><h2>Start with what you need at home</h2></div>
          </div>
          <div className="need-grid">
            <a href="#products" className="need-card need-kitchen">
              <span>Kitchen organisation</span><strong>Dish racks & spice storage</strong><ArrowRight />
            </a>
            <a href="#products" className="need-card need-home">
              <span>Bedroom & storage</span><strong>Wardrobes & guest comfort</strong><ArrowRight />
            </a>
            <a href="#products" className="need-card need-family">
              <span>Flexible home setup</span><strong>Useful compact furniture</strong><ArrowRight />
            </a>
          </div>
        </section>

        <section className="section" id="wholesale">
          <div className="wholesale">
            <div>
              <span className="section-kicker">Wholesale buyers</span>
              <h2>Buying for resale, business or an institution?</h2>
              <p>Send the product name and quantity you need. Sancity can reply with current bulk availability and pricing.</p>
            </div>
            <a
              href={waLink('a wholesale / bulk order')}
              target="_blank"
              rel="noreferrer"
              className="btn wholesale-btn"
            >
              Request wholesale pricing <ArrowRight size={18} />
            </a>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="contact-intro">
            <span className="section-kicker">Visit or contact</span>
            <h2>Shop in Nairobi CBD or enquire directly.</h2>
            <p>Current public business information places Sancity at RNG Plaza on Ronald Ngala Street, Nairobi.</p>
          </div>
          <div className="contact-cards">
            <a href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle /><span><small>WhatsApp / Call</small><strong>0710 900 548</strong></span><ArrowRight />
            </a>
            <a href="mailto:Sancitymallke@gmail.com">
              <Store /><span><small>Email</small><strong>Sancitymallke@gmail.com</strong></span><ArrowRight />
            </a>
            <div><MapPin /><span><small>Store</small><strong>RNG Plaza, Ronald Ngala St</strong></span></div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
          <p>Practical household products for retail and wholesale shoppers in Nairobi.</p>
        </div>
        <div className="footer-nav">
          <a href="#categories">Categories</a>
          <a href="#products">Products</a>
          <a href="#wholesale">Wholesale</a>
          <a href="#contact">Contact</a>
        </div>
        <small>© 2026 Sancity Mall KE</small>
      </footer>

      <nav className="mobile-bottom-nav mobile-only" aria-label="Mobile shopping navigation">
        <a href="#home"><Home size={20} /><span>Home</span></a>
        <a href="#categories"><Boxes size={20} /><span>Categories</span></a>
        <button onClick={focusSearch}><Search size={21} /><span>Search</span></button>
        <button onClick={() => document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' })}>
          <Heart size={20} /><span>Saved{saved.length ? ' ' + saved.length : ''}</span>
        </button>
        <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={20} /><span>WhatsApp</span></a>
      </nav>
    </div>
  )
}
