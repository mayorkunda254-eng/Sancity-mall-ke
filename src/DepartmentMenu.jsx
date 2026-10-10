import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { categoryPath } from './lib/categories.js'

export function DepartmentLinks({ groups, collapsible = false }) {
  return <div className="department-directory">
    {groups.map(group => <details key={group.slug} className="department-directory-group" open={collapsible ? undefined : true}>
      <summary>{group.short}<span>{group.count}</span></summary>
      <a className="department-view-all" href={categoryPath(group)}>View all {group.short.toLowerCase()} <span>{group.count}</span></a>
      {group.children.map(child => <a key={child.slug} href={categoryPath(group, child)}>{child.name}<span>{child.count}</span></a>)}
    </details>)}
  </div>
}

export default function DepartmentMenu({ groups }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = event => {
      if (event.type === 'keydown' && event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      } else if (event.type === 'pointerdown' && !root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [open])
  return <div className="department-menu" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={trigger} className="all-departments" aria-expanded={open} aria-controls="department-directory" onClick={() => setOpen(value => !value)}>
      <Menu size={18} /> All Departments <ChevronDown size={15} />
    </button>
    {open && <nav id="department-directory" className="department-menu-panel" aria-label="All departments and subcategories">
      <div className="department-menu-heading"><strong>Find what your home needs</strong><button onClick={() => { setOpen(false); trigger.current?.focus() }} aria-label="Close departments"><X size={18} /></button></div>
      <DepartmentLinks groups={groups} />
      <a className="department-browse-all" href="/#products">Browse all products</a>
    </nav>}
  </div>
}
