'use client'

/**
 * AppDataContext — STANDALONE SHIM cho kpi-app.
 *
 * Cung cấp CHÍNH XÁC cùng interface `useAppData()` như main app
 * (`src/lib/app-data-context.tsx`), để page.tsx có thể được sync 1:1
 * từ `src/app/kpi/page.tsx` mà không cần sửa code.
 *
 * Khác biệt duy nhất: standalone app tự fetch dữ liệu (không có
 * layout-level preload như main app), nhưng vẫn preload 1 lần khi
 * AppDataProvider mount → tương tự hành vi main app.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

export interface AppData {
  leaders: any[]
  revenue: any[]
  contracts: any[]
  staff: any[]
  recruiters: any[]
  tuyenNgang: any[]
  structurePhong: any[]
  structureAd: any[]
  structureBanNhom: any[]
  structureTvv: any[]
  clbMembers: any[]
  pendingMembers: any[]
  quanLyAll: { contracts?: any[]; staff?: any[]; revenue?: any[]; leaders?: any[]; tvvStruct?: any[] } | null
  settings: Record<string, string> | null
  contests: any[]
}

const initialData: AppData = {
  leaders: [],
  revenue: [],
  contracts: [],
  staff: [],
  recruiters: [],
  tuyenNgang: [],
  structurePhong: [],
  structureAd: [],
  structureBanNhom: [],
  structureTvv: [],
  clbMembers: [],
  pendingMembers: [],
  quanLyAll: null,
  settings: null,
  contests: [],
}

interface AppDataContextValue {
  data: AppData
  isLoading: boolean
  isReloading: boolean
  lastSync: Date | null
  reload: () => Promise<void>
  dataVersion: number
}

const AppDataContext = createContext<AppDataContextValue>({
  data: initialData,
  isLoading: true,
  isReloading: false,
  lastSync: null,
  reload: async () => {},
  dataVersion: 0,
})

const fetchJson = async (url: string): Promise<any> => {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const initialized = useRef(false)
  const inflight = useRef<Promise<void> | null>(null)

  const loadAll = useCallback(async (): Promise<void> => {
    if (inflight.current) return inflight.current

    const p = (async () => {
      // Standalone kpi-app chỉ có một số API route (không có leaders/revenue/
      // recruiters/tuyenNgang/clbMembers/pendingMembers/contests standalone).
      // Nhưng thử fetch hết — nếu route không tồn tại sẽ trả null → mảng [].
      const [
        leaders, revenue, contracts, staff, recruiters, tuyenNgang,
        structurePhong, structureAd, structureBanNhom, structureTvv,
        clbMembers, pendingMembers, quanLyAll, settings, contests,
      ] = await Promise.all([
        fetchJson('/api/leaders'),
        fetchJson('/api/revenue'),
        fetchJson('/api/contracts'),
        fetchJson('/api/staff'),
        fetchJson('/api/recruiters'),
        fetchJson('/api/tuyen-ngang'),
        fetchJson('/api/structure/phong'),
        fetchJson('/api/structure/ad'),
        fetchJson('/api/structure/bannhom'),
        fetchJson('/api/structure/tvv'),
        fetchJson('/api/clb-members'),
        fetchJson('/api/pending-members'),
        fetchJson('/api/quan-ly/all'),
        fetchJson('/api/settings'),
        fetchJson('/api/contests'),
      ])

      setData({
        leaders: leaders || [],
        revenue: revenue || [],
        contracts: contracts || [],
        staff: staff || [],
        recruiters: recruiters || [],
        tuyenNgang: tuyenNgang || [],
        structurePhong: structurePhong || [],
        structureAd: structureAd || [],
        structureBanNhom: structureBanNhom || [],
        structureTvv: structureTvv || [],
        clbMembers: clbMembers || [],
        pendingMembers: pendingMembers || [],
        quanLyAll: quanLyAll || null,
        settings: settings || null,
        contests: contests || [],
      })
      setLastSync(new Date())
      setDataVersion(v => v + 1)
    })()

    inflight.current = p
    try {
      await p
    } finally {
      inflight.current = null
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    loadAll().finally(() => setIsLoading(false))
  }, [loadAll])

  const reload = useCallback(async () => {
    setIsReloading(true)
    try {
      await loadAll()
    } finally {
      setIsReloading(false)
    }
  }, [loadAll])

  return (
    <AppDataContext.Provider value={{ data, isLoading, isReloading, lastSync, reload, dataVersion }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  return useContext(AppDataContext)
}
