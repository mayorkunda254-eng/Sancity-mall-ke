import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import {
  BarChart3, Bell, Boxes, CheckCircle2, ChevronRight, ClipboardCheck, CreditCard, ImagePlus, Loader2, LogOut, MapPin, MessageCircle, PackagePlus,
  Phone, RefreshCw, Search, Settings2, ShieldCheck, Store, Tag, Trash2, Truck, UploadCloud, XCircle
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

const adminViewMeta = {
  overview: {
    kicker: 'Control center',
    title: 'Store overview',
    description: 'See store health, urgent tasks and the actions that need attention first.',
  },
  orders: {
    kicker: 'Sales operations',
    title: 'Orders',
    description: 'Verify payments, manage fulfilment and keep customer follow-ups moving.',
  },
  products: {
    kicker: 'Catalogue',
    title: 'Products',
    description: 'Add products, manage imagery, variants, pricing, stock and publish status.',
  },
  availability: {
    kicker: 'Customer intent',
    title: 'Availability requests',
    description: 'Follow up with shoppers who are waiting for stock or variant confirmation.',
  },
  promotions: {
    kicker: 'Growth',
    title: 'Promotions',
    description: 'Create and maintain checkout offers, minimum spend rules and coupon limits.',
  },
  delivery: {
    kicker: 'Fulfilment',
    title: 'Delivery',
    description: 'Manage Nairobi delivery zones, fees and estimated delivery guidance.',
  },
  analytics: {
    kicker: 'Performance',
    title: 'Analytics & SEO',
    description: 'Review the shopping funnel, search demand and catalogue discoverability.',
  },
  imports: {
    kicker: 'Catalogue operations',
    title: 'Batch imports',
    description: 'Attach prepared product photography to the catalogue in bulk.',
  },
}

const emptyForm = {
  name: '',
  category: 'Kitchen & Dining',
  description: '',
  dimensions: '',
  material: '',
  colour: '',
  key_features: '',
  care_instructions: '',
  delivery_note: '',
  price: '',
  compare_at_price: '',
  price_from: false,
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

const toLocalDateTimeInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return local.toISOString().slice(0, 16)
}

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
  const [adminView, setAdminView] = useState('overview')
  const [submitting, setSubmitting] = useState(false)
  const [listLoading, setListLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [uploadingProductId, setUploadingProductId] = useState(null)
  const [batchUploading, setBatchUploading] = useState(false)
  const [batchProgress, setBatchProgress] = useState('')
  const [publishAfterBatch, setPublishAfterBatch] = useState(true)
  const [variantProduct, setVariantProduct] = useState(null)
  const [variantText, setVariantText] = useState('')
  const [variantSaving, setVariantSaving] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [orderUpdatingId, setOrderUpdatingId] = useState(null)
  const [deliveryZones, setDeliveryZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(false)
  const [zoneSavingId, setZoneSavingId] = useState(null)
  const [newZone, setNewZone] = useState({ name: '', fee: '', eta_text: '' })
  const [stockAlerts, setStockAlerts] = useState([])
  const [stockAlertsLoading, setStockAlertsLoading] = useState(false)
  const [stockAlertUpdatingId, setStockAlertUpdatingId] = useState(null)
  const [promotions, setPromotions] = useState([])
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const [promotionSavingId, setPromotionSavingId] = useState(null)
  const [newPromotion, setNewPromotion] = useState({
    code: '',
    name: '',
    discount_type: 'percent',
    discount_value: '10',
    min_subtotal: '0',
    starts_at: '',
    expires_at: '',
    max_redemptions: '',
  })
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [searchQueries, setSearchQueries] = useState([])
  const [searchQueriesLoading, setSearchQueriesLoading] = useState(false)

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
    if (session) {
      loadProducts()
      loadOrders()
      loadDeliveryZones()
      loadStockAlerts()
      loadPromotions()
      loadAnalytics(30)
      loadSearchQueries(30)
    }
  }, [session])

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) =>
      [product.name, product.category, product.status].join(' ').toLowerCase().includes(q)
    )
  }, [products, query])

  const merchantFeedItemCount = useMemo(() => products.reduce((count, product) => {
    const images = product.product_images || []
    if (product.status !== 'published' || images.length === 0) return count

    const variants = (product.product_variants || []).filter((variant) => variant.is_active !== false)
    if (variants.length > 0) {
      const eligibleVariants = variants.filter((variant) =>
        (variant.price !== null && variant.price !== undefined)
        || (product.price !== null && product.price !== undefined)
      )
      return count + eligibleVariants.length
    }

    if (product.price === null || product.price === undefined || product.price_from) return count
    return count + 1
  }, 0), [products])

  const publishedProductCount = useMemo(
    () => products.filter((product) => product.status === 'published').length,
    [products],
  )

  const unpricedProductCount = useMemo(() => products.filter((product) => {
    if (product.price !== null && product.price !== undefined) return false
    const variants = (product.product_variants || []).filter((variant) => variant.is_active !== false)
    return !variants.some((variant) => variant.price !== null && variant.price !== undefined)
  }).length, [products])

  const stockConfirmationCount = useMemo(
    () => products.filter((product) => !(Number(product.stock_quantity) > 0)).length,
    [products],
  )

  const openOrderCount = useMemo(
    () => orders.filter((order) => !['completed', 'cancelled'].includes(order.order_status)).length,
    [orders],
  )

  const currentAdminMeta = adminViewMeta[adminView] || adminViewMeta.overview

  const switchAdminView = (view) => {
    setAdminView(view)
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }
  }

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
      .select('id,name,slug,category,description,dimensions,material,colour,key_features,care_instructions,delivery_note,price,compare_at_price,price_from,stock_quantity,badge,status,created_at,product_images(id,public_url,storage_path,sort_order),product_variants(id,label,size,colour,price,stock_quantity,is_active,sort_order)')
      .order('created_at', { ascending: false })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setProducts(data || [])
    }
    setListLoading(false)
  }

  async function loadOrders() {
    setOrdersLoading(true)
    const { data, error } = await supabase
      .from('store_orders')
      .select('id,order_number,customer_name,customer_phone,delivery_method,delivery_zone_id,delivery_zone_name,delivery_location,delivery_notes,subtotal,discount_amount,promotion_code,delivery_fee,total_amount,payment_method,payment_paybill,payment_account,mpesa_code,payment_status,order_status,follow_up_date,follow_up_status,created_at,store_order_items(id,product_name,variant_label,variant_size,variant_colour,unit_price,quantity,line_total)')
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setOrders(data || [])
    }
    setOrdersLoading(false)
  }

  async function loadAnalytics(days = analyticsDays) {
    const selectedDays = Number(days) || 30
    setAnalyticsDays(selectedDays)
    setAnalyticsLoading(true)

    const { data, error } = await supabase.rpc('get_conversion_analytics', {
      p_days: selectedDays,
    })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setAnalytics(data || null)
    }
    setAnalyticsLoading(false)
  }

  async function loadSearchQueries(days = analyticsDays) {
    const selectedDays = Number(days) || 30
    setSearchQueriesLoading(true)
    const since = new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('search_queries')
      .select('query,category,results_count,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setSearchQueries(data || [])
    }
    setSearchQueriesLoading(false)
  }

  const topSearchQueries = useMemo(() => {
    const grouped = new Map()

    for (const item of searchQueries) {
      const key = String(item.query || '').trim().toLowerCase()
      if (!key) continue
      const current = grouped.get(key) || {
        query: String(item.query || '').trim(),
        searches: 0,
        zero_results: 0,
        total_results: 0,
      }
      current.searches += 1
      current.total_results += Number(item.results_count || 0)
      if (Number(item.results_count || 0) === 0) current.zero_results += 1
      grouped.set(key, current)
    }

    return [...grouped.values()]
      .sort((a, b) => b.searches - a.searches || b.zero_results - a.zero_results || a.query.localeCompare(b.query))
      .slice(0, 12)
  }, [searchQueries])

  const analyticsFunnel = useMemo(() => {
    const viewed = Number(analytics?.product_view_sessions || 0)
    const stages = [
      { key: 'viewed', label: 'Viewed products', value: viewed },
      { key: 'cart', label: 'Added to cart', value: Number(analytics?.add_to_cart_sessions || 0) },
      { key: 'checkout', label: 'Opened checkout', value: Number(analytics?.checkout_sessions || 0) },
      { key: 'orders', label: 'Placed order', value: Number(analytics?.order_sessions || 0) },
    ]

    return stages.map((stage, index) => ({
      ...stage,
      rate: index === 0
        ? (viewed > 0 ? 100 : 0)
        : (viewed > 0 ? Math.min(100, (stage.value / viewed) * 100) : 0),
    }))
  }, [analytics])

  const checkoutToOrderRate = Number(analytics?.checkout_sessions || 0) > 0
    ? (Number(analytics?.order_sessions || 0) / Number(analytics.checkout_sessions)) * 100
    : 0

  async function loadPromotions() {
    setPromotionsLoading(true)
    const { data, error } = await supabase
      .from('promotions')
      .select('id,code,name,discount_type,discount_value,min_subtotal,starts_at,expires_at,max_redemptions,times_redeemed,is_active,created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setPromotions(data || [])
    }
    setPromotionsLoading(false)
  }

  async function createPromotion(event) {
    event.preventDefault()

    const code = newPromotion.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
    const value = Number(newPromotion.discount_value)
    const minimum = Number(newPromotion.min_subtotal || 0)
    const maxRedemptions = newPromotion.max_redemptions === '' ? null : Number(newPromotion.max_redemptions)

    if (!code) {
      setNotice({ type: 'error', text: 'Enter a promo code.' })
      return
    }
    if (!Number.isFinite(value) || value <= 0 || (newPromotion.discount_type === 'percent' && value > 100)) {
      setNotice({ type: 'error', text: 'Enter a valid discount value.' })
      return
    }
    if (!Number.isFinite(minimum) || minimum < 0) {
      setNotice({ type: 'error', text: 'Enter a valid minimum subtotal.' })
      return
    }
    if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
      setNotice({ type: 'error', text: 'Usage limit must be a whole number above zero.' })
      return
    }

    setPromotionSavingId('new')
    const { error } = await supabase.from('promotions').insert({
      code,
      name: newPromotion.name.trim() || null,
      discount_type: newPromotion.discount_type,
      discount_value: value,
      min_subtotal: minimum,
      starts_at: newPromotion.starts_at ? new Date(newPromotion.starts_at).toISOString() : null,
      expires_at: newPromotion.expires_at ? new Date(newPromotion.expires_at).toISOString() : null,
      max_redemptions: maxRedemptions,
      is_active: true,
    })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: `Promo code ${code} created.` })
      setNewPromotion({
        code: '',
        name: '',
        discount_type: 'percent',
        discount_value: '10',
        min_subtotal: '0',
        starts_at: '',
        expires_at: '',
        max_redemptions: '',
      })
      await loadPromotions()
    }
    setPromotionSavingId(null)
  }

  async function updatePromotion(promotion, patch, successText = 'Promotion updated.') {
    setPromotionSavingId(promotion.id)
    setNotice(null)

    const { error } = await supabase
      .from('promotions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', promotion.id)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: successText })
      await loadPromotions()
    }
    setPromotionSavingId(null)
  }

  async function savePromotionDetails(event, promotion) {
    event.preventDefault()
    const form = event.currentTarget
    const type = form.elements.discount_type.value
    const value = Number(form.elements.discount_value.value)
    const minimum = Number(form.elements.min_subtotal.value || 0)
    const maxRaw = form.elements.max_redemptions.value
    const maxRedemptions = maxRaw === '' ? null : Number(maxRaw)
    const startsRaw = form.elements.starts_at.value
    const expiresRaw = form.elements.expires_at.value

    if (!Number.isFinite(value) || value <= 0 || (type === 'percent' && value > 100)) {
      setNotice({ type: 'error', text: 'Enter a valid discount value.' })
      return
    }
    if (!Number.isFinite(minimum) || minimum < 0) {
      setNotice({ type: 'error', text: 'Enter a valid minimum subtotal.' })
      return
    }
    if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
      setNotice({ type: 'error', text: 'Usage limit must be a whole number above zero.' })
      return
    }

    await updatePromotion(
      promotion,
      {
        discount_type: type,
        discount_value: value,
        min_subtotal: minimum,
        starts_at: startsRaw ? new Date(startsRaw).toISOString() : null,
        expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
        max_redemptions: maxRedemptions,
      },
      `Promo code ${promotion.code} updated.`,
    )
  }

  async function deletePromotion(promotion) {
    if (!window.confirm(`Delete promo code "${promotion.code}"?`)) return
    setPromotionSavingId(promotion.id)

    const { error } = await supabase.from('promotions').delete().eq('id', promotion.id)
    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: `Promo code ${promotion.code} deleted.` })
      await loadPromotions()
    }
    setPromotionSavingId(null)
  }

  async function loadDeliveryZones() {
    setZonesLoading(true)
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('id,name,fee,eta_text,is_active,sort_order,created_at')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setDeliveryZones(data || [])
    }
    setZonesLoading(false)
  }

  async function addDeliveryZone(event) {
    event.preventDefault()
    const name = newZone.name.trim()
    const fee = newZone.fee === '' ? null : Number(newZone.fee)

    if (!name) {
      setNotice({ type: 'error', text: 'Enter a delivery zone name.' })
      return
    }
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      setNotice({ type: 'error', text: 'Enter a valid delivery fee or leave it blank for quote-required.' })
      return
    }

    setZoneSavingId('new')
    const { error } = await supabase.from('delivery_zones').insert({
      name,
      fee,
      eta_text: newZone.eta_text.trim() || null,
      is_active: true,
      sort_order: deliveryZones.length * 10 + 10,
    })

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: `${name} was added to delivery zones.` })
      setNewZone({ name: '', fee: '', eta_text: '' })
      await loadDeliveryZones()
    }
    setZoneSavingId(null)
  }

  async function updateDeliveryZone(zone, patch) {
    setZoneSavingId(zone.id)
    setNotice(null)

    const { error } = await supabase
      .from('delivery_zones')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', zone.id)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      await loadDeliveryZones()
    }
    setZoneSavingId(null)
  }

  async function saveDeliveryZoneFee(event, zone) {
    event.preventDefault()
    const form = event.currentTarget
    const feeRaw = form.elements.fee.value
    const eta = String(form.elements.eta_text.value || '').trim()
    const fee = feeRaw === '' ? null : Number(feeRaw)

    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      setNotice({ type: 'error', text: 'Enter a valid fee or leave it blank for manual quote.' })
      return
    }

    await updateDeliveryZone(zone, { fee, eta_text: eta || null })
    setNotice({
      type: 'success',
      text: `${zone.name} updated: ${fee === null ? 'manual quote required' : money(fee)} delivery.`,
    })
  }

  async function deleteDeliveryZone(zone) {
    if (!window.confirm(`Delete delivery zone "${zone.name}"?`)) return
    setZoneSavingId(zone.id)

    const { error } = await supabase.from('delivery_zones').delete().eq('id', zone.id)
    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: `${zone.name} was removed.` })
      await loadDeliveryZones()
    }
    setZoneSavingId(null)
  }

  async function loadStockAlerts() {
    setStockAlertsLoading(true)
    const { data, error } = await supabase
      .from('stock_alerts')
      .select('id,customer_phone,status,created_at,updated_at,contacted_at,products(id,name,slug),product_variants(id,label,size,colour)')
      .order('created_at', { ascending: false })
      .limit(80)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setStockAlerts(data || [])
    }
    setStockAlertsLoading(false)
  }

  async function updateStockAlert(alert, patch, successText) {
    setStockAlertUpdatingId(alert.id)
    setNotice(null)

    const { error } = await supabase
      .from('stock_alerts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', alert.id)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: successText })
      await loadStockAlerts()
    }
    setStockAlertUpdatingId(null)
  }

  function stockAlertWhatsappLink(alert) {
    const productName = alert.products?.name || 'the product you asked about'
    const variant = alert.product_variants
      ? `: ${alert.product_variants.label}${alert.product_variants.colour ? `, ${alert.product_variants.colour}` : ''}`
      : ''
    const message = `Hello, this is Sancity Mall KE. You asked us to update you about ${productName}${variant}. We are following up on its current availability.`
    return `https://wa.me/${alert.customer_phone}?text=${encodeURIComponent(message)}`
  }

  const pendingStockAlertCount = stockAlerts.filter((alert) => alert.status === 'pending').length

  const orderedOrders = useMemo(() => {
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')

    const priority = (order) => {
      if (order.follow_up_status === 'pending') return 0
      if (order.follow_up_status === 'scheduled' && order.follow_up_date && order.follow_up_date <= today) return 1
      if (order.follow_up_status === 'scheduled') return 2
      return 3
    }

    return [...orders].sort((left, right) => {
      const priorityDifference = priority(left) - priority(right)
      if (priorityDifference !== 0) return priorityDifference

      const leftDate = left.follow_up_date || '9999-12-31'
      const rightDate = right.follow_up_date || '9999-12-31'
      if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    })
  }, [orders])

  const followUpAttentionCount = useMemo(() => {
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')

    return orders.filter((order) => (
      order.follow_up_status === 'pending'
      || (
        order.follow_up_status === 'scheduled'
        && order.follow_up_date
        && order.follow_up_date <= today
      )
    )).length
  }, [orders])

  async function updateOrder(order, patch, successText = 'Order updated.') {
    setOrderUpdatingId(order.id)
    setNotice(null)

    const { error } = await supabase
      .from('store_orders')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', order.id)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setNotice({ type: 'success', text: successText })
      await loadOrders()
    }
    setOrderUpdatingId(null)
  }

  async function saveDeliveryFee(event, order) {
    event.preventDefault()
    const raw = event.currentTarget.elements.delivery_fee.value
    const fee = Number(raw)

    if (!Number.isFinite(fee) || fee < 0) {
      setNotice({ type: 'error', text: 'Enter a valid delivery fee.' })
      return
    }

    await updateOrder(
      order,
      {
        delivery_fee: fee,
        total_amount: Math.max(Number(order.subtotal) - Number(order.discount_amount || 0), 0) + fee,
        order_status: order.order_status === 'awaiting_delivery_quote' ? 'new' : order.order_status,
      },
      `Delivery total saved for ${order.order_number}.`,
    )
  }

  async function attachPaymentCode(event, order) {
    event.preventDefault()
    const code = String(event.currentTarget.elements.mpesa_code.value || '').trim().toUpperCase().replace(/\s/g, '')

    if (!/^[A-Z0-9]{8,16}$/.test(code)) {
      setNotice({ type: 'error', text: 'Enter a valid M-Pesa confirmation code.' })
      return
    }

    await updateOrder(
      order,
      { mpesa_code: code, payment_status: 'pending_verification' },
      `Payment code attached to ${order.order_number}.`,
    )
  }

  const orderStatusLabel = (value = '') => value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

  function onFileChange(event) {
    const picked = Array.from(event.target.files || []).slice(0, 6)
    const invalid = picked.find((file) => !file.type.startsWith('image/'))
    if (invalid) {
      setNotice({ type: 'error', text: 'Please select image files only.' })
      return
    }
    setFiles(picked)
  }

  async function importProductImageZip(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setBatchUploading(true)
    setBatchProgress('Reading ZIP package…')
    setNotice(null)

    try {
      const zip = await JSZip.loadAsync(file)
      const manifestEntry = zip.file('manifest.json')
      if (!manifestEntry) {
        throw new Error('This ZIP is missing manifest.json. Use a Sancity admin-import ZIP package.')
      }

      const manifest = JSON.parse(await manifestEntry.async('string'))
      if (!Array.isArray(manifest?.products) || manifest.products.length === 0) {
        throw new Error('The ZIP manifest does not contain any product mappings.')
      }

      setBatchProgress('Refreshing catalogue from Supabase…')
      const { data: freshCatalogue, error: catalogueError } = await supabase
        .from('products')
        .select('id,name,slug,status,product_images(id,public_url,storage_path,sort_order)')
        .order('created_at', { ascending: false })

      if (catalogueError) throw catalogueError

      const catalogueProducts = freshCatalogue || []
      const imagePattern = /\.(jpe?g|png|webp|avif)$/i
      let uploadedTotal = 0
      let matchedProducts = 0
      let publishedProducts = 0
      const warnings = []

      for (let productIndex = 0; productIndex < manifest.products.length; productIndex += 1) {
        const mapping = manifest.products[productIndex]
        const product = catalogueProducts.find((item) => item.slug === mapping.slug)

        if (!product) {
          warnings.push(`No catalogue product found for ${mapping.slug}`)
          continue
        }

        matchedProducts += 1
        const existingImages = [...(product.product_images || [])]
          .sort((a, b) => a.sort_order - b.sort_order)
        const remainingSlots = Math.max(0, 10 - existingImages.length)

        if (remainingSlots === 0) {
          warnings.push(`${product.name} already has 10 photos`)
          continue
        }

        const folderPrefix = `${String(mapping.folder || '').replace(/\/+$/, '')}/`
        const folderImages = Object.values(zip.files)
          .filter((entry) => !entry.dir && entry.name.startsWith(folderPrefix) && imagePattern.test(entry.name))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
          .slice(0, remainingSlots)

        if (folderImages.length === 0) {
          warnings.push(`No importable images found for ${product.name}`)
          continue
        }

        setBatchProgress(
          `Uploading ${product.name} (${productIndex + 1} of ${manifest.products.length})…`,
        )

        const imageRows = []

        for (let imageIndex = 0; imageIndex < folderImages.length; imageIndex += 1) {
          const entry = folderImages[imageIndex]
          const fileName = entry.name.split('/').pop() || `image-${imageIndex + 1}.jpg`
          const extension = fileName.split('.').pop()?.toLowerCase()
          const mimeType = extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : extension === 'avif'
                ? 'image/avif'
                : 'image/jpeg'

          // JSZip returns extracted blobs as application/octet-stream in some browsers.
          // Rebuild the payload with an explicit image MIME type so Supabase Storage
          // accepts it against the bucket's image-only MIME allowlist.
          const imageBytes = await entry.async('uint8array')
          const typedBlob = new Blob([imageBytes], { type: mimeType })

          const storagePath = `${product.id}/${Date.now()}-batch-${existingImages.length + imageIndex}-${safeFileName(fileName)}`

          const { error: uploadError } = await supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .upload(storagePath, typedBlob, {
              cacheControl: '31536000',
              contentType: mimeType,
              upsert: false,
            })

          if (uploadError) throw uploadError

          const { data: publicData } = supabase.storage
            .from(PRODUCT_IMAGE_BUCKET)
            .getPublicUrl(storagePath)

          imageRows.push({
            product_id: product.id,
            storage_path: storagePath,
            public_url: publicData.publicUrl,
            sort_order: existingImages.length + imageIndex,
          })
        }

        const { error: imageError } = await supabase.from('product_images').insert(imageRows)
        if (imageError) throw imageError

        uploadedTotal += imageRows.length

        if (publishAfterBatch && product.status === 'draft') {
          const { error: publishError } = await supabase
            .from('products')
            .update({ status: 'published', updated_at: new Date().toISOString() })
            .eq('id', product.id)

          if (publishError) throw publishError
          publishedProducts += 1
        }

        if (folderImages.length < Object.values(zip.files)
          .filter((entry) => !entry.dir && entry.name.startsWith(folderPrefix) && imagePattern.test(entry.name)).length) {
          warnings.push(`${product.name} was capped at 10 total photos`)
        }
      }

      if (matchedProducts === 0) {
        throw new Error(
          `No ZIP products matched the live catalogue. Checked ${manifest.products.length} mapped product${manifest.products.length === 1 ? '' : 's'}. Refresh the admin page and try again.`,
        )
      }

      await loadProducts()
      setBatchProgress('')
      setNotice({
        type: uploadedTotal > 0 ? 'success' : 'error',
        text: uploadedTotal > 0
          ? `Batch complete: ${uploadedTotal} photo${uploadedTotal === 1 ? '' : 's'} added across ${matchedProducts} product${matchedProducts === 1 ? '' : 's'}${publishedProducts ? `, ${publishedProducts} draft${publishedProducts === 1 ? '' : 's'} published` : ''}.${warnings.length ? ` ${warnings.length} note${warnings.length === 1 ? '' : 's'}: ${warnings.slice(0, 2).join('; ')}${warnings.length > 2 ? '…' : ''}` : ''}`
          : `The ZIP matched ${matchedProducts} product${matchedProducts === 1 ? '' : 's'}, but no photos were added. ${warnings.slice(0, 3).join('; ')}`,
      })
    } catch (error) {
      setBatchProgress('')
      setNotice({
        type: 'error',
        text: error.message || 'Batch ZIP import failed.',
      })
    } finally {
      setBatchUploading(false)
    }
  }

  async function addImagesToProduct(product, event) {
    const picked = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))

    event.target.value = ''
    if (picked.length === 0) return

    const existingImages = [...(product.product_images || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
    const remainingSlots = Math.max(0, 10 - existingImages.length)

    if (remainingSlots === 0) {
      setNotice({ type: 'error', text: 'This product already has 10 images. Remove an older image before adding more.' })
      return
    }

    const filesToUpload = picked.slice(0, remainingSlots)
    setUploadingProductId(product.id)
    setNotice(null)

    try {
      const startOrder = existingImages.length
      const imageRows = []

      for (let index = 0; index < filesToUpload.length; index += 1) {
        const file = filesToUpload[index]
        const path = `${product.id}/${Date.now()}-extra-${startOrder + index}-${safeFileName(file.name)}`

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
          product_id: product.id,
          storage_path: path,
          public_url: publicData.publicUrl,
          sort_order: startOrder + index,
        })
      }

      const { error: imageError } = await supabase.from('product_images').insert(imageRows)
      if (imageError) throw imageError

      setNotice({
        type: 'success',
        text: `Added ${imageRows.length} photo${imageRows.length === 1 ? '' : 's'} to ${product.name}.`,
      })
      await loadProducts()
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not add product photos.' })
    } finally {
      setUploadingProductId(null)
    }
  }

  function openVariantEditor(product) {
    const lines = [...(product.product_variants || [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((variant) => [
        variant.label || '',
        variant.size || '',
        variant.colour || '',
        variant.price ?? '',
        variant.stock_quantity ?? '',
      ].join(' | '))

    setVariantProduct(product)
    setVariantText(lines.join('\n'))
    setNotice(null)
  }

  function parseVariantLines(value) {
    const lines = value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const seen = new Set()

    return lines.map((line, index) => {
      const [labelRaw = '', sizeRaw = '', colourRaw = '', priceRaw = '', stockRaw = ''] = line
        .split('|')
        .map((part) => part.trim())

      if (!labelRaw) throw new Error(`Variant line ${index + 1} needs a label.`)

      const duplicateKey = labelRaw.toLowerCase()
      if (seen.has(duplicateKey)) throw new Error(`Duplicate variant label: ${labelRaw}`)
      seen.add(duplicateKey)

      const price = priceRaw === '' ? null : Number(priceRaw)
      const stock = stockRaw === '' ? null : Number(stockRaw)

      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        throw new Error(`Variant line ${index + 1} has an invalid price.`)
      }
      if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
        throw new Error(`Variant line ${index + 1} has an invalid stock quantity.`)
      }

      return {
        product_id: variantProduct.id,
        label: labelRaw,
        size: sizeRaw || null,
        colour: colourRaw || null,
        price,
        stock_quantity: stock,
        is_active: true,
        sort_order: index,
      }
    })
  }

  async function saveVariants() {
    if (!variantProduct) return
    setVariantSaving(true)
    setNotice(null)

    try {
      const rows = parseVariantLines(variantText)

      const { error: deleteError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', variantProduct.id)

      if (deleteError) throw deleteError

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('product_variants').insert(rows)
        if (insertError) throw insertError
      }

      setNotice({
        type: 'success',
        text: `Saved ${rows.length} variant${rows.length === 1 ? '' : 's'} for ${variantProduct.name}.`,
      })
      setVariantProduct(null)
      setVariantText('')
      await loadProducts()
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not save product variants.' })
    } finally {
      setVariantSaving(false)
    }
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
        dimensions: form.dimensions.trim() || null,
        material: form.material.trim() || null,
        colour: form.colour.trim() || null,
        key_features: form.key_features.trim() || null,
        care_instructions: form.care_instructions.trim() || null,
        delivery_note: form.delivery_note.trim() || null,
        price: form.price === '' ? null : Number(form.price),
        compare_at_price: form.compare_at_price === '' ? null : Number(form.compare_at_price),
        price_from: Boolean(form.price_from),
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
          <div><UploadCloud /><strong>Real product photography</strong><span>Upload up to ten images per item, including batch ZIP imports.</span></div>
          <div><Store /><strong>Publish when ready</strong><span>Use drafts for incomplete products.</span></div>
        </aside>
      </div>
    )
  }

  return (
    <div className="admin-shell" data-admin-view={adminView}>
      <header className="admin-header">
        <a href="/" className="admin-logo"><img src="/sancity-logo.svg" alt="Sancity Mall KE" /></a>
        <div className="admin-header-actions">
          <a href="/" target="_blank" rel="noreferrer" className="admin-secondary-btn"><Store size={16} /> View store</a>
          <button onClick={logout} className="admin-icon-btn" title="Sign out"><LogOut size={18} /></button>
        </div>
      </header>

      <aside className="admin-nav-rail" aria-label="Admin navigation">
        <div className="admin-nav-brand">
          <span>Control center</span>
          <strong>Sancity Mall</strong>
        </div>
        <nav>
          <button type="button" className={adminView === 'overview' ? 'active' : ''} onClick={() => switchAdminView('overview')}><BarChart3 size={16} /><span>Overview</span></button>
          <button type="button" className={adminView === 'orders' ? 'active' : ''} onClick={() => switchAdminView('orders')}><ClipboardCheck size={16} /><span>Orders</span></button>
          <button type="button" className={adminView === 'products' ? 'active' : ''} onClick={() => switchAdminView('products')}><Boxes size={16} /><span>Products</span></button>
          <button type="button" className={adminView === 'availability' ? 'active' : ''} onClick={() => switchAdminView('availability')}><Bell size={16} /><span>Availability</span></button>
          <button type="button" className={adminView === 'promotions' ? 'active' : ''} onClick={() => switchAdminView('promotions')}><Tag size={16} /><span>Promotions</span></button>
          <button type="button" className={adminView === 'delivery' ? 'active' : ''} onClick={() => switchAdminView('delivery')}><Truck size={16} /><span>Delivery</span></button>
          <button type="button" className={adminView === 'analytics' ? 'active' : ''} onClick={() => switchAdminView('analytics')}><BarChart3 size={16} /><span>Analytics</span></button>
          <button type="button" className={adminView === 'imports' ? 'active' : ''} onClick={() => switchAdminView('imports')}><UploadCloud size={16} /><span>Imports</span></button>
        </nav>
        <div className="admin-nav-foot">
          <a href="/" target="_blank" rel="noreferrer"><Store size={15} /> View storefront</a>
        </div>
      </aside>

      <nav className="admin-mobile-tabs" aria-label="Admin sections">
        <button type="button" className={adminView === 'overview' ? 'active' : ''} onClick={() => switchAdminView('overview')}><BarChart3 size={15} /><span>Overview</span></button>
        <button type="button" className={adminView === 'orders' ? 'active' : ''} onClick={() => switchAdminView('orders')}><ClipboardCheck size={15} /><span>Orders</span></button>
        <button type="button" className={adminView === 'products' ? 'active' : ''} onClick={() => switchAdminView('products')}><Boxes size={15} /><span>Products</span></button>
        <button type="button" className={adminView === 'availability' ? 'active' : ''} onClick={() => switchAdminView('availability')}><Bell size={15} /><span>Availability</span></button>
        <button type="button" className={adminView === 'promotions' ? 'active' : ''} onClick={() => switchAdminView('promotions')}><Tag size={15} /><span>Promotions</span></button>
        <button type="button" className={adminView === 'delivery' ? 'active' : ''} onClick={() => switchAdminView('delivery')}><Truck size={15} /><span>Delivery</span></button>
        <button type="button" className={adminView === 'analytics' ? 'active' : ''} onClick={() => switchAdminView('analytics')}><BarChart3 size={15} /><span>Analytics</span></button>
        <button type="button" className={adminView === 'imports' ? 'active' : ''} onClick={() => switchAdminView('imports')}><UploadCloud size={15} /><span>Imports</span></button>
      </nav>

      <main className="admin-main">
        <section className="admin-page-title">
          <div>
            <span className="admin-kicker"><Boxes size={15} /> {currentAdminMeta.kicker}</span>
            <h1>{currentAdminMeta.title}</h1>
            <p>{currentAdminMeta.description}</p>
          </div>
          <button
            onClick={() => { loadProducts(); loadOrders(); loadDeliveryZones(); loadStockAlerts(); loadPromotions(); loadAnalytics(analyticsDays); loadSearchQueries(analyticsDays) }}
            className="admin-secondary-btn"
            disabled={listLoading || ordersLoading || zonesLoading || stockAlertsLoading || promotionsLoading || analyticsLoading}
          >
            <RefreshCw size={16} className={listLoading || ordersLoading || zonesLoading || stockAlertsLoading || promotionsLoading || analyticsLoading ? 'spin' : ''} /> Refresh
          </button>
        </section>

        {notice && (
          <div className={`admin-alert ${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {notice.text}
          </div>
        )}

        <section id="admin-overview" className="admin-overview">
          <div className="admin-overview-heading">
            <div>
              <span>Overview</span>
              <h2>Store health at a glance</h2>
              <p>Focus first on orders, product completeness and customer requests that need action.</p>
            </div>
            <button type="button" className="admin-overview-add" onClick={() => switchAdminView('products')}><PackagePlus size={17} /> Add product</button>
          </div>

          <div className="admin-overview-kpis">
            <article>
              <span>Published products</span>
              <strong>{publishedProductCount.toLocaleString('en-KE')}</strong>
              <small>{products.length.toLocaleString('en-KE')} total catalogue records</small>
            </article>
            <article>
              <span>Open orders</span>
              <strong>{openOrderCount.toLocaleString('en-KE')}</strong>
              <small>{orders.length.toLocaleString('en-KE')} recent orders loaded</small>
            </article>
            <article>
              <span>Order value</span>
              <strong>{money(Number(analytics?.placed_order_value || 0))}</strong>
              <small>Known placed-order value, last {analyticsDays} days</small>
            </article>
            <article>
              <span>WhatsApp intent</span>
              <strong>{Number(analytics?.whatsapp_clicks || 0).toLocaleString('en-KE')}</strong>
              <small>Tracked WhatsApp clicks, last {analyticsDays} days</small>
            </article>
          </div>

          <div className="admin-overview-grid">
            <div className="admin-attention-card">
              <div className="admin-overview-panel-title">
                <span>Needs attention</span>
                <small>Highest-priority store tasks</small>
              </div>
              <button type="button" onClick={() => switchAdminView('products')}>
                <span className="attention-dot critical" />
                <div><strong>{unpricedProductCount} products need pricing</strong><small>Complete confirmed catalogue prices.</small></div>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => switchAdminView('orders')}>
                <span className="attention-dot warm" />
                <div><strong>{followUpAttentionCount} order follow-ups</strong><small>Pending or due customer follow-up.</small></div>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => switchAdminView('availability')}>
                <span className="attention-dot green" />
                <div><strong>{pendingStockAlertCount} availability requests</strong><small>Customers waiting for an update.</small></div>
                <ChevronRight size={16} />
              </button>
              <button type="button" onClick={() => switchAdminView('products')}>
                <span className="attention-dot neutral" />
                <div><strong>{stockConfirmationCount} stock confirmations</strong><small>Products currently showing confirm stock.</small></div>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="admin-quick-actions">
              <div className="admin-overview-panel-title">
                <span>Quick actions</span>
                <small>Common store-management tasks</small>
              </div>
              <button type="button" onClick={() => switchAdminView('products')}><PackagePlus size={18} /><span><strong>Add a product</strong><small>Create and publish a catalogue item.</small></span></button>
              <button type="button" onClick={() => switchAdminView('orders')}><ClipboardCheck size={18} /><span><strong>Review orders</strong><small>Verify payment, delivery and follow-up.</small></span></button>
              <button type="button" onClick={() => switchAdminView('imports')}><UploadCloud size={18} /><span><strong>Import images</strong><small>Attach prepared ZIP photos in bulk.</small></span></button>
              <button type="button" onClick={() => switchAdminView('promotions')}><Tag size={18} /><span><strong>Create promotion</strong><small>Set an offer or checkout coupon.</small></span></button>
            </div>
          </div>
        </section>

        <section id="admin-analytics" className="admin-card admin-analytics-card">
          <div className="admin-card-heading analytics-heading">
            <span className="admin-step"><BarChart3 size={16} /></span>
            <div>
              <h2>Conversion analytics</h2>
              <p>First-party shopping funnel. No customer names or phone numbers are stored in analytics.</p>
            </div>
            <div className="analytics-periods" aria-label="Analytics period">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  className={analyticsDays === days ? 'active' : ''}
                  onClick={() => { loadAnalytics(days); loadSearchQueries(days) }}
                  disabled={analyticsLoading}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {analyticsLoading && !analytics ? (
            <div className="admin-empty"><Loader2 className="spin" /> Loading analytics…</div>
          ) : (
            <>
              <div className="analytics-kpis">
                <div>
                  <span>Tracked sessions</span>
                  <strong>{Number(analytics?.tracked_sessions || 0).toLocaleString('en-KE')}</strong>
                  <small>Anonymous sessions with a shopping action.</small>
                </div>
                <div>
                  <span>Orders placed</span>
                  <strong>{Number(analytics?.order_sessions || 0).toLocaleString('en-KE')}</strong>
                  <small>{checkoutToOrderRate.toFixed(1)}% of checkout sessions placed an order.</small>
                </div>
                <div>
                  <span>Placed order value</span>
                  <strong>{money(Number(analytics?.placed_order_value || 0))}</strong>
                  <small>Known totals only; quote-required orders are excluded.</small>
                </div>
                <div>
                  <span>WhatsApp clicks</span>
                  <strong>{Number(analytics?.whatsapp_clicks || 0).toLocaleString('en-KE')}</strong>
                  <small>Product, cart, checkout and floating-support clicks.</small>
                </div>
              </div>

              <div className="analytics-detail-grid">
                <div className="analytics-funnel-panel">
                  <div className="analytics-panel-heading">
                    <span>Shopping funnel</span>
                    <small>Unique sessions • last {analyticsDays} days</small>
                  </div>
                  <div className="analytics-funnel">
                    {analyticsFunnel.map((stage) => (
                      <div key={stage.key}>
                        <div className="analytics-funnel-label">
                          <span>{stage.label}</span>
                          <strong>{stage.value} <small>{stage.rate.toFixed(1)}%</small></strong>
                        </div>
                        <div className="analytics-funnel-track">
                          <i style={{ width: `${Math.max(stage.rate, stage.value > 0 ? 4 : 0)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="analytics-secondary-metrics">
                    <span><b>{Number(analytics?.promo_sessions || 0)}</b> promo users</span>
                    <span><b>{Number(analytics?.stock_alert_requests || 0)}</b> availability requests</span>
                  </div>
                </div>

                <div className="analytics-top-products">
                  <div className="analytics-panel-heading">
                    <span>Top product interest</span>
                    <small>Views, cart adds and WhatsApp intent</small>
                  </div>

                  {(analytics?.top_products || []).length === 0 ? (
                    <div className="analytics-no-data">Product activity will appear here after tracking starts.</div>
                  ) : (
                    <div className="analytics-product-list">
                      {(analytics?.top_products || []).map((product, index) => (
                        <a key={product.product_id} href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
                          <b>{index + 1}</b>
                          <span>
                            <strong>{product.product_name}</strong>
                            <small>
                              {Number(product.views || 0)} views • {Number(product.adds || 0)} cart adds • {Number(product.whatsapp_clicks || 0)} WhatsApp
                            </small>
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="analytics-search-queries">
                <div className="analytics-panel-heading">
                  <span>Customer search queries</span>
                  <small>Consented on-site searches • last {analyticsDays} days</small>
                </div>
                {searchQueriesLoading ? (
                  <div className="analytics-no-data">Loading search queries…</div>
                ) : topSearchQueries.length === 0 ? (
                  <div className="analytics-no-data">Search demand will appear here after visitors allow analytics and use site search.</div>
                ) : (
                  <div className="analytics-query-list">
                    {topSearchQueries.map((item, index) => (
                      <div key={item.query}>
                        <b>{index + 1}</b>
                        <span>
                          <strong>{item.query}</strong>
                          <small>{item.searches} search{item.searches === 1 ? '' : 'es'} • {item.zero_results} zero-result • avg {Math.round(item.total_results / item.searches)} matches</small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <section id="admin-seo" className="admin-card admin-seo-card">
          <div className="admin-card-heading">
            <span className="admin-step"><Search size={16} /></span>
            <div>
              <h2>Google Shopping & SEO</h2>
              <p>Live catalogue endpoints for Merchant Center and Google Search.</p>
            </div>
          </div>

          <div className="admin-seo-grid">
            <div>
              <span>Feed-ready items</span>
              <strong>{merchantFeedItemCount}</strong>
              <small>Published products/variants with an image and exact price.</small>
            </div>
            <a href="/merchant-feed.xml" target="_blank" rel="noreferrer">
              <span>Merchant Center feed</span>
              <strong>/merchant-feed.xml</strong>
              <small>Use this URL as the scheduled product data source in Google Merchant Center.</small>
            </a>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
              <span>Product sitemap</span>
              <strong>/sitemap.xml</strong>
              <small>Submit this URL in Google Search Console.</small>
            </a>
          </div>
        </section>

        <section id="admin-promotions" className="admin-card admin-promotions-card">
          <div className="admin-card-heading orders-heading">
            <span className="admin-step"><Tag size={16} /></span>
            <div>
              <h2>Promotions & coupons</h2>
              <p>Create checkout discounts with minimum spend, dates and optional usage limits.</p>
            </div>
          </div>

          <form className="admin-promo-create" onSubmit={createPromotion}>
            <label>
              <span>Code</span>
              <input
                value={newPromotion.code}
                onChange={(event) => setNewPromotion({
                  ...newPromotion,
                  code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                })}
                placeholder="SANCITY10"
                maxLength="24"
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <label>
              <span>Name</span>
              <input
                value={newPromotion.name}
                onChange={(event) => setNewPromotion({ ...newPromotion, name: event.target.value })}
                placeholder="Weekend offer"
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={newPromotion.discount_type}
                onChange={(event) => setNewPromotion({ ...newPromotion, discount_type: event.target.value })}
                disabled={promotionSavingId === 'new'}
              >
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed KSh</option>
              </select>
            </label>
            <label>
              <span>Discount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={newPromotion.discount_value}
                onChange={(event) => setNewPromotion({ ...newPromotion, discount_value: event.target.value })}
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <label>
              <span>Minimum subtotal</span>
              <input
                type="number"
                min="0"
                step="1"
                value={newPromotion.min_subtotal}
                onChange={(event) => setNewPromotion({ ...newPromotion, min_subtotal: event.target.value })}
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <label>
              <span>Starts</span>
              <input
                type="datetime-local"
                value={newPromotion.starts_at}
                onChange={(event) => setNewPromotion({ ...newPromotion, starts_at: event.target.value })}
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <label>
              <span>Expires</span>
              <input
                type="datetime-local"
                value={newPromotion.expires_at}
                onChange={(event) => setNewPromotion({ ...newPromotion, expires_at: event.target.value })}
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <label>
              <span>Usage limit</span>
              <input
                type="number"
                min="1"
                step="1"
                value={newPromotion.max_redemptions}
                onChange={(event) => setNewPromotion({ ...newPromotion, max_redemptions: event.target.value })}
                placeholder="Unlimited"
                disabled={promotionSavingId === 'new'}
              />
            </label>
            <button className="admin-primary-btn" disabled={promotionSavingId === 'new'}>
              {promotionSavingId === 'new' ? 'Creating…' : 'Create promo'}
            </button>
          </form>

          <div className="admin-promotions-list">
            {promotionsLoading ? (
              <div className="admin-empty"><Loader2 className="spin" /> Loading promotions…</div>
            ) : promotions.length === 0 ? (
              <div className="admin-empty"><Tag /> No promo codes yet.</div>
            ) : promotions.map((promotion) => {
              const busy = promotionSavingId === promotion.id
              return (
                <article className={`admin-promotion ${promotion.is_active ? '' : 'inactive'}`} key={promotion.id}>
                  <div className="admin-promotion-title">
                    <span className={promotion.is_active ? 'active' : 'inactive'}>{promotion.is_active ? 'Active' : 'Paused'}</span>
                    <strong>{promotion.code}</strong>
                    <small>
                      {promotion.name || 'Promotion'} • used {promotion.times_redeemed}
                      {promotion.max_redemptions ? ` / ${promotion.max_redemptions}` : ''}
                    </small>
                  </div>

                  <form className="admin-promotion-fields" onSubmit={(event) => savePromotionDetails(event, promotion)}>
                    <label>
                      <span>Type</span>
                      <select name="discount_type" defaultValue={promotion.discount_type} disabled={busy}>
                        <option value="percent">Percent %</option>
                        <option value="fixed">Fixed KSh</option>
                      </select>
                    </label>
                    <label>
                      <span>Value</span>
                      <input name="discount_value" type="number" min="0.01" step="0.01" defaultValue={promotion.discount_value} disabled={busy} />
                    </label>
                    <label>
                      <span>Min KSh</span>
                      <input name="min_subtotal" type="number" min="0" step="1" defaultValue={promotion.min_subtotal || 0} disabled={busy} />
                    </label>
                    <label>
                      <span>Starts</span>
                      <input name="starts_at" type="datetime-local" defaultValue={toLocalDateTimeInput(promotion.starts_at)} disabled={busy} />
                    </label>
                    <label>
                      <span>Expires</span>
                      <input name="expires_at" type="datetime-local" defaultValue={toLocalDateTimeInput(promotion.expires_at)} disabled={busy} />
                    </label>
                    <label>
                      <span>Limit</span>
                      <input name="max_redemptions" type="number" min="1" step="1" defaultValue={promotion.max_redemptions ?? ''} placeholder="∞" disabled={busy} />
                    </label>
                    <button className="admin-secondary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  </form>

                  <div className="admin-promotion-actions">
                    <button
                      type="button"
                      className="status-pill"
                      disabled={busy}
                      onClick={() => updatePromotion(
                        promotion,
                        { is_active: !promotion.is_active },
                        `${promotion.code} ${promotion.is_active ? 'paused' : 'activated'}.`,
                      )}
                    >
                      {promotion.is_active ? 'Pause' : 'Activate'}
                    </button>
                    <button className="danger-icon" type="button" disabled={busy} onClick={() => deletePromotion(promotion)} title="Delete promo">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="admin-delivery" className="admin-card admin-delivery-zones-card">
          <div className="admin-card-heading orders-heading">
            <span className="admin-step"><Truck size={16} /></span>
            <div>
              <h2>Delivery zones</h2>
              <p>Set automatic delivery fees. Leave a fee blank when Sancity should quote that area manually.</p>
            </div>
          </div>

          <form className="admin-zone-create" onSubmit={addDeliveryZone}>
            <label>
              <span>Zone / area</span>
              <input
                value={newZone.name}
                onChange={(event) => setNewZone({ ...newZone, name: event.target.value })}
                placeholder="e.g. Nairobi CBD"
                disabled={zoneSavingId === 'new'}
              />
            </label>
            <label>
              <span>Fee (KSh)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={newZone.fee}
                onChange={(event) => setNewZone({ ...newZone, fee: event.target.value })}
                placeholder="Blank = quote"
                disabled={zoneSavingId === 'new'}
              />
            </label>
            <label>
              <span>Delivery ETA</span>
              <input
                value={newZone.eta_text}
                onChange={(event) => setNewZone({ ...newZone, eta_text: event.target.value })}
                placeholder="e.g. Same day / 1 to 2 days"
                disabled={zoneSavingId === 'new'}
              />
            </label>
            <button className="admin-primary-btn" disabled={zoneSavingId === 'new'}>
              {zoneSavingId === 'new' ? 'Adding…' : 'Add zone'}
            </button>
          </form>

          <div className="admin-zones-list">
            {zonesLoading ? (
              <div className="admin-empty"><Loader2 className="spin" /> Loading delivery zones…</div>
            ) : deliveryZones.length === 0 ? (
              <div className="admin-empty"><Truck /> No automatic delivery zones yet. Add the first area above.</div>
            ) : deliveryZones.map((zone) => {
              const busy = zoneSavingId === zone.id
              return (
                <article className="admin-zone-row" key={zone.id}>
                  <div className="admin-zone-title">
                    <span className={zone.is_active ? 'active' : 'inactive'}>{zone.is_active ? 'Active' : 'Hidden'}</span>
                    <strong>{zone.name}</strong>
                  </div>

                  <form className="admin-zone-fields" onSubmit={(event) => saveDeliveryZoneFee(event, zone)}>
                    <label>
                      <span>Fee</span>
                      <input
                        name="fee"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={zone.fee ?? ''}
                        placeholder="Quote"
                        disabled={busy}
                      />
                    </label>
                    <label>
                      <span>ETA</span>
                      <input
                        name="eta_text"
                        defaultValue={zone.eta_text || ''}
                        placeholder="Optional"
                        disabled={busy}
                      />
                    </label>
                    <button className="admin-secondary-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                  </form>

                  <div className="admin-zone-actions">
                    <button
                      className="status-pill"
                      type="button"
                      disabled={busy}
                      onClick={() => updateDeliveryZone(zone, { is_active: !zone.is_active })}
                    >
                      {zone.is_active ? 'Hide' : 'Activate'}
                    </button>
                    <button className="danger-icon" type="button" disabled={busy} onClick={() => deleteDeliveryZone(zone)} title="Delete zone">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="admin-availability" className="admin-card admin-stock-alerts-card">
          <div className="admin-card-heading orders-heading">
            <span className="admin-step"><Bell size={16} /></span>
            <div>
              <h2>Availability requests</h2>
              <p>{pendingStockAlertCount} pending request{pendingStockAlertCount === 1 ? '' : 's'} • WhatsApp follow-up</p>
            </div>
          </div>

          <div className="admin-stock-alerts-list">
            {stockAlertsLoading ? (
              <div className="admin-empty"><Loader2 className="spin" /> Loading availability requests…</div>
            ) : stockAlerts.length === 0 ? (
              <div className="admin-empty"><Bell /> No availability requests yet.</div>
            ) : stockAlerts.map((alert) => {
              const product = alert.products
              const variant = alert.product_variants
              const busy = stockAlertUpdatingId === alert.id

              return (
                <article className={`admin-stock-alert alert-${alert.status}`} key={alert.id}>
                  <div className="admin-stock-alert-main">
                    <div>
                      <span>{new Date(alert.created_at).toLocaleString('en-KE')}</span>
                      <strong>{product?.name || 'Product removed'}</strong>
                      {variant && (
                        <small>
                          {variant.label}
                          {variant.size ? ` • ${variant.size}` : ''}
                          {variant.colour ? ` • ${variant.colour}` : ''}
                        </small>
                      )}
                    </div>
                    <span className={`order-badge alert-status-${alert.status}`}>
                      {orderStatusLabel(alert.status)}
                    </span>
                  </div>

                  <div className="admin-stock-alert-contact">
                    <a href={`tel:+${alert.customer_phone}`}><Phone size={14} /> +{alert.customer_phone}</a>
                    {product?.slug && (
                      <a href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
                        <Store size={14} /> View product
                      </a>
                    )}
                  </div>

                  <div className="admin-stock-alert-actions">
                    <a href={stockAlertWhatsappLink(alert)} target="_blank" rel="noreferrer" className="stock-alert-whatsapp">
                      <MessageCircle size={15} /> Contact on WhatsApp
                    </a>

                    {alert.status === 'pending' && (
                      <button
                        type="button"
                        className="admin-secondary-btn"
                        disabled={busy}
                        onClick={() => updateStockAlert(
                          alert,
                          { status: 'contacted', contacted_at: new Date().toISOString() },
                          `Marked availability request for ${product?.name || 'product'} as contacted.`,
                        )}
                      >
                        {busy ? 'Saving…' : 'Mark contacted'}
                      </button>
                    )}

                    {alert.status !== 'closed' && (
                      <button
                        type="button"
                        className="status-pill"
                        disabled={busy}
                        onClick={() => updateStockAlert(
                          alert,
                          { status: 'closed' },
                          'Availability request closed.',
                        )}
                      >
                        Close
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="admin-orders" className="admin-card admin-orders-card">
          <div className="admin-card-heading orders-heading">
            <span className="admin-step"><ClipboardCheck size={16} /></span>
            <div>
              <h2>Orders</h2>
              <p>
                {orders.length} recent order{orders.length === 1 ? '' : 's'} • {followUpAttentionCount} follow-up{followUpAttentionCount === 1 ? '' : 's'} need attention
              </p>
            </div>
          </div>

          <div className="admin-orders-list">
            {ordersLoading ? (
              <div className="admin-empty"><Loader2 className="spin" /> Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="admin-empty"><ClipboardCheck /> No customer orders yet.</div>
            ) : orderedOrders.map((order) => {
              const items = order.store_order_items || []
              const total = order.total_amount === null || order.total_amount === undefined
                ? null
                : Number(order.total_amount)
              const busy = orderUpdatingId === order.id

              return (
                <article
                  className={`admin-order ${order.follow_up_status === 'pending' || (order.follow_up_status === 'scheduled' && order.follow_up_date) ? 'has-follow-up' : ''}`}
                  key={order.id}
                >
                  <div className="admin-order-top">
                    <div>
                      <span>{new Date(order.created_at).toLocaleString('en-KE')}</span>
                      <strong>{order.order_number}</strong>
                    </div>
                    <div className="admin-order-badges">
                      <span className={`order-badge payment-${order.payment_status}`}>{orderStatusLabel(order.payment_status)}</span>
                      <span className={`order-badge status-${order.order_status}`}>{orderStatusLabel(order.order_status)}</span>
                      {order.follow_up_status && order.follow_up_status !== 'not_required' && (
                        <span className={`order-badge follow-up-${order.follow_up_status}`}>
                          {order.follow_up_status === 'completed'
                            ? 'Follow-up complete'
                            : order.follow_up_date
                              ? `Follow-up ${new Date(`${order.follow_up_date}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`
                              : 'Follow-up pending'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="admin-order-grid">
                    <div className="admin-order-customer">
                      <span><strong>{order.customer_name}</strong></span>
                      <a href={`tel:${order.customer_phone}`}><Phone size={14} /> {order.customer_phone}</a>
                      <span>
                        {order.delivery_method === 'delivery' ? <Truck size={14} /> : <MapPin size={14} />}
                        {order.delivery_method === 'delivery'
                          ? [order.delivery_zone_name, order.delivery_location].filter(Boolean).join(' • ') || 'Delivery location pending'
                          : 'Pickup • RNG Plaza, Ronald Ngala Street'}
                      </span>
                      {order.delivery_notes && <small>Note: {order.delivery_notes}</small>}
                    </div>

                    <div className="admin-order-money">
                      <span>Products <b>{money(order.subtotal)}</b></span>
                      {Number(order.discount_amount || 0) > 0 && (
                        <span className="order-discount">
                          {order.promotion_code ? `Promo ${order.promotion_code}` : 'Discount'}
                          <b>− {money(order.discount_amount)}</b>
                        </span>
                      )}
                      <span>Delivery <b>{order.delivery_fee === null ? 'Pending' : money(order.delivery_fee)}</b></span>
                      <strong>Total <b>{total === null ? 'Pending quote' : money(total)}</b></strong>
                    </div>
                  </div>

                  <div className="admin-order-items">
                    {items.map((item) => (
                      <div key={item.id}>
                        <span>
                          <strong>{item.product_name}</strong>
                          {item.variant_label && <small>{item.variant_label}{item.variant_size ? ` • ${item.variant_size}` : ''}{item.variant_colour ? ` • ${item.variant_colour}` : ''}</small>}
                        </span>
                        <b>{item.quantity} × {money(item.unit_price)}</b>
                      </div>
                    ))}
                  </div>

                  <div className="admin-order-payment">
                    <CreditCard size={16} />
                    <span>
                      <small>M-Pesa via Equity • Paybill {order.payment_paybill} • Till {order.payment_account}</small>
                      <strong>{order.mpesa_code || 'No confirmation code submitted yet'}</strong>
                    </span>
                  </div>

                  {order.delivery_method === 'delivery' && order.delivery_fee === null && (
                    <form className="admin-order-inline-form" onSubmit={(event) => saveDeliveryFee(event, order)}>
                      <label>
                        <span>Delivery fee (KSh)</span>
                        <input name="delivery_fee" type="number" min="0" step="1" placeholder="e.g. 350" disabled={busy} />
                      </label>
                      <button className="admin-secondary-btn" disabled={busy}>{busy ? 'Saving…' : 'Set delivery total'}</button>
                    </form>
                  )}

                  {!order.mpesa_code && order.total_amount !== null && (
                    <form className="admin-order-inline-form" onSubmit={(event) => attachPaymentCode(event, order)}>
                      <label>
                        <span>Confirmation code received from customer</span>
                        <input name="mpesa_code" placeholder="e.g. TXX123ABCD" maxLength="16" disabled={busy} />
                      </label>
                      <button className="admin-secondary-btn" disabled={busy}>{busy ? 'Saving…' : 'Attach code'}</button>
                    </form>
                  )}

                  <div className="admin-order-controls">
                    <label>
                      <span>Payment</span>
                      <select
                        value={order.payment_status}
                        disabled={busy}
                        onChange={(event) => updateOrder(order, { payment_status: event.target.value }, `Payment status updated for ${order.order_number}.`)}
                      >
                        <option value="awaiting_payment">Awaiting payment</option>
                        <option value="pending_verification">Pending verification</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>

                    <label>
                      <span>Fulfilment</span>
                      <select
                        value={order.order_status}
                        disabled={busy}
                        onChange={(event) => updateOrder(order, { order_status: event.target.value }, `Order status updated for ${order.order_number}.`)}
                      >
                        <option value="awaiting_delivery_quote">Awaiting delivery quote</option>
                        <option value="new">New</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="ready_for_pickup">Ready for pickup</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>

                    <label>
                      <span>Follow-up status</span>
                      <select
                        value={order.follow_up_status || 'not_required'}
                        disabled={busy}
                        onChange={(event) => updateOrder(order, { follow_up_status: event.target.value }, `Follow-up status updated for ${order.order_number}.`)}
                      >
                        <option value="not_required">Not required</option>
                        <option value="pending">Pending</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>

                    <label>
                      <span>Follow-up date</span>
                      <input
                        type="date"
                        value={order.follow_up_date || ''}
                        disabled={busy}
                        onChange={(event) => updateOrder(
                          order,
                          {
                            follow_up_date: event.target.value || null,
                            follow_up_status: event.target.value && order.follow_up_status === 'not_required'
                              ? 'scheduled'
                              : order.follow_up_status,
                          },
                          `Follow-up date updated for ${order.order_number}.`,
                        )}
                      />
                    </label>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section id="admin-import" className="admin-card batch-import-card">
          <div className="admin-card-heading">
            <span className="admin-step">00</span>
            <div>
              <h2>Batch image import</h2>
              <p>Upload a prepared Sancity ZIP once and attach its images to the correct products automatically.</p>
            </div>
          </div>

          <div className="batch-import-layout">
            <label className={`batch-dropzone ${batchUploading ? 'busy' : ''}`}>
              {batchUploading ? <Loader2 className="spin" /> : <UploadCloud />}
              <strong>{batchUploading ? 'Importing catalogue photos…' : 'Choose Sancity admin-import ZIP'}</strong>
              <small>{batchProgress || 'The ZIP must include manifest.json. Product videos are preserved but skipped for now.'}</small>
              <input
                type="file"
                accept=".zip,application/zip"
                disabled={batchUploading}
                onChange={importProductImageZip}
              />
            </label>

            <label className="batch-publish-toggle">
              <input
                type="checkbox"
                checked={publishAfterBatch}
                disabled={batchUploading}
                onChange={(event) => setPublishAfterBatch(event.target.checked)}
              />
              <span>
                <strong>Publish matched drafts after photos upload</strong>
                <small>Existing published products remain published. Turn this off if you want to review drafts first.</small>
              </span>
            </label>
          </div>
        </section>

        <div className="admin-grid">
          <section id="admin-products-add" className="admin-card upload-card">
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

              <label className="admin-field admin-checkbox-field">
                <input
                  type="checkbox"
                  checked={form.price_from}
                  onChange={(e) => setForm({ ...form, price_from: e.target.checked })}
                />
                <span>Show price as “From KSh …”</span>
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
                <textarea rows="5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is useful about this product? Explain what it does and why a customer would want it." />
              </label>

              <div className="admin-field full admin-spec-heading">
                <span>Optional premium details</span>
                <small>Add only details you know. Empty fields stay hidden on the storefront.</small>
              </div>

              <label className="admin-field">
                <span>Dimensions / size</span>
                <input value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="e.g. 60 × 35 × 80 cm" />
              </label>

              <label className="admin-field">
                <span>Material</span>
                <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} placeholder="e.g. Stainless steel" />
              </label>

              <label className="admin-field">
                <span>Colour</span>
                <input value={form.colour} onChange={(e) => setForm({ ...form, colour: e.target.value })} placeholder="e.g. Black / gold" />
              </label>

              <label className="admin-field">
                <span>Care instructions</span>
                <input value={form.care_instructions} onChange={(e) => setForm({ ...form, care_instructions: e.target.value })} placeholder="e.g. Wipe clean with a damp cloth" />
              </label>

              <label className="admin-field full">
                <span>Key features <small>one per line</small></span>
                <textarea rows="4" value={form.key_features} onChange={(e) => setForm({ ...form, key_features: e.target.value })} placeholder={'Space-saving design\nEasy to assemble\nSuitable for everyday use'} />
              </label>

              <label className="admin-field full">
                <span>Special delivery note</span>
                <input value={form.delivery_note} onChange={(e) => setForm({ ...form, delivery_note: e.target.value })} placeholder="Optional: only if this item has special delivery or pickup requirements" />
              </label>

              <div className="admin-field full">
                <span>Product images * <small>Up to 6 images on initial creation; add more later up to 10</small></span>
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

          <section id="admin-catalogue" className="admin-card catalogue-card">
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
                      <small>{product.price_from && product.price !== null ? 'From ' : ''}{money(product.price)} • Stock: {product.stock_quantity} • {images.length} photo{images.length === 1 ? '' : 's'} • {(product.product_variants || []).length} variant{(product.product_variants || []).length === 1 ? '' : 's'}</small>
                    </div>
                    <div className="admin-product-actions">
                      <button className="admin-variants-btn" onClick={() => openVariantEditor(product)} type="button">
                        <Settings2 size={15} /> Variants
                      </button>
                      <label className={`admin-add-images ${images.length >= 10 ? 'disabled' : ''}`}>
                        {uploadingProductId === product.id ? <Loader2 className="spin" size={15} /> : <ImagePlus size={15} />}
                        <span>{images.length >= 10 ? '10 photos' : 'Add photos'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={images.length >= 10 || uploadingProductId === product.id}
                          onChange={(event) => addImagesToProduct(product, event)}
                        />
                      </label>
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

        {variantProduct && (
          <div className="variant-editor-backdrop" role="presentation" onMouseDown={() => !variantSaving && setVariantProduct(null)}>
            <section className="variant-editor" role="dialog" aria-modal="true" aria-labelledby="variant-editor-title" onMouseDown={(event) => event.stopPropagation()}>
              <div className="variant-editor-heading">
                <div>
                  <span>Product variants</span>
                  <h2 id="variant-editor-title">{variantProduct.name}</h2>
                </div>
                <button type="button" onClick={() => setVariantProduct(null)} disabled={variantSaving} aria-label="Close variant editor">×</button>
              </div>

              <p className="variant-editor-help">
                One variant per line: <strong>Label | Size | Colour | Price | Stock</strong>. Price and stock may be left blank.
              </p>

              <textarea
                rows="11"
                value={variantText}
                disabled={variantSaving}
                onChange={(event) => setVariantText(event.target.value)}
                placeholder={'1 Seater | 90 to 140 cm | Grey | 1499 | 4\n2 Seater | 145 to 185 cm | Grey | 1999 | 2\n3 Seater | 190 to 230 cm | Burgundy | 2499 |'}
              />

              <div className="variant-editor-example">
                <strong>How it works</strong>
                <span>The customer chooses the exact variant before Add to Cart. A blank price inherits the product’s base price.</span>
              </div>

              <div className="variant-editor-actions">
                <button type="button" className="admin-secondary-btn" onClick={() => setVariantProduct(null)} disabled={variantSaving}>Cancel</button>
                <button type="button" className="admin-primary-btn" onClick={saveVariants} disabled={variantSaving}>
                  {variantSaving ? <Loader2 className="spin" size={17} /> : <Settings2 size={17} />}
                  {variantSaving ? 'Saving variants…' : 'Save variants'}
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
