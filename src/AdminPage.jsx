import { useEffect, useMemo, useState } from 'react'
import {
  Boxes, CheckCircle2, ChevronRight, ImagePlus, Loader2, LogOut, PackagePlus,
  RefreshCw, Search, ShieldCheck, Store, Trash2, UploadCloud, XCircle
} from 'lucide-react'
import { isSupabaseConfigured, PRODUCT_IMAGE_BUCKET, supabase } from './lib/supabase.js'
import './admin.css'

const categoryOptions = [
  'Kitchen & Dining',
  'Bedroom & Sleep',
  'Storage & Organisation',
  'Everyday Home Utility',
  'Kids & Baby',
  'Mosquito Nets',
  'Home Fitness',
  'Home Essentials',
  'Other',
]

const emptyForm = {
  name: '',
  category: 'Kitchen & Dining',
  description: '',
  price: '',
  compare_at_price: '',
  stock_quantity: '0',
  badge: '',
  status: 'published',
}

const money = (value) =>
  value === null || value === undefined || value === ''
    ? 'Price on request'
    : `KSh ${Number(value).toLocaleString('en-KE')}`

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const safeFileName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/-+/g, '-')

export default function AdminPage() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [files, setFiles] = useState([])
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false)
      return
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setAuthLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session) loadProducts()
  }, [session])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) =>
      [product.name, product.category, product.status].join(' ').toLowerCase().includes(q)
    )
  }, [products, query])

  async function login(event) {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      setAuthLoading(false)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function loadProducts() {
    setListLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('id,name,category,description,price,compare_at_price,stock_quantity,badge,status,created_at,product_images(id,public_url,storage_path,sort_order)')
      .order('created_at', { ascending: false })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setProducts(data || [])
    }
    setListLoading(false)
  }

  function onFileChange(event) {
    const picked = Array.from(event.target.files || []).slice(0, 6)
    const invalid = picked.find((file) => !file.type.startsWith('image/'))
    if (invalid) {
      setNotice({ type: 'error', text: 'Please select image files only.' })
      return
    }
    setFiles(picked)
  }

  async function createProduct(event) {
    event.preventDefault()
    setNotice(null)

    if (!form.name.trim() || !form.category) {
      setNotice({ type: 'error', text: 'Product name and category are required.' })
      return
    }

    if (files.length === 0) {
      setNotice({ type: 'error', text: 'Add at least one product image.' })
      return
    }

    setSubmitting(true)
    let createdProduct = null

    try {
      const payload = {
        name: form.name.trim(),
        slug: slugify(form.name),
        category: form.category,
        description: form.description.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        compare_at_price: form.compare_at_price === '' ? null : Number(form.compare_at_price),
        stock_quantity: Number(form.stock_quantity || 0),
        badge: form.badge.trim() || null,
        status: form.status,
      }

      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error
      createdProduct = data

      const imageRows = []

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const path = `${data.id}/${Date.now()}-${index}-${safeFileName(file.name)}`

        const { error: uploadError } = await supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(path, file, {
            cacheControl: '31536000',
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .getPublicUrl(path)

        imageRows.push({
          product_id: data.id,
          storage_path: path,
          public_url: publicData.publicUrl,
          sort_order: index,
        })
      }

      const { error: imageError } = await supabase.from('product_images').insert(imageRows)
      if (imageError) throw imageError

      setForm(emptyForm)
      setFiles([])
      const input = document.getElementById('product-images')
      if (input) input.value = ''
      setNotice({ type: 'success', text: `${payload.name} was ${payload.status === 'published' ? 'published' : 'saved as a draft'}.` })
      await loadProducts()
    } catch (error) {
      if (createdProduct?.id) {
        await supabase.from('products').delete().eq('id', createdProduct.id)
      }
      setNotice({ type: 'error', text: error.message || 'Product upload failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleStatus(product) {
    const nextStatus = product.status === 'published' ? 'draft' : 'published'
    const { error } = await supabase
      .from('products')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', product.id)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setProducts((items) =>
        items.map((item) => item.id === product.id ? { ...item, status: nextStatus } : item)
      )
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return

    const paths = (product.product_images || []).map((image) => image.storage_path).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths)
    }

    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      setNotice({ type: 'error', text: error.message })
      return
    }

    setProducts((items) => items.filter((item) => item.id !== product.id))
    setNotice({ type: 'success', text: `${product.name} was deleted.` })
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="admin-setup-screen">
        <div className="admin-setup-card">
          <img src="/sancity-logo.svg" alt="Sancity Mall KE" />
          <span className="admin-kicker"><ShieldCheck size={15} /> Admin setup required</span>
          <h1>The admin interface is ready for its Sancity backend.</h1>
          <p>Add the Sancity Supabase URL and publishable key to Vercel to activate secure login, product uploads and image storage.</p>
          <a href="/" className="admin-secondary-btn">Back to storefront <ChevronRight size={16} /></a>
        </div>
      </div>
    )
  }

  if (authLoading) {
    return <div className="admin-loading"><Loader2 className="spin" /> Loading admin…</div>
  }

  if (!session) {
    return (
      <div className="admin-login-shell">
        <section className="admin-login-panel">
          <a href="/" className="admin-logo"><img src="/sancity-logo.svg" alt="Sancity Mall KE" /></a>
          <span className="admin-kicker"><ShieldCheck size={15} /> Secure staff access</span>
          <h1>Manage the Sancity catalogue.</h1>
          <p>Upload products, set prices and stock, then publish them directly to the storefront.</p>
          <form onSubmit={login} className="admin-login-form">
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
            <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
            {authError && <div className="admin-alert error"><XCircle size={17} /> {authError}</div>}
            <button className="admin-primary-btn" disabled={authLoading}>
              {authLoading ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
              Sign in
            </button>
          </form>
          <a href="/" className="admin-back-link">← Back to Sancity Mall</a>
        </section>
        <aside className="admin-login-art">
          <div><PackagePlus /><strong>Fast catalogue updates</strong><span>Add stock without touching website code.</span></div>
          <div><UploadCloud /><strong>Real product photography</strong><span>Upload up to six images per item.</span></div>
          <div><Store /><strong>Publish when ready</strong><span>Use drafts for incomplete products.</span></div>
        </aside>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="admin-logo"><img src="/sancity-logo.svg" alt="Sancity Mall KE" /></a>
        <div className="admin-header-actions">
          <a href="/" target="_blank" rel="noreferrer" className="admin-secondary-btn"><Store size={16} /> View store</a>
          <button onClick={logout} className="admin-icon-btn" title="Sign out"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-page-title">
          <div>
            <span className="admin-kicker"><Boxes size={15} /> Catalogue manager</span>
            <h1>Products</h1>
            <p>Add a new item and publish it to the Sancity storefront.</p>
          </div>
          <button onClick={loadProducts} className="admin-secondary-btn" disabled={listLoading}>
            <RefreshCw size={16} className={listLoading ? 'spin' : ''} /> Refresh
          </button>
        </section>

        {notice && (
          <div className={`admin-alert ${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {notice.text}
          </div>
        )}

        <div className="admin-grid">
          <section className="admin-card upload-card">
            <div className="admin-card-heading">
              <span className="admin-step">01</span>
              <div><h2>Add product</h2><p>Product details shown to customers.</p></div>
            </div>

            <form onSubmit={createProduct} className="product-upload-form">
              <label className="admin-field full">
                <span>Product name *</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 3-Tier Dish Rack" />
              </label>

              <label className="admin-field">
                <span>Category *</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categoryOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>

              <label className="admin-field">
                <span>Badge</span>
                <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="New arrival" />
              </label>

              <label className="admin-field">
                <span>Price (KSh)</span>
                <input type="number" min="0" step="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Leave blank for enquiry" />
              </label>

              <label className="admin-field">
                <span>Old / compare price</span>
                <input type="number" min="0" step="1" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} placeholder="Optional" />
              </label>

              <label className="admin-field">
                <span>Stock quantity</span>
                <input type="number" min="0" step="1" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
              </label>

              <label className="admin-field">
                <span>Publish status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="published">Publish immediately</option>
                  <option value="draft">Save as draft</option>
                </select>
              </label>

              <label className="admin-field full">
                <span>Description</span>
                <textarea rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is useful about this product? Include size, material or key features where known." />
              </label>

              <div className="admin-field full">
                <span>Product images * <small>Up to 6 images</small></span>
                <label className="image-dropzone" htmlFor="product-images">
                  <ImagePlus />
                  <strong>Choose product photos</strong>
                  <small>JPG, PNG, WebP or AVIF. First image becomes the main storefront image.</small>
                  <input id="product-images" type="file" accept="image/*" multiple onChange={onFileChange} />
                </label>
                {files.length > 0 && (
                  <div className="image-preview-grid">
                    {files.map((file, index) => (
                      <figure key={file.name + index}>
                        <img src={URL.createObjectURL(file)} alt="" />
                        <figcaption>{index === 0 ? 'Main image' : `Image ${index + 1}`}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>

              <button className="admin-primary-btn full" disabled={submitting}>
                {submitting ? <Loader2 className="spin" size={18} /> : <UploadCloud size={18} />}
                {submitting ? 'Uploading product…' : form.status === 'published' ? 'Upload & publish product' : 'Upload as draft'}
              </button>
            </form>
          </section>

          <section className="admin-card catalogue-card">
            <div className="admin-card-heading catalogue-heading">
              <span className="admin-step">02</span>
              <div><h2>Catalogue</h2><p>{products.length} uploaded product{products.length === 1 ? '' : 's'}.</p></div>
            </div>

            <label className="admin-search">
              <Search size={17} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search uploaded products" />
            </label>

            <div className="admin-product-list">
              {listLoading ? (
                <div className="admin-empty"><Loader2 className="spin" /> Loading products…</div>
              ) : filteredProducts.length === 0 ? (
                <div className="admin-empty"><PackagePlus /> No uploaded products yet.</div>
              ) : filteredProducts.map((product) => {
                const images = [...(product.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)
                return (
                  <article className="admin-product-row" key={product.id}>
                    <div className="admin-product-thumb">
                      {images[0]?.public_url ? <img src={images[0].public_url} alt="" /> : <Boxes />}
                    </div>
                    <div className="admin-product-copy">
                      <span>{product.category}</span>
                      <strong>{product.name}</strong>
                      <small>{money(product.price)} • Stock: {product.stock_quantity}</small>
                    </div>
                    <div className="admin-product-actions">
                      <button className={`status-pill ${product.status}`} onClick={() => toggleStatus(product)}>
                        {product.status === 'published' ? 'Published' : 'Draft'}
                      </button>
                      <button className="danger-icon" onClick={() => deleteProduct(product)} title="Delete product"><Trash2 size={16} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
