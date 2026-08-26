'use client'

import Link from 'next/link'
import { BarChart3, Database, Home, Trophy } from 'lucide-react'

type MainAppBottomNavProps = {
  active: 'management' | 'contest'
}

const ITEMS = [
  { key: 'home', label: 'Trang chủ', href: '/', icon: Home },
  { key: 'management', label: 'Quản lý', href: '/quan-ly', icon: Database },
  { key: 'contest', label: 'Thi đua', href: '/thi-dua-chau', icon: Trophy },
  { key: 'kpi', label: 'KPI', href: '/kpi', icon: BarChart3 },
] as const

export function MainAppBottomNav({ active }: MainAppBottomNavProps) {
  return (
    <nav className="nmc-main-bottom-nav" aria-label="Điều hướng ứng dụng chính">
      {ITEMS.map((item) => {
        const Icon = item.icon
        const selected = item.key === active

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`nmc-main-bottom-nav-item${selected ? ' is-active' : ''}`}
            aria-current={selected ? 'page' : undefined}
          >
            <span className="nmc-main-bottom-nav-icon"><Icon aria-hidden="true" /></span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
