import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import './service-requests.css'

export const services = [
  { code: 'ad_setup', name: 'Ad setup', rate: 999, unit: 'campaign', description: 'One Facebook or Instagram campaign using supplied photos, one audience and a brief results summary.', note: 'Advertising budget paid separately. Campaign timing is agreed before work starts.' },
  { code: 'poster', name: 'Promotional poster', rate: 499, unit: 'poster', description: 'One promotional design with one revision.', note: 'Supply the offer, wording, logo and product photos.' },
  { code: 'photo_cleanup', name: 'Product photo cleanup', rate: 50, unit: 'photo', description: 'Background cleanup, lighting correction and a website-ready export.', note: 'Supply clear original product photos.' },
  { code: 'product_upload', name: 'Product upload', rate: 100, unit: 'product', description: 'Upload supplied photos, description, price, category and stock.', note: 'Supply the final product details and approved photos.' },
  { code: 'website_change', name: 'Small website change', rate: 499, unit: 'request', description: 'A text, image or contact-detail change.', note: 'From KES 499. Larger changes need a separate quote.' },
]
const statuses = ['pending', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled']
const statusLabel = value => value.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
const money = value => `KES ${Number(value).toLocaleString('en-KE')}`

export default function ServiceRequests({ userId }) {
  const [selected, setSelected] = useState(services[0])
  const [quantity, setQuantity] = useState(1)
  const [details, setDetails] = useState('')
  const [materials, setMaterials] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [message, setMessage] = useState(null)
  const [loadError, setLoadError] = useState('')

  async function loadRequests() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase.from('service_requests').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setRequests(data || [])
    } catch (error) { setLoadError(error.message || 'Could not load requests.') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadRequests() }, [])

  async function submit(event) {
    event.preventDefault()
    setMessage(null)
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 500) {
      setMessage({ type: 'error', text: 'Choose a whole quantity from 1 to 500.' }); return
    }
    if (details.trim().length < 10) {
      setMessage({ type: 'error', text: 'Describe the task in at least 10 characters.' }); return
    }
    setBusy(true)
    try {
      const { error } = await supabase.from('service_requests').insert({ requester_id: userId, service_code: selected.code, unit_price: selected.rate, quantity: Number(quantity), details: details.trim(), materials: materials.trim(), preferred_date: preferredDate || null })
      if (error) throw error
      setDetails(''); setMaterials(''); setPreferredDate(''); setQuantity(1)
      setMessage({ type: 'success', text: 'Request saved for review. Work starts after acceptance and payment arrangements are agreed.' })
      await loadRequests()
    } catch (error) { setMessage({ type: 'error', text: error.message || 'Could not save the request. Your details have been kept.' }) }
    finally { setBusy(false) }
  }

  async function updateStatus(request, status) {
    setUpdating(request.id); setMessage(null)
    try {
      const { data, error } = await supabase.from('service_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', request.id).eq('status', request.status).select('id,status,updated_at').single()
      if (error) throw error
      setRequests(items => items.map(item => item.id === request.id ? { ...item, ...data } : item))
      setMessage({ type: 'success', text: 'Request status updated.' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Could not update the status. Refresh the requests and try again.' })
    } finally { setUpdating(null) }
  }

  return <section className="service-workspace" aria-label="Request a service">
    <div className="service-intro"><span>SUPPORT FOR YOUR STORE</span><h2>What would you like done?</h2><p>Choose a service and send Mark the details. Requests are saved here for review; submitting a request does not charge you.</p></div>
    <div className="service-cards">{services.map(service => <button type="button" key={service.code} className={`service-card ${selected.code === service.code ? 'selected' : ''}`} aria-pressed={selected.code === service.code} onClick={() => { setSelected(service); setQuantity(1); setMessage(null) }}>
      <span>{service.name}</span><strong>{service.code === 'website_change' ? 'From ' : ''}{money(service.rate)}</strong><small>per {service.unit}</small><p>{service.description}</p><em>{service.note}</em>
    </button>)}</div>
    {message && <div className={`admin-alert ${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</div>}
    <div className="service-columns">
      <form className="service-form" onSubmit={submit}>
        <h3>Request {selected.name.toLowerCase()}</h3>
        <label>Quantity ({selected.unit}s)<input type="number" min="1" max="500" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} disabled={busy} /></label>
        <div className="service-estimate"><span>{selected.code === 'website_change' ? 'Starting estimate' : 'Service estimate'}</span><strong>{money(selected.rate * (Number(quantity) || 0))}</strong>{selected.code === 'ad_setup' && <small>Advertising spend is extra and paid separately.</small>}</div>
        <label>Task details<textarea minLength={10} maxLength={4000} required rows={5} placeholder="What is the offer or change? Which products or pages are involved?" value={details} onChange={event => setDetails(event.target.value)} disabled={busy} /></label>
        <label>Materials or file links<textarea maxLength={2000} rows={3} placeholder="Paste links to photos or describe the materials you will supply. Do not include passwords." value={materials} onChange={event => setMaterials(event.target.value)} disabled={busy} /></label>
        <label>Preferred completion date (optional)<input type="date" min={new Date().toLocaleDateString('en-CA')} value={preferredDate} onChange={event => setPreferredDate(event.target.value)} disabled={busy} /></label>
        <p className="service-note">The date is a preference. Mark must accept the scope, timing and payment arrangements before starting. This section tracks requests; it does not process payments or send email notifications.</p>
        <button className="admin-primary-btn" disabled={busy}>{busy ? 'Saving request…' : 'Send request for review'}</button>
      </form>
      <div className="service-history"><div className="service-history-heading"><h3>Request history</h3><button type="button" className="admin-secondary-btn" disabled={loading} onClick={loadRequests}>Refresh</button></div>
        {loading ? <p role="status">Loading requests…</p> : loadError ? <p role="alert">{loadError}</p> : requests.length === 0 ? <div className="service-empty"><strong>No requests yet</strong><p>Your requests and progress will appear here.</p></div> : requests.map(request => <article className="service-request" key={request.id}>
          <div className="service-request-top"><strong>{services.find(service => service.code === request.service_code)?.name || request.service_code}</strong><span>{statusLabel(request.status)}</span></div>
          <small>{new Date(request.created_at).toLocaleDateString('en-KE')} · {request.quantity} × {money(request.unit_price)} · {money(request.estimated_total)}{request.service_code === 'website_change' ? ' starting estimate' : ''}</small>
          <p>{request.details}</p>{request.materials && <p className="service-materials"><b>Materials:</b> {request.materials}</p>}{request.preferred_date && <small>Preferred date: {request.preferred_date}</small>}
          <label>Progress<select value={request.status} disabled={updating === request.id} onChange={event => updateStatus(request, event.target.value)}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
          <small>Status is managed by signed-in store administrators. Approval here does not record a payment.</small>
        </article>)}
      </div>
    </div>
  </section>
}
