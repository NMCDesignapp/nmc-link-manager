'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Wrench } from 'lucide-react'

type MaintenanceGateProps = {
  standalone?: boolean
}

const MAINTENANCE_KEY = 'nmc-maintenance-mode'

export function MaintenanceGate({ standalone = false }: MaintenanceGateProps) {
  const pathname = usePathname()
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' })
        if (!response.ok) return
        const settings = await response.json() as Record<string, string>
        if (!cancelled) {
          setEnabled(settings[MAINTENANCE_KEY] === '1')
          setReady(true)
        }
      } catch {
        if (!cancelled) setReady(true)
      }
    }

    load()
    timer = setInterval(load, 3000)

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('nmc-maintenance')
      channel.onmessage = (event) => {
        if (event?.data?.key === MAINTENANCE_KEY) {
          setEnabled(event.data.value === '1')
          setReady(true)
        } else {
          load()
        }
      }
    } catch {}

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'nmc-maintenance-changed') load()
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      if (channel) channel.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const isMainKpi = pathname === '/kpi' || pathname.startsWith('/kpi/') || pathname.startsWith('/kpi-standalone')
  const shouldCover = standalone || isMainKpi

  if (!ready || !enabled || !shouldCover) return null

  return (
    <div
      className="fixed inset-0 z-[2147483000] flex items-center justify-center p-5"
      style={{
        background: 'radial-gradient(circle at 50% 35%, #183448 0%, #0c1f2d 38%, #07131d 72%, #040b11 100%)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Ứng dụng đang bảo trì"
    >
      <div
        className="w-full max-w-md rounded-[26px] px-6 py-8 text-center"
        style={{
          background: '#152a39',
          border: '1px solid #3f6278',
          boxShadow: '0 28px 80px rgba(0,0,0,.58), inset 0 1px 0 rgba(255,255,255,.08)',
        }}
      >
        <div
          className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full"
          style={{
            background: '#d9912e',
            color: '#fff7e6',
            boxShadow: '0 10px 28px rgba(217,145,46,.35), inset 0 1px 0 rgba(255,255,255,.28)',
          }}
        >
          <Wrench className="h-7 w-7" strokeWidth={2.4} />
        </div>
        <div className="text-[11px] font-extrabold uppercase tracking-[.24em] text-[#8fb6ca]">
          NC-Link system
        </div>
        <h1 className="mt-2 text-xl font-black leading-tight text-white sm:text-2xl">
          App đang bảo trì và nâng cấp
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#b9cbd6]">
          Hệ thống KPI đang được cập nhật. Vui lòng quay lại sau ít phút.
        </p>
        <div className="mx-auto mt-6 h-1.5 w-28 overflow-hidden rounded-full bg-[#0a1822]">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-[#4aa8d8]" />
        </div>
      </div>
    </div>
  )
}
