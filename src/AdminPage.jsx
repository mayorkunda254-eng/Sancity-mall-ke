import { useEffect, useMemo, useState } from 'react'
import JSZip from 'jszip'
import {
  Boxes, CheckCircle2, ChevronRight, ClipboardCheck, CreditCard, ImagePlus, Loader2, LogOut, MapPin, PackagePlus,
  Phone, RefreshCw, Search, Settings2, ShieldCheck, Store, Trash2, Truck, UploadCloud, XCircle
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
    }
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
      .select('id,order_number,customer_name,customer_phone,delivery_method,delivery_zone_id,delivery_zone_name,delivery_location,delivery_notes,subtotal,delivery_fee,total_amount,payment_method,payment_paybill,payment_account,mpesa_code,payment_status,order_status,created_at,store_order_items(id,product_name,variant_label,variant_size,variant_colour,unit_price,quantity,line_total)')
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) {
      setNotice({ type: 'error', text: error.message })
    } else {
      setOrders(data || [])
    }
    setOrdersLoading(false)
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
      text: `${zone.name} updated — ${fee === null ? 'manual quote required' : money(fee)} delivery.`,
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
        total_amount: Number(order.subtotal) + fee,
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
            <span className="admin-kicker"><Boxes size={15} /> Store manager</span>
            <h1>Orders & products</h1>
            <p>Verify customer orders, manage fulfilment and maintain the Sancity catalogue.</p>
          </div>
          <button
            onClick={() => { loadProducts(); loadOrders(); loadDeliveryZones() }}
            className="admin-secondary-btn"
            disabled={listLoading || ordersLoading || zonesLoading}
          >
            <RefreshCw size={16} className={listLoading || ordersLoading || zonesLoading ? 'spin' : ''} /> Refresh
          </button>
        </section>

        {notice && (
          <div className={`admin-alert ${notice.type}`}>
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {notice.text}
          </div>
        )}

        <section className="admin-card admin-delivery-zones-card">
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
                placeholder="e.g. Same day / 1–2 days"
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

        <section className="admin-card admin-orders-card">
          <div className="admin-card-heading orders-heading">
            <span className="admin-step"><ClipboardCheck size={16} /></span>
            <div>
              <h2>Orders</h2>
              <p>{orders.length} recent order{orders.length === 1 ? '' : 's'} • manual M-Pesa verification</p>
            </div>
          </div>

          <div className="admin-orders-list">
            {ordersLoading ? (
              <div className="admin-empty"><Loader2 className="spin" /> Loading orders…</div>
            ) : orders.length === 0 ? (
              <div className="admin-empty"><ClipboardCheck /> No customer orders yet.</div>
            ) : orders.map((order) => {
              const items = order.store_order_items || []
              const total = order.total_amount === null || order.total_amount === undefined
                ? null
                : Number(order.total_amount)
              const busy = orderUpdatingId === order.id

              return (
                <article className="admin-order" key={order.id}>
                  <div className="admin-order-top">
                    <div>
                      <span>{new Date(order.created_at).toLocaleString('en-KE')}</span>
                      <strong>{order.order_number}</strong>
                    </div>
                    <div className="admin-order-badges">
                      <span className={`order-badge payment-${order.payment_status}`}>{orderStatusLabel(order.payment_status)}</span>
                      <span className={`order-badge status-${order.order_status}`}>{orderStatusLabel(order.order_status)}</span>
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
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="admin-card batch-import-card">
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
                <input value={form.delivery_note} onChange={(e) => setForm({ ...form, delivery_note: e.target.value })} placeholder="Optional — only if this item has special delivery or pickup requirements" />
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
                placeholder={'1 Seater | 90–140 cm | Grey | 1499 | 4\n2 Seater | 145–185 cm | Grey | 1999 | 2\n3 Seater | 190–230 cm | Burgundy | 2499 |'}
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
