import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BedDouble, Boxes, Heart, Home, MapPin, Menu, MessageCircle,
  Search, ShieldCheck, Sparkles, Store, UtensilsCrossed, X, Truck, PackageCheck
} from 'lucide-react'

const categories = [
  { name: 'Kitchen & Dining', image: '/products/dish-rack.webp', icon: UtensilsCrossed, className: 'cat-kitchen' },
  { name: 'Bedroom & Sleep', image: '/products/queen-air-mattress.webp', icon: BedDouble, className: 'cat-bedding' },
  { name: 'Storage & Organisation', image: '/products/portable-fabric-wardrobe.webp', icon: Boxes, className: 'cat-storage' },
  { name: 'Everyday Home Utility', image: '/products/foldable-laptop-table.webp', icon: Home, className: 'cat-utility' },
]

const products = [
  {
    id: 1,
    name: '2-Tier Dish Rack',
    category: 'Kitchen & Dining',
    badge: 'Fresh arrival',
    image: '/products/dish-rack.webp',
    description: 'A practical countertop rack for keeping plates, cups and cutlery organised.',
  },
  {
    id: 2,
    name: '18-Jar Rotating Spice Rack',
    category: 'Kitchen & Dining',
    badge: 'Kitchen pick',
    image: '/products/rotating-spice-rack.webp',
    description: 'Compact rotating spice storage designed to keep everyday seasonings within reach.',
  },
  {
    id: 3,
    name: 'Portable Fabric Wardrobe',
    category: 'Storage & Organisation',
    badge: 'Storage pick',
    image: '/products/portable-fabric-wardrobe.webp',
    description: 'Freestanding covered storage for clothes, shoes and everyday bedroom organisation.',
  },
  {
    id: 4,
    name: 'Foldable Laptop Table',
    category: 'Everyday Home Utility',
    badge: 'Useful find',
    image: '/products/foldable-laptop-table.webp',
    description: 'A compact folding table for laptop work, studying, meals or bedside use.',
  },
  {
    id: 5,
    name: 'Queen Air Mattress',
    category: 'Bedroom & Sleep',
    badge: 'Comfort pick',
    image: '/products/queen-air-mattress.webp',
    description: 'Portable inflatable sleeping solution for guests, travel and flexible home use.',
  },
]

function waLink(product) {
  const message = product
    ? `Hello Sancity Mall KE, I would like the current price and availability for ${product}.`
    : 'Hello Sancity Mall KE, I would like to enquire about your household products.'
  return `https://wa.me/254710900548?text=${encodeURIComponent(message)}`
}

// deployment-trigger: git-native-assets
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState([])
  const searchRef = useRef(null)

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((item) =>
      (item.name + ' ' + item.category + ' ' + item.description).toLowerCase().includes(q)
    )
  }, [query])

  const toggleSaved = (id) => {
    setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
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
          <a href="#categories">All categories</a>
          <a href="#products">Kitchen & dining</a>
          <a href="#products">Bedroom</a>
          <a href="#products">Storage</a>
          <a href="#products">Home utility</a>
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
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> Real Sancity stock • Nairobi</span>
            <h1>Useful home finds, ready to enquire.</h1>
            <p>
              Browse real products from Sancity Mall KE across kitchen, storage, bedroom and everyday home utility.
              Ask for today’s price and availability directly on WhatsApp.
            </p>
            <div className="hero-actions">
              <a href="#products" className="btn btn-primary">Shop fresh arrivals <ArrowRight size={18} /></a>
              <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-whatsapp">
                <MessageCircle size={18} /> Ask on WhatsApp
              </a>
            </div>
            <div className="hero-trust">
              <span><Store size={16} /> Nairobi CBD shop</span>
              <span><PackageCheck size={16} /> Retail & wholesale</span>
              <span><Truck size={16} /> Delivery enquiries</span>
            </div>
          </div>

          <div className="hero-gallery" aria-label="Sancity products">
            <a className="hero-photo hero-photo-main" href="#products">
              <img src="/products/dish-rack.webp" alt="Sancity two-tier dish rack" />
              <span><small>Kitchen find</small><strong>2-Tier Dish Rack</strong></span>
            </a>
            <a className="hero-photo" href="#products">
              <img src="/products/portable-fabric-wardrobe.webp" alt="Sancity portable fabric wardrobe" />
              <span><small>Storage</small><strong>Portable Wardrobe</strong></span>
            </a>
            <a className="hero-photo" href="#products">
              <img src="/products/rotating-spice-rack.webp" alt="Sancity rotating spice rack" />
              <span><small>Kitchen</small><strong>Spice Rack</strong></span>
            </a>
          </div>
        </section>

        <section className="service-strip">
          <div><ShieldCheck /><span><strong>Real product photos</strong><small>From the current Sancity image batch</small></span></div>
          <div><MessageCircle /><span><strong>Direct stock enquiries</strong><small>Ask for current price on WhatsApp</small></span></div>
          <div><Boxes /><span><strong>Retail & wholesale</strong><small>Separate bulk-order enquiries</small></span></div>
        </section>

        <section className="section" id="categories">
          <div className="section-title">
            <div><span className="section-kicker">Shop faster</span><h2>Browse the first product batch</h2></div>
            <a href="#products">See all arrivals <ArrowRight size={17} /></a>
          </div>

          <div className="category-grid real-category-grid">
            {categories.map(({ name, image, icon: Icon, className }) => (
              <a key={name} href="#products" className={'category-tile ' + className}>
                <div className="category-visual category-photo">
                  <img src={image} alt="" loading="lazy" />
                  <span className="category-icon"><Icon /></span>
                </div>
                <div className="category-label">
                  <strong>{name}</strong>
                  <span>Browse products <ArrowRight size={14} /></span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-title product-title">
            <div>
              <span className="section-kicker">Real products</span>
              <h2>Fresh arrivals at Sancity</h2>
              <p>
                These cards now use real Sancity product photography from the first WhatsApp batch.
                Prices remain enquiry-based until the catalogue prices are confirmed.
              </p>
            </div>
            <div className="batch-chip">Batch 01 • 5 featured items</div>
          </div>

          {query && (
            <div className="applied-filter">
              Search: <strong>{query}</strong> <button onClick={() => setQuery('')}>Clear</button>
            </div>
          )}

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
                    <strong>Price on request</strong>
                    <span>Confirm current stock & price</span>
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
            <div className="no-results">No products in this first batch match “{query}”.</div>
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
