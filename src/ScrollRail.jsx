import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function ScrollRail({ label, className, cards = false, children }) {
  const rail = useRef(null)
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
  const slide = (direction) => rail.current.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  return <div className={`scroll-rail ${cards ? 'department-carousel' : 'chip-carousel'}`}>
    <div className="rail-toolbar"><span>{cards ? 'Discover your next home favourite' : 'Explore this department'}</span><div>
      <button type="button" disabled={edges.start} onClick={() => slide(-1)} aria-label={`Previous ${label}`}><ArrowLeft size={18}/></button>
      <button type="button" disabled={edges.end} onClick={() => slide(1)} aria-label={`Next ${label}`}><ArrowRight size={18}/></button>
    </div></div>
    <nav ref={rail} className={`rail-track ${className}`} aria-label={label} tabIndex={0}>{children}</nav>
  </div>
}
