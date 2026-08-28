'use client'

/**
 * AppDataContext — Bộ tải dữ liệu toàn cục.
 *
 * Mục tiêu:
 *  - Khi ứng dụng nc-link.vercel.app được mở, preload tất cả dữ liệu 1 lần
 *    (contracts, leaders, revenue, staff, recruiters, tuyen-ngang,
 *     structure: phong/ad/bannhom/tvv, clb-members, pending-members,
 *     quan-ly/all, settings, contests).
 *  - Các trang con (KPI, Quản lý, Thi đua) đọc dữ liệu đã load từ context
 *    thay vì tự fetch khi mount → tránh reload mỗi lần đổi trang.
 *  - Hàm reload() để user ép đồng bộ toàn bộ (nút "Load dữ liệu" ở trang chính).
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
  isLoading: boolean       // true khi đang load lần đầu (app vừa mở)
  isReloading: boolean     // true khi user nhấn nút "Load dữ liệu"
  loadError: string | null // error message nếu load thất bại (null nếu OK)
  lastSync: Date | null
  reload: () => Promise<void>
  /** Bump version mỗi lần reload thành công — các trang useEffect vào [dataVersion] để sync local state */
  dataVersion: number
}

const AppDataContext = createContext<AppDataContextValue>({
  data: initialData,
  isLoading: true,
  isReloading: false,
  loadError: null,
  lastSync: null,
  reload: async () => {},
  dataVersion: 0,
})

const APP_DATA_CACHE_KEY = 'nmc-kpi-app-data-v1'
const APP_DATA_CACHE_STALE_MAX_MS = 12 * 60 * 60 * 1000

type CachedAppData = { savedAt: number; data: AppData }

const fetchJson = async (url: string): Promise<any> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000)
  try {
    const r = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const readWarmCache = (): CachedAppData | null => {
  if (typeof window === 'undefined') return null
  const entries: CachedAppData[] = []
  for (const storage of [sessionStorage, localStorage]) {
    try {
      const cached = JSON.parse(storage.getItem(APP_DATA_CACHE_KEY) || 'null') as CachedAppData | null
      if (!cached?.data || !cached.savedAt) continue
      if (Date.now() - cached.savedAt > APP_DATA_CACHE_STALE_MAX_MS) continue
      entries.push(cached)
    } catch {}
  }
  entries.sort((a, b) => b.savedAt - a.savedAt)
  return entries[0] || null
}

const writeWarmCache = (data: AppData) => {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify({ savedAt: Date.now(), data })
  for (const storage of [sessionStorage, localStorage]) {
    try {
      storage.setItem(APP_DATA_CACHE_KEY, payload)
    } catch {
      // Storage is only a performance layer.
    }
  }
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [isReloading, setIsReloading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [dataVersion, setDataVersion] = useState(0)
  const initialized = useRef(false)
  const inflight = useRef<Promise<void> | null>(null)

  const loadAll = useCallback(async (force = false): Promise<void> => {
    if (inflight.current) return inflight.current

    let usedWarmCache = false
    if (!force) {
      const cached = readWarmCache()
      if (cached) {
        usedWarmCache = true
        setData(cached.data)
        setLastSync(new Date(cached.savedAt))
        setDataVersion(v => v + 1)
        setLoadError(null)
        setIsLoading(false)
      }
    }
    setLoadError(null)

    const p = (async () => {
      // KPI chỉ đọc dữ liệu khi mở; không chạy tác vụ sửa schema trong luồng người dùng.
      try {
        // Fetch core first so a cold launch is not delayed by nine secondary calls.
        const settingsPromise = fetchJson('/api/settings') as Promise<Record<string, string> | null>
        const quanLyAll = await fetchJson('/api/quan-ly/all')

        if (!force && !usedWarmCache && quanLyAll) {
          const coreData: AppData = {
            ...initialData,
            leaders: quanLyAll.leaders || [],
            revenue: quanLyAll.revenue || [],
            contracts: quanLyAll.contracts || [],
            staff: quanLyAll.staff || [],
            quanLyAll,
          }
          setData(coreData)
          setLastSync(new Date())
          setDataVersion(v => v + 1)
          setIsLoading(false)
        }

        const secondaryDataPromise = Promise.all([
          fetchJson('/api/recruiters'),
          fetchJson('/api/tuyen-ngang'),
          fetchJson('/api/structure/phong'),
          fetchJson('/api/structure/ad'),
          fetchJson('/api/structure/bannhom'),
          fetchJson('/api/structure/tvv'),
          fetchJson('/api/clb-members'),
          fetchJson('/api/pending-members'),
          fetchJson('/api/contests?summary=1'),
        ])

        const settings = await settingsPromise
        const [
          recruiters, tuyenNgang, structurePhong, structureAd, structureBanNhom,
          structureTvv, clbMembers, pendingMembers, contests,
        ] = await secondaryDataPromise

        // /api/quan-ly/all is the single source for the four largest tables.
        // Avoid fetching the same contracts/revenue/staff/leaders a second time.
        const nextData: AppData = {
          leaders: quanLyAll?.leaders || [],
          revenue: quanLyAll?.revenue || [],
          contracts: quanLyAll?.contracts || [],
          staff: quanLyAll?.staff || [],
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
        }
        setData(nextData)
        writeWarmCache(nextData)
        setLastSync(new Date())
        setDataVersion(v => v + 1)
        setLoadError(null)
      } catch (err: any) {
        const msg = err?.message || String(err) || 'Lỗi không xác định khi tải dữ liệu'
        console.error('[AppDataProvider] loadAll error:', msg)
        setLoadError(msg)
        throw err
      }
    })()

    inflight.current = p
    try {
      await p
    } finally {
      inflight.current = null
    }
  }, [])

  // Refresh only the registration lock setting so the independent KPI updates
  // quickly without reloading all KPI data.
  const refreshTargetRegistrationSetting = useCallback(async () => {
    const latestSettings = await fetchJson('/api/settings') as Record<string, string> | null
    if (!latestSettings) return

    const nextValue = latestSettings['kpi-target-registration-open'] ?? '1'
    setData((previous) => {
      const currentValue = previous.settings?.['kpi-target-registration-open'] ?? '1'
      if (currentValue === nextValue) return previous
      const next = {
        ...previous,
        settings: { ...(previous.settings || {}), 'kpi-target-registration-open': nextValue },
      }
      writeWarmCache(next)
      return next
    })
  }, [])

  // Auto-load 1 lần khi app mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    loadAll().finally(() => setIsLoading(false))
  }, [loadAll])

  // Same-domain tabs receive an instant signal; the 4-second poll also covers
  // the separate KPI deployment, which is hosted on another origin.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void refreshTargetRegistrationSetting()
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'nmc-kpi-settings-changed') refresh()
    }
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('nmc-kpi-settings')
      channel.onmessage = refresh
    } catch {}
    const intervalId = window.setInterval(refresh, 4_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
      channel?.close()
    }
  }, [refreshTargetRegistrationSetting])

  // Keep the standalone KPI fresh without showing the startup gate again.
  useEffect(() => {
    const refreshInBackground = () => {
      if (document.visibilityState !== 'visible') return
      void loadAll(true).catch(() => {})
    }
    const intervalId = window.setInterval(refreshInBackground, 60_000)
    window.addEventListener('focus', refreshInBackground)
    document.addEventListener('visibilitychange', refreshInBackground)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshInBackground)
      document.removeEventListener('visibilitychange', refreshInBackground)
    }
  }, [loadAll])

  const reload = useCallback(async () => {
    setIsReloading(true)
    try {
      await loadAll(true)
    } finally {
      setIsReloading(false)
      setIsLoading(false) // ensure isLoading=false sau retry (dù thành/bại)
    }
  }, [loadAll])

  return (
    <AppDataContext.Provider value={{ data, isLoading, isReloading, loadError, lastSync, reload, dataVersion }}>
      {children}
    </AppDataContext.Provider>
  )
}

export function useAppData() {
  return useContext(AppDataContext)
}