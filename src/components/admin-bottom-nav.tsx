'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Flag, Home, Trophy } from 'lucide-react'

const ITEMS = [
  { label: 'Quản lý', href: '/quan-ly?admin=1', icon: BarChart3 },
  { label: 'NC Link', href: '/nc-link', icon: Home },
  { label: 'Thi đua', href: '/thi-dua-chau', icon: Trophy },
  { label: 'KPI', href: '/', icon: Flag },
]

export function AdminBottomNav() {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      void fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(result => { if (!cancelled) setAuthenticated(result?.authenticated === true) })
        .catch(() => {})
    }
    refresh()
    const interval = window.setInterval(refresh, 2500)
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [])

  if (!authenticated) return null

  return (
    <nav className="admin-bottom-nav" aria-label="Điều hướng quản trị">
      {ITEMS.map(({ label, href, icon: Icon }) => (
        <a key={label} href={href} title={label}>
          <Icon size={16} aria-hidden="true" />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  )
}
