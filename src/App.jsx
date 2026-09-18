import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgePercent,
  Baby,
  BedDouble,
  Boxes,
  Dumbbell,
  Heart,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react'

const categories = [
  { name: 'Kitchenware', caption: 'Cookware, serveware and daily essentials', icon: UtensilsCrossed, tone: 'sand' },
  { name: 'Bedding', caption: 'Duvets, sheets and bedroom comfort', icon: BedDouble, tone: 'clay' },
  { name: 'Kids', caption: 'Useful finds for growing families', icon: Baby, tone: 'cream' },
  { name: 'Home Fitness', caption: 'Simple equipment for active homes', icon: Dumbbell, tone: 'charcoal' },
  { name: 'Home Essentials', caption: 'Storage, organisers and practical buys', icon: Boxes, tone: 'sage' },
]

const products = [
  { id: 1, name: 'Premium Duvet Set', category: 'Bedding', badge: 'New', visual: 'duvet' },
  { id: 2, name: 'Non-Stick Cookware Set', category: 'Kitchenware', badge: 'Popular', visual: 'cookware' },
  { id: 3, name: 'Multi-Purpose Storage Rack', category: 'Home Essentials', badge: 'Value', visual: 'rack' },
  { id: 4, name: 'Compact Home Fitness Set', category: 'Home Fitness', badge: 'Trending', visual: 'fitness' },
]

function ProductVisual({ type }) {
  return (
    <div className={'product-visual product-visual--' + type} aria-hidden="true">
      <span className="visual-orbit" />
      <span className="visual-shape visual-shape-a" />
      <span className="visual-shape visual-shape-b" />
      <span className="visual-shape visual-shape-c" />
    </div>
  )
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState([])

  const filtered = useMemo(() => {
    if (!query.trim()) return products
    const q = query.toLowerCase()
    return products.filter((product) =>
      (product.name + ' ' + product.category).toLowerCase().includes(q),
    )
  }, [query])

  function toggleSaved(id) {
    setSaved((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="site-shell">
      <div className="announcement">
        <span>Retail & wholesale household essentials</span>
        <span className="announcement-dot" />
        <span>Nairobi, Kenya</span>
      </div>

      <header className="site-header">
        <a href="#top" className="brand" aria-label="Sancity Mall KE home">
          <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#shop">Shop</a>
          <a href="#categories">Categories</a>
          <a href="#wholesale">Wholesale</a>
          <a href="#about">About</a>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button desktop-only"
            aria-label="Search products"
            onClick={() => document.querySelector('#shop-search')?.focus()}
          >
            <Search size={19} />
          </button>
          <button className="icon-button desktop-only saved-button" aria-label={saved.length + ' saved products'}>
            <Heart size={19} />
            <span>{saved.length}</span>
          </button>
          <a href="#shop" className="shop-button desktop-only">
            <ShoppingBag size={18} /> Shop now
          </a>
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="drawer-close" onClick={closeMenu} aria-label="Close navigation">
            <X />
          </button>
          <img src="/sancity-logo.svg" alt="Sancity Mall KE" className="drawer-logo" />
          <a href="#shop" onClick={closeMenu}>Shop <ArrowRight size={18} /></a>
          <a href="#categories" onClick={closeMenu}>Categories <ArrowRight size={18} /></a>
          <a href="#wholesale" onClick={closeMenu}>Wholesale <ArrowRight size={18} /></a>
          <a href="#about" onClick={closeMenu}>About <ArrowRight size={18} /></a>
        </div>
      )}

      <main id="top">
        <section className="hero section-pad">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Home, made simpler</div>
            <h1>Everyday home finds.<br /><span>One easy shop.</span></h1>
            <p>
              Discover practical, stylish household essentials for your kitchen, bedroom,
              family and active lifestyle — with a quick path from browsing to ordering.
            </p>
            <div className="hero-actions">
              <a className="primary-cta" href="#shop">Explore products <ArrowRight size={18} /></a>
              <a className="secondary-cta" href="#contact"><MessageCircle size={18} /> Order on WhatsApp</a>
            </div>
            <div className="trust-row">
              <span><Store size={17} /> Nairobi retail</span>
              <span><BadgePercent size={17} /> Wholesale enquiries</span>
              <span><PackageCheck size={17} /> Product support</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Sancity home and lifestyle shopping visual">
            <div className="hero-card hero-card-main">
              <span className="hero-kicker">Sancity picks</span>
              <strong>Useful products<br />for real homes.</strong>
              <div className="hero-bag"><ShoppingBag size={42} /></div>
            </div>
            <div className="hero-card hero-card-small top-card"><UtensilsCrossed /><span>Kitchen</span></div>
            <div className="hero-card hero-card-small bottom-card"><BedDouble /><span>Comfort</span></div>
            <div className="hero-stamp"><span>KE</span><small>SHOP LOCAL</small></div>
          </div>
        </section>

        <section className="value-strip" aria-label="Shopping benefits">
          <div><Truck /><span><strong>Convenient ordering</strong><small>Simple enquiry-to-delivery flow</small></span></div>
          <div><ShieldCheck /><span><strong>Clear product details</strong><small>Know what you are buying</small></span></div>
          <div><MessageCircle /><span><strong>WhatsApp support</strong><small>Fast help before you order</small></span></div>
        </section>

        <section id="categories" className="section-pad category-section">
          <div className="section-heading">
            <div>
              <span className="kicker">Browse faster</span>
              <h2>Shop by category</h2>
            </div>
            <a href="#shop">See all products <ArrowRight size={17} /></a>
          </div>

          <div className="category-grid">
            {categories.map(({ name, caption, icon: Icon, tone }) => (
              <a href="#shop" className={'category-card tone-' + tone} key={name}>
                <span className="category-icon"><Icon /></span>
                <div><h3>{name}</h3><p>{caption}</p></div>
                <span className="category-arrow"><ArrowRight /></span>
              </a>
            ))}
          </div>
        </section>

        <section id="shop" className="section-pad product-section">
          <div className="section-heading shop-heading">
            <div>
              <span className="kicker">Start shopping</span>
              <h2>Featured products</h2>
              <p>Real product photos, prices and stock will plug into this layout as the catalogue is added.</p>
            </div>
            <label className="search-box" htmlFor="shop-search">
              <Search size={18} />
              <input
                id="shop-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
              />
            </label>
          </div>

          <div className="product-grid">
            {filtered.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <ProductVisual type={product.visual} />
                  <span className="product-badge">{product.badge}</span>
                  <button
                    className={'save-product ' + (saved.includes(product.id) ? 'is-saved' : '')}
                    onClick={() => toggleSaved(product.id)}
                    aria-label={'Save ' + product.name}
                  >
                    <Heart size={18} fill={saved.includes(product.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="product-info">
                  <span className="product-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <div className="product-bottom">
                    <strong>Price on request</strong>
                    <a href="#contact" aria-label={'Enquire about ' + product.name}><ArrowRight size={16} /></a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">No matching products yet. Try another search.</div>
          )}
        </section>

        <section id="wholesale" className="section-pad wholesale-section">
          <div className="wholesale-panel">
            <div className="wholesale-icon"><Boxes size={32} /></div>
            <div className="wholesale-copy">
              <span className="kicker">Buy in quantity</span>
              <h2>Wholesale made straightforward.</h2>
              <p>
                Sancity can use this section for reseller, institution and bulk-order enquiries.
                Minimum quantities and verified wholesale terms will be added once confirmed.
              </p>
            </div>
            <a className="primary-cta light-cta" href="#contact">Request wholesale price <ArrowRight size={18} /></a>
          </div>
        </section>

        <section id="about" className="section-pad about-section">
          <div className="about-card about-main">
            <span className="kicker">Built around everyday value</span>
            <h2>A cleaner way to discover Sancity.</h2>
            <p>
              This first version gives Sancity Mall KE a focused digital storefront: clear categories,
              quick product discovery and direct customer contact without overwhelming mobile shoppers.
            </p>
          </div>
          <div className="about-card mini-card">
            <Store />
            <strong>Retail + wholesale</strong>
            <span>One storefront that can support individual shoppers and bulk buyers.</span>
          </div>
          <div className="about-card mini-card">
            <MessageCircle />
            <strong>Conversation-led sales</strong>
            <span>WhatsApp will become the fastest route from product interest to an order.</span>
          </div>
        </section>

        <section id="contact" className="section-pad contact-section">
          <div className="contact-copy">
            <span className="kicker">Contact Sancity</span>
            <h2>Ready to order or ask about stock?</h2>
            <p>
              The official WhatsApp number, confirmed store address and business hours will be added
              here before launch. Email enquiries can already use the address below.
            </p>
          </div>

          <div className="contact-grid">
            <a href="mailto:Sancitymallke@gmail.com">
              <Mail />
              <span><small>Email</small>Sancitymallke@gmail.com</span>
              <ArrowRight />
            </a>
            <div className="contact-placeholder">
              <MessageCircle />
              <span><small>WhatsApp</small>Number to be confirmed</span>
            </div>
            <div className="contact-placeholder">
              <MapPin />
              <span><small>Store location</small>Exact address to be confirmed</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-main">
          <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
          <p>Household essentials, lifestyle products, retail and wholesale enquiries in Kenya.</p>
        </div>
        <div className="footer-links">
          <a href="#shop">Shop</a>
          <a href="#categories">Categories</a>
          <a href="#wholesale">Wholesale</a>
          <a href="mailto:Sancitymallke@gmail.com">Email</a>
        </div>
        <small>© 2026 Sancity Mall KE. All rights reserved.</small>
      </footer>

      <a className="floating-whatsapp" href="#contact" aria-label="Contact Sancity on WhatsApp">
        <MessageCircle size={22} /><span>WhatsApp</span>
      </a>
    </div>
  )
}
