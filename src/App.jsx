import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight, Baby, BedDouble, Boxes, Dumbbell, Heart, Home, MapPin,
  Menu, MessageCircle, Search, ShoppingCart, SlidersHorizontal, Sparkles,
  Store, UtensilsCrossed, X, ShieldCheck, Truck, PackageCheck
} from 'lucide-react'

const categories = [
  { name: 'Kitchenware', icon: UtensilsCrossed, className: 'cat-kitchen' },
  { name: 'Bedding & Duvets', icon: BedDouble, className: 'cat-bedding' },
  { name: 'Mosquito Nets', icon: ShieldCheck, className: 'cat-nets' },
  { name: 'Kids & Baby', icon: Baby, className: 'cat-kids' },
  { name: 'Home Fitness', icon: Dumbbell, className: 'cat-fitness' },
  { name: 'Storage & Home', icon: Boxes, className: 'cat-storage' },
]

const products = [
  { id: 1, name: 'Duvet & Bedding Set', category: 'Bedding & Duvets', badge: 'Popular', media: 'media-duvet' },
  { id: 2, name: 'Kitchenware Set', category: 'Kitchenware', badge: 'New', media: 'media-kitchen' },
  { id: 3, name: 'Mosquito Net', category: 'Mosquito Nets', badge: 'Essential', media: 'media-net' },
  { id: 4, name: 'Home Fitness Set', category: 'Home Fitness', badge: 'Trending', media: 'media-fitness' },
  { id: 5, name: 'Kids Home Essential', category: 'Kids & Baby', badge: 'Family pick', media: 'media-kids' },
  { id: 6, name: 'Storage Organiser', category: 'Storage & Home', badge: 'Useful', media: 'media-storage' },
  { id: 7, name: 'Cook & Serve Set', category: 'Kitchenware', badge: 'Popular', media: 'media-serve' },
  { id: 8, name: 'Bedroom Comfort Set', category: 'Bedding & Duvets', badge: 'New', media: 'media-comfort' },
]

function ProductArt({ kind }) {
  return (
    <div className={'product-art ' + kind} aria-hidden="true">
      <span className="art-back" />
      <span className="art-main" />
      <span className="art-small" />
      <span className="art-line" />
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState([])
  const searchRef = useRef(null)

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((item) => (item.name + ' ' + item.category).toLowerCase().includes(q))
  }, [query])

  const toggleSaved = (id) => {
    setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  const focusSearch = () => {
    searchRef.current?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const whatsapp = 'https://wa.me/254710900548'

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

          <button className="location-chip desktop-flex" type="button">
            <MapPin size={17} />
            <span><small>Shop location</small>Ronald Ngala St, Nairobi</span>
          </button>

          <div className="header-actions">
            <button className="action-icon desktop-flex" aria-label="Saved items">
              <Heart size={20} />
              {saved.length > 0 && <b>{saved.length}</b>}
            </button>
            <button className="action-icon desktop-flex" aria-label="Shopping cart">
              <ShoppingCart size={20} />
            </button>
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
              placeholder="Search duvets, kitchenware, mosquito nets, home gym..."
              aria-label="Search Sancity products"
            />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={17} /></button>}
          </label>
          <button className="search-submit" onClick={() => document.querySelector('#products')?.scrollIntoView({behavior:'smooth'})}>
            Search
          </button>
        </div>

        <nav className="category-nav desktop-flex" aria-label="Product categories">
          <a href="#categories">All categories</a>
          <a href="#products">Kitchenware</a>
          <a href="#products">Bedding</a>
          <a href="#products">Mosquito nets</a>
          <a href="#products">Kids</a>
          <a href="#products">Home fitness</a>
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
            <a href="#products" onClick={() => setMenuOpen(false)}>New & popular <ArrowRight /></a>
            <a href="#wholesale" onClick={() => setMenuOpen(false)}>Wholesale <ArrowRight /></a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Visit & contact <ArrowRight /></a>
            <div className="drawer-card">
              <MapPin size={20} />
              <span>RNG Plaza, Ronald Ngala Street<br />Nairobi CBD</span>
            </div>
          </aside>
        </div>
      )}

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> Nairobi home & lifestyle store</span>
            <h1>Household essentials that are easy to find.</h1>
            <p>Shop practical home products across bedding, kitchenware, mosquito nets, kids’ items and home fitness — retail or wholesale.</p>
            <div className="hero-actions">
              <a href="#categories" className="btn btn-primary">Shop categories <ArrowRight size={18} /></a>
              <a href={whatsapp} target="_blank" rel="noreferrer" className="btn btn-secondary"><MessageCircle size={18} /> Order on WhatsApp</a>
            </div>
            <div className="hero-trust">
              <span><Store size={16} /> Nairobi CBD shop</span>
              <span><PackageCheck size={16} /> Retail & wholesale</span>
              <span><Truck size={16} /> Delivery enquiries</span>
            </div>
          </div>

          <div className="hero-merch" aria-label="Sancity shopping categories">
            <div className="merch-big merch-card">
              <span>Bedding</span>
              <BedDouble size={58} />
              <small>Duvets & bedroom essentials</small>
            </div>
            <div className="merch-small merch-card kitchen-card">
              <UtensilsCrossed size={34} />
              <span>Kitchenware</span>
            </div>
            <div className="merch-small merch-card fitness-card">
              <Dumbbell size={34} />
              <span>Home gym</span>
            </div>
          </div>
        </section>

        <section className="service-strip">
          <div><ShieldCheck /><span><strong>Buy with clarity</strong><small>Clear product information</small></span></div>
          <div><MessageCircle /><span><strong>WhatsApp ordering</strong><small>Quick stock enquiries</small></span></div>
          <div><Boxes /><span><strong>Wholesale available</strong><small>Bulk-order support</small></span></div>
        </section>

        <section className="section" id="categories">
          <div className="section-title">
            <div><span className="section-kicker">Shop faster</span><h2>Popular categories</h2></div>
            <a href="#products">View products <ArrowRight size={17} /></a>
          </div>
          <div className="category-grid">
            {categories.map(({ name, icon: Icon, className }) => (
              <a key={name} href="#products" className={'category-tile ' + className}>
                <div className="category-visual"><Icon /></div>
                <div className="category-label">
                  <strong>{name}</strong>
                  <span>Shop now <ArrowRight size={14} /></span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-title product-title">
            <div>
              <span className="section-kicker">Catalogue preview</span>
              <h2>New & popular at Sancity</h2>
              <p>Real product photos, stock and verified KSh prices will replace these preview cards as the catalogue is imported.</p>
            </div>
            <div className="listing-tools">
              <button><SlidersHorizontal size={17} /> Filter</button>
              <select aria-label="Sort products" defaultValue="popular">
                <option value="popular">Popular</option>
                <option value="new">Newest</option>
              </select>
            </div>
          </div>

          {query && <div className="applied-filter">Search: <strong>{query}</strong> <button onClick={() => setQuery('')}>Clear</button></div>}

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-media">
                  <ProductArt kind={product.media} />
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
                  <div className="price-line">
                    <strong>Price to be added</strong>
                    <span>Catalogue pending</span>
                  </div>
                  <a href={whatsapp} target="_blank" rel="noreferrer" className="product-cta">
                    Ask on WhatsApp <MessageCircle size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>

          {visibleProducts.length === 0 && <div className="no-results">No preview products match “{query}”.</div>}
        </section>

        <section className="section needs-section">
          <div className="section-title">
            <div><span className="section-kicker">Browse by need</span><h2>What are you shopping for?</h2></div>
          </div>
          <div className="need-grid">
            <a href="#products" className="need-card need-home"><span>Refresh the bedroom</span><strong>Duvets, nets & comfort</strong><ArrowRight /></a>
            <a href="#products" className="need-card need-kitchen"><span>Upgrade the kitchen</span><strong>Cook, serve & store</strong><ArrowRight /></a>
            <a href="#products" className="need-card need-family"><span>Family essentials</span><strong>Useful kids & home finds</strong><ArrowRight /></a>
          </div>
        </section>

        <section className="section" id="wholesale">
          <div className="wholesale">
            <div>
              <span className="section-kicker">Wholesale buyers</span>
              <h2>Buying for resale, business or an institution?</h2>
              <p>Use a separate wholesale path for quantity enquiries instead of mixing bulk terms into every retail product card.</p>
            </div>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="btn wholesale-btn">Request wholesale pricing <ArrowRight size={18} /></a>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="contact-intro">
            <span className="section-kicker">Visit or contact</span>
            <h2>Shop in Nairobi CBD or order directly.</h2>
            <p>Public business listings place Sancity at RNG Plaza, 2nd Floor, Shop S27 on Ronald Ngala Street, opposite Naivas.</p>
          </div>
          <div className="contact-cards">
            <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle /><span><small>WhatsApp / Call</small><strong>0710 900 548</strong></span><ArrowRight /></a>
            <a href="mailto:Sancitymallke@gmail.com"><Store /><span><small>Email</small><strong>Sancitymallke@gmail.com</strong></span><ArrowRight /></a>
            <div><MapPin /><span><small>Store</small><strong>RNG Plaza, Ronald Ngala St</strong></span></div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><img src="/sancity-logo.svg" alt="Sancity Mall KE" /><p>Household essentials for retail and wholesale shoppers in Nairobi.</p></div>
        <div className="footer-nav"><a href="#categories">Categories</a><a href="#products">Products</a><a href="#wholesale">Wholesale</a><a href="#contact">Contact</a></div>
        <small>© 2026 Sancity Mall KE</small>
      </footer>

      <nav className="mobile-bottom-nav mobile-only" aria-label="Mobile shopping navigation">
        <a href="#home"><Home size={20} /><span>Home</span></a>
        <a href="#categories"><Boxes size={20} /><span>Categories</span></a>
        <button onClick={focusSearch}><Search size={21} /><span>Search</span></button>
        <button><Heart size={20} /><span>Saved{saved.length ? ' ' + saved.length : ''}</span></button>
        <button><ShoppingCart size={20} /><span>Cart</span></button>
      </nav>
    </div>
  )
}
