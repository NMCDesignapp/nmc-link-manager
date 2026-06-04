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

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.')
  }
  return res.json()
}

export function useSettings() {
  const pendingUpdatesRef = useRef<Partial<AppSettings> | null>(null)
  const initialColorAppliedRef = useRef(false)

  const { data, isLoading, error } = useSWR<AppSettings>('/api/settings', fetcher, {
    fallbackData: defaultSettings,
    revalidateOnFocus: true,
    dedupingInterval: 30000,
  })

  // Apply neon color from server data on first load
  useEffect(() => {
    if (data?.neon_color && !initialColorAppliedRef.current) {
      document.documentElement.style.setProperty('--primary', data.neon_color)
      initialColorAppliedRef.current = true
    }
  }, [data])

  const settings = useMemo(() => {
    // Priority: server data > defaults (NO localStorage)
    const merged = {
      ...defaultSettings,
      ...(data && !error ? data : {}),
    }

    // Apply any pending optimistic updates
    if (pendingUpdatesRef.current) {
      Object.assign(merged, pendingUpdatesRef.current)
    }

    return merged
  }, [data, error])

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    // Optimistic update
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...newSettings }

    // Apply neon color to DOM immediately
    if (newSettings.neon_color) {
      document.documentElement.style.setProperty('--primary', newSettings.neon_color)
    }

    // Optimistically update SWR cache
    mutate('/api/settings', (current: AppSettings | undefined) => ({
      ...(current || defaultSettings),
      ...newSettings,
    }), false)

    // Save to server (online only - no localStorage fallback)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      pendingUpdatesRef.current = null
      mutate('/api/settings')
    } catch (err) {
      console.warn('Server sync failed:', err)
      mutate('/api/settings')
    }
  }, [])

  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    await updateSettings({ [key]: value })
  }, [updateSettings])

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateSetting,
  }
}
