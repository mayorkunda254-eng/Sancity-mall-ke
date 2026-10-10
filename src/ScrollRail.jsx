import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function ScrollRail({ label, className, cards = false, children }) {
  const rail = useRef(null)
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [edges, setEdges] = useState({ start: true, end: false })
  useEffect(() => {
    const element = rail.current
    const update = () => setEdges({ start: element.scrollLeft < 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 })
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => { element.removeEventListener('scroll', update); observer.disconnect() }
  }, [children])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (paused || interacting || reducedMotion) return
    const timer = window.setInterval(() => {
      const element = rail.current
      if (document.hidden || !element || element.scrollWidth <= element.clientWidth + 2) return
      const bounds = element.getBoundingClientRect()
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
      const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2
      element.scrollTo({ left: atEnd ? 0 : element.scrollLeft + element.clientWidth * .65, behavior: 'smooth' })
    }, 4500)
    return () => window.clearInterval(timer)
  }, [paused, interacting, reducedMotion])
  const slide = (direction) => rail.current.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  return <div className={`scroll-rail ${cards ? 'department-carousel' : 'chip-carousel'}`} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }} onTouchStart={() => setPaused(true)}>
    <div className="rail-toolbar"><span>{cards ? 'Discover your next home favourite' : 'Explore this department'}</span><div>
      <button type="button" disabled={edges.start} onClick={() => slide(-1)} aria-label={`Previous ${label}`}><ArrowLeft size={18}/></button>
      <button type="button" disabled={edges.end} onClick={() => slide(1)} aria-label={`Next ${label}`}><ArrowRight size={18}/></button>
    </div></div>
    <nav ref={rail} className={`rail-track ${className}`} aria-label={label} tabIndex={0}>{children}</nav>
  </div>
}
