'use client'

import { useMemo, useEffect, useCallback, useRef } from 'react'
import useSWR, { mutate } from 'swr'

export interface AppSettings {
  theme: string
  neon_color: string
  animation_speed: string
  enable_sound: string
  enable_haptic: string
  enable_neon_effects: string
  profile_name: string
  profile_bio: string
  csv_url: string
  csv_staff_url: string
  csv_nyd_url: string
}

export const defaultSettings: AppSettings = {
  theme: 'dark',
  neon_color: '#00ff88',
  animation_speed: 'normal',
  enable_sound: 'false',
  enable_haptic: 'true',
  enable_neon_effects: 'true',
  profile_name: 'N.M.C',
  profile_bio: 'Tat ca lien ket cua toi',
  csv_url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vStQqbaHb_1aP-hMzZCiVoeaSobXV5gwqw6iZBoQ0MgpsXiobO1GdCM5zoCoCxVBtxT_Nujjll_MJmC/pub?output=csv',
  csv_staff_url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSLOfLKaDdEL8EcAb6kaI6GKt3cFaXLxnwuCgeR63rmn2pQI0wC-aZswNRCDqvt87G0981ibFjmDNG1/pub?output=csv',
  csv_nyd_url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMzanBhPmqGXv2JXxYHkuaNiWC2YhzOAemkQao1FfW_l2a5-wJnjDeFnxvohS4ydTXusXVey8J3jdA/pub?output=csv',
}

const SETTINGS_STORAGE_KEY = 'nmc-app-settings'

// Helper: read settings from localStorage
function getLocalSettings(): AppSettings | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    // Merge with defaults to ensure all keys exist
    return { ...defaultSettings, ...parsed }
  } catch {
    return null
  }
}

// Helper: save settings to localStorage
function saveLocalSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    console.warn('Failed to save settings to localStorage')
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.')
  }
  return res.json()
}

export function useSettings() {
  const localSettingsRef = useRef<AppSettings | null>(null)
  const serverSyncedRef = useRef(false)

  const { data, isLoading, error } = useSWR<AppSettings>('/api/settings', fetcher, {
    fallbackData: defaultSettings,
    revalidateOnFocus: false,
    // Only try to fetch from server, but don't block on it
    dedupingInterval: 60000,
  })

  // Initialize local settings on mount
  useEffect(() => {
    const local = getLocalSettings()
    if (local) {
      localSettingsRef.current = local
      // Apply neon color to DOM immediately
      if (local.neon_color) {
        document.documentElement.style.setProperty('--primary', local.neon_color)
      }
    }
  }, [])

  const settings = useMemo(() => {
    // Priority: local storage > server data > defaults
    // Local MUST win over server to prevent race conditions where
    // stale server data overwrites recent local changes
    const local = localSettingsRef.current || getLocalSettings()
    const merged = {
      ...defaultSettings,
      ...(data && !error ? data : {}),
      ...(local || {}),  // Local LAST = highest priority
    }

    // Cache locally for next access
    if (local) {
      localSettingsRef.current = local
    }

    return merged
  }, [data, error])

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const current = localSettingsRef.current || getLocalSettings() || defaultSettings
    const merged = { ...current, ...newSettings }

    // ALWAYS save to localStorage first (instant, persistent)
    localSettingsRef.current = merged
    saveLocalSettings(merged)

    // Apply neon color to DOM immediately
    if (newSettings.neon_color) {
      document.documentElement.style.setProperty('--primary', newSettings.neon_color)
    }

    // Optimistically update SWR cache
    mutate('/api/settings', merged, false)

    // Try to sync to server (best-effort, won't block UI)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      serverSyncedRef.current = true
      mutate('/api/settings')
    } catch (err) {
      // Server sync failed, but local storage is already saved
      console.warn('Server sync failed, settings saved locally:', err)
      // Still revalidate to keep SWR in sync
      mutate('/api/settings')
    }
  }, [])

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    await updateSettings({ [key]: value })
  }, [updateSettings])

  // Sync server data to localStorage on first successful load
  // Only sync if there's NO local data at all
  useEffect(() => {
    if (data && !error && !isLoading && !serverSyncedRef.current) {
      const local = getLocalSettings()
      // Only update localStorage from server if local doesn't exist at all
      // This prevents server data from overwriting recent local changes
      if (!local) {
        const serverSettings = { ...defaultSettings, ...data }
        localSettingsRef.current = serverSettings
        saveLocalSettings(serverSettings)
        if (serverSettings.neon_color) {
          document.documentElement.style.setProperty('--primary', serverSettings.neon_color)
        }
      }
      serverSyncedRef.current = true
    }
  }, [data, error, isLoading])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateSetting,
  }
}
