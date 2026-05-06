'use client'

import { useMemo } from 'react'
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
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useSettings() {
  const { data, isLoading, error } = useSWR<AppSettings>('/api/settings', fetcher, {
    fallbackData: defaultSettings,
    revalidateOnFocus: false,
  })

  const settings = useMemo(
    () => ({
      ...defaultSettings,
      ...(data || {}),
    }),
    [data]
  )

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const merged = { ...settings, ...newSettings }
    mutate('/api/settings', merged, false)

    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      mutate('/api/settings')
    } catch (err) {
      console.error('Error updating settings:', err)
      mutate('/api/settings')
    }
  }

  const updateSetting = async (key: keyof AppSettings, value: string) => {
    await updateSettings({ [key]: value })
  }

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    updateSetting,
  }
}
