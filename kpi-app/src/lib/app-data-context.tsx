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
const APP_DATA_CACHE_TTL_MS = 60 * 1000

const fetchJson = async (url: string): Promise<any> => {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

const readSessionCache = (): AppData | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = JSON.parse(sessionStorage.getItem(APP_DATA_CACHE_KEY) || 'null')
    if (!cached || Date.now() - cached.savedAt > APP_DATA_CACHE_TTL_MS) return null
    return cached.data as AppData
  } catch {
    return null
  }
}

const writeSessionCache = (data: AppData) => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // Session storage is only a performance layer; continue normally if it is full.
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
    if (!force) {
      const cached = readSessionCache()
      if (cached) {
        setData(cached)
        setLastSync(new Date())
        setDataVersion(v => v + 1)
        setLoadError(null)
        return
      }
    }
    setLoadError(null) // clear error trước khi load

    const p = (async () => {
      // KPI chỉ đọc dữ liệu khi mở; không chạy tác vụ sửa schema trong luồng người dùng.
      try {
        // Hiển thị dữ liệu lõi ngay khi /api/quan-ly/all sẵn sàng. Các nguồn
        // phụ tiếp tục tải nền để KPI tách có cùng hành vi dữ liệu với KPI Main.
        const settingsPromise = fetchJson('/api/settings') as Promise<Record<string, string> | null>
        const secondaryDataPromise = Promise.all([
          fetchJson('/api/recruiters'),
          fetchJson('/api/tuyen-ngang'),
          fetchJson('/api/structure/phong'),
          fetchJson('/api/structure/ad'),
          fetchJson('/api/structure/bannhom'),
          fetchJson('/api/structure/tvv'),
          fetchJson('/api/clb-members'),
          fetchJson('/api/pending-members'),
          fetchJson('/api/contests'),
        ])
        const quanLyAll = await fetchJson('/api/quan-ly/all')

        if (!force && quanLyAll) {
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
        writeSessionCache(nextData)
        // Secondary datasets can arrive while the KPI loader is fading. Mark the
        // large context update as non-urgent so it does not steal an animation frame.
        React.startTransition(() => {
          setData(nextData)
          setLastSync(new Date())
          setDataVersion(v => v + 1)
          setLoadError(null)
        })
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
      writeSessionCache(next)
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
