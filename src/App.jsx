import { useMemo, useRef, useState } from 'react'
import {
  ArrowRight, BedDouble, Boxes, ChevronDown, Dumbbell, Heart, Home,
  MapPin, Menu, MessageCircle, Search, ShoppingBag, ShoppingCart,
  Sparkles, Store, UtensilsCrossed, X
} from 'lucide-react'

const categories = [
  { name: 'Kitchen & Dining', subtitle: 'Cookware, serveware, storage', art: 'kitchen', icon: UtensilsCrossed },
  { name: 'Bedroom', subtitle: 'Duvets, nets, comfort', art: 'bedroom', icon: BedDouble },
  { name: 'Family & Kids', subtitle: 'Useful everyday essentials', art: 'family', icon: Home },
  { name: 'Home Fitness', subtitle: 'Simple equipment for active homes', art: 'fitness', icon: Dumbbell },
]

const products = [
  { id: 1, name: 'Premium Duvet Set', category: 'Bedroom', badge: 'New', art: 'duvet' },
  { id: 2, name: 'Cookware Collection', category: 'Kitchen & Dining', badge: 'Popular', art: 'cookware' },
  { id: 3, name: 'Mosquito Net', category: 'Bedroom', badge: 'Essential', art: 'net' },
  { id: 4, name: 'Storage Organiser', category: 'Home Essentials', badge: 'Useful', art: 'storage' },
  { id: 5, name: 'Home Fitness Set', category: 'Home Fitness', badge: 'Trending', art: 'fitness' },
  { id: 6, name: 'Kids Home Essential', category: 'Family & Kids', badge: 'Family pick', art: 'kids' },
  { id: 7, name: 'Serveware Set', category: 'Kitchen & Dining', badge: 'New', art: 'serveware' },
  { id: 8, name: 'Bedroom Comfort Set', category: 'Bedroom', badge: 'Popular', art: 'comfort' },
]

function ProductArtwork({ type }) {
  return (
    <div className={'product-art product-art--' + type} aria-hidden="true">
      <span className="product-art__halo" />
      <span className="product-art__main" />
      <span className="product-art__detail" />
      <span className="product-art__line" />
    </div>
  )
}

function CollectionArtwork({ type, icon: Icon }) {
  return (
    <div className={'collection-art collection-art--' + type} aria-hidden="true">
      <span className="collection-art__shape collection-art__shape--one" />
      <span className="collection-art__shape collection-art__shape--two" />
      <span className="collection-art__shape collection-art__shape--three" />
      <Icon className="collection-art__icon" />
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState([])
  const searchRef = useRef(null)
  const whatsapp = 'https://wa.me/254710900548'

  const visibleProducts = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return products
    return products.filter((product) =>
      (product.name + ' ' + product.category).toLowerCase().includes(value),
    )
  }, [query])

  const toggleSaved = (id) => {
    setSaved((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  }

  return (
    <div className="site" id="top">
      <div className="announcement">
        <span>Retail & wholesale household essentials</span>
        <a href={whatsapp} target="_blank" rel="noreferrer">Order on WhatsApp</a>
      </div>

      <header className="header">
        <div className="header__main">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={21} />
          </button>

          <a className="brand" href="#top" aria-label="Sancity Mall KE home">
            <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
          </a>

          <nav className="main-nav desktop-only" aria-label="Main navigation">
            <a href="#shop">Shop <ChevronDown size={13} /></a>
            <a href="#collections">Collections</a>
            <a href="#new">New arrivals</a>
            <a href="#wholesale">Wholesale</a>
            <a href="#visit">Visit us</a>
          </nav>

          <div className="header__actions">
            <button className="icon-button desktop-only" onClick={() => searchRef.current?.focus()} aria-label="Search">
              <Search size={19} />
            </button>
            <button className="icon-button desktop-only" aria-label={saved.length + ' saved items'}>
              <Heart size={19} />
              {saved.length > 0 && <span className="icon-count">{saved.length}</span>}
            </button>
            <button className="icon-button" aria-label="Cart">
              <ShoppingBag size={19} />
            </button>
          </div>
        </div>

        <div className="search-shell">
          <label className="search-box">
            <Search size={18} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Sancity — duvets, kitchenware, home essentials..."
            />
            {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
          </label>
        </div>
      </header>

      {menuOpen && (
        <div className="drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="drawer__head">
              <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
            </div>
            <nav>
              <a href="#shop" onClick={() => setMenuOpen(false)}>Shop <ArrowRight size={18} /></a>
              <a href="#collections" onClick={() => setMenuOpen(false)}>Collections <ArrowRight size={18} /></a>
              <a href="#new" onClick={() => setMenuOpen(false)}>New arrivals <ArrowRight size={18} /></a>
              <a href="#wholesale" onClick={() => setMenuOpen(false)}>Wholesale <ArrowRight size={18} /></a>
              <a href="#visit" onClick={() => setMenuOpen(false)}>Visit us <ArrowRight size={18} /></a>
            </nav>
            <a className="drawer__whatsapp" href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
          </aside>
        </div>
      )}

      <main>
        <section className="hero">
          <div className="hero__visual" role="img" aria-label="Modern home interior illustration">
            <img src="/sancity-editorial-home.svg" alt="" />
            <div className="hero__overlay" />
          </div>
          <div className="hero__content">
            <span className="eyebrow">Curated for everyday living</span>
            <h1>Make home feel <em>more like you.</em></h1>
            <p>
              Thoughtful household finds for the bedroom, kitchen, family and everyday routines —
              with simple retail and wholesale ordering in Nairobi.
            </p>
            <div className="hero__actions">
              <a href="#shop" className="button button--dark">Shop the collection <ArrowRight size={17} /></a>
              <a href={whatsapp} target="_blank" rel="noreferrer" className="button button--light">
                WhatsApp order
              </a>
            </div>
          </div>
          <div className="hero__note">
            <span>01</span>
            <p>Home essentials, selected with purpose.</p>
          </div>
        </section>

        <section className="trust-bar" aria-label="Sancity shopping information">
          <div><Store size={18} /><span><strong>Nairobi CBD</strong><small>Visit our physical store</small></span></div>
          <div><MessageCircle size={18} /><span><strong>Easy ordering</strong><small>Fast WhatsApp enquiries</small></span></div>
          <div><Boxes size={18} /><span><strong>Retail + wholesale</strong><small>For homes and bulk buyers</small></span></div>
        </section>

        <section className="section collections" id="collections">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shop the home</span>
              <h2>Designed around how you live.</h2>
            </div>
            <p>Browse by room and need rather than scrolling through one long catalogue.</p>
          </div>

          <div className="collection-grid">
            {categories.map(({ name, subtitle, art, icon }) => (
              <a className="collection-card" href="#shop" key={name}>
                <CollectionArtwork type={art} icon={icon} />
                <div className="collection-card__copy">
                  <div>
                    <span>{subtitle}</span>
                    <h3>{name}</h3>
                  </div>
                  <span className="round-arrow"><ArrowRight size={17} /></span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="editorial-strip">
          <div className="editorial-strip__copy">
            <span className="eyebrow">Sancity edit</span>
            <h2>Useful things can still look considered.</h2>
            <p>
              The new Sancity storefront balances practical products with a calmer, more curated
              shopping experience — inspired by premium home retail without losing speed or affordability.
            </p>
            <a href="#new">Explore new arrivals <ArrowRight size={16} /></a>
          </div>
          <div className="editorial-strip__art" aria-hidden="true">
            <span className="editorial-orb editorial-orb--one" />
            <span className="editorial-orb editorial-orb--two" />
            <span className="editorial-line" />
            <Sparkles size={30} />
          </div>
        </section>

        <section className="section product-section" id="shop">
          <div className="section-heading section-heading--products">
            <div>
              <span className="eyebrow">Shop Sancity</span>
              <h2 id="new">New & noteworthy.</h2>
            </div>
            <div className="product-heading__right">
              <p>Preview cards until real product photography, prices and stock are imported.</p>
              <a href="#shop">View all <ArrowRight size={15} /></a>
            </div>
          </div>

          {query && (
            <div className="search-result-note">
              Showing results for <strong>“{query}”</strong>
              <button onClick={() => setQuery('')}>Clear</button>
            </div>
          )}

          <div className="product-grid">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-card__media">
                  <ProductArtwork type={product.art} />
                  <span className="product-badge">{product.badge}</span>
                  <button
                    className={'save-button ' + (saved.includes(product.id) ? 'is-saved' : '')}
                    onClick={() => toggleSaved(product.id)}
                    aria-label={'Save ' + product.name}
                  >
                    <Heart size={17} fill={saved.includes(product.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="product-card__copy">
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <div className="product-card__meta">
                    <strong>Price to be added</strong>
                    <a href={whatsapp} target="_blank" rel="noreferrer" aria-label={'Ask about ' + product.name}>
                      <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visibleProducts.length === 0 && (
            <div className="empty-state">No preview products match “{query}”.</div>
          )}
        </section>

        <section className="section room-story">
          <div className="room-story__visual" aria-hidden="true">
            <div className="room-scene">
              <span className="room-scene__wall-art" />
              <span className="room-scene__lamp" />
              <span className="room-scene__sofa" />
              <span className="room-scene__table" />
            </div>
          </div>
          <div className="room-story__copy">
            <span className="eyebrow">Shop by mood</span>
            <h2>Calm spaces. Practical choices.</h2>
            <p>
              Use editorial room stories to introduce several Sancity products together, just as premium
              home stores do — while each item still links directly into the catalogue.
            </p>
            <a href="#collections" className="text-link">Browse collections <ArrowRight size={16} /></a>
          </div>
        </section>

        <section className="section social-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">From social to store</span>
              <h2>See it. Like it. Shop it.</h2>
            </div>
            <p>Future Instagram and TikTok product content can feed directly into this section.</p>
          </div>

          <div className="social-grid">
            <div className="social-tile social-tile--one"><span>Kitchen finds</span></div>
            <div className="social-tile social-tile--two"><span>Bedroom edit</span></div>
            <div className="social-tile social-tile--three"><span>Home organisation</span></div>
          </div>
        </section>

        <section className="section wholesale-section" id="wholesale">
          <div className="wholesale-card">
            <div>
              <span className="eyebrow">Trade & wholesale</span>
              <h2>Buying for your shop, institution or business?</h2>
              <p>Keep bulk buying as a premium service path, separate from the main retail browsing experience.</p>
            </div>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="button button--cream">
              Request wholesale pricing <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section className="section visit-section" id="visit">
          <div className="visit-section__copy">
            <span className="eyebrow">Visit Sancity</span>
            <h2>Online convenience.<br />A real Nairobi store.</h2>
            <p>
              Public business listings place Sancity at RNG Plaza, 2nd Floor, Shop S27,
              Ronald Ngala Street, Nairobi CBD.
            </p>
          </div>
          <div className="visit-list">
            <a href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={20} />
              <span><small>WhatsApp / Call</small><strong>0710 900 548</strong></span>
              <ArrowRight size={17} />
            </a>
            <a href="mailto:Sancitymallke@gmail.com">
              <Store size={20} />
              <span><small>Email</small><strong>Sancitymallke@gmail.com</strong></span>
              <ArrowRight size={17} />
            </a>
            <div>
              <MapPin size={20} />
              <span><small>Store</small><strong>RNG Plaza, Ronald Ngala Street</strong></span>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__brand">
          <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
          <p>Household essentials, presented with more care.</p>
        </div>
        <div className="footer__links">
          <a href="#shop">Shop</a>
          <a href="#collections">Collections</a>
          <a href="#wholesale">Wholesale</a>
          <a href="#visit">Contact</a>
        </div>
        <small>© 2026 Sancity Mall KE. All rights reserved.</small>
      </footer>

      <nav className="mobile-tabbar mobile-only" aria-label="Mobile shopping navigation">
        <a href="#top"><Home size={19} /><span>Home</span></a>
        <a href="#collections"><Boxes size={19} /><span>Shop</span></a>
        <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => searchRef.current?.focus(), 350) }}>
          <Search size={19} /><span>Search</span>
        </button>
        <button><Heart size={19} /><span>Saved</span></button>
        <button><ShoppingCart size={19} /><span>Cart</span></button>
      </nav>
    </div>
  )
}
