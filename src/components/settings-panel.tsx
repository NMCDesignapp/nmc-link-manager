'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Settings, Palette, Zap, Volume2, Vibrate, User, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings, AppSettings, defaultSettings } from '@/hooks/use-settings'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const NEON_COLORS = [
  { name: 'Neon Green', value: '#00ff88' },
  { name: 'Cyber Blue', value: '#00d4ff' },
  { name: 'Electric Purple', value: '#bf00ff' },
  { name: 'Hot Pink', value: '#ff0080' },
  { name: 'Sunset Orange', value: '#ff6600' },
  { name: 'Golden Yellow', value: '#ffcc00' },
]

const ANIMATION_SPEEDS = [
  { name: 'Cham', value: 'slow' },
  { name: 'Binh thuong', value: 'normal' },
  { name: 'Nhanh', value: 'fast' },
]

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings, isLoading } = useSettings()
  const [localSettings, setLocalSettings] = useState<AppSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (settings && !isLoading && !initializedRef.current) {
      setLocalSettings(settings)
      initializedRef.current = true
    }
  }, [settings, isLoading])

  useEffect(() => {
    if (isOpen && settings) {
      setLocalSettings(settings)
      setHasChanges(false)
    }
  }, [isOpen, settings])

  const checkChanges = (newLocal: AppSettings) => {
    const changed = JSON.stringify(newLocal) !== JSON.stringify(settings)
    setHasChanges(changed)
  }

  const handleChange = (key: keyof AppSettings, value: string) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    checkChanges(newSettings)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      setHasChanges(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleColorChange = (color: string) => {
    handleChange('neon_color', color)
    document.documentElement.style.setProperty('--primary', color)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-xl p-5 max-h-[90vh] overflow-y-auto modal-enter"
        style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold">Cai dat</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 smooth-transition neon-press">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg skeleton-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Profile Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span>Ho so</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={localSettings.profile_name}
                  onChange={e => handleChange('profile_name', e.target.value)}
                  placeholder="Ten hien thi"
                  className="w-full px-3 py-2.5 rounded-lg text-sm neon-input"
                  style={{ background: '#1a1a2e' }}
                />
                <input
                  type="text"
                  value={localSettings.profile_bio}
                  onChange={e => handleChange('profile_bio', e.target.value)}
                  placeholder="Mo ta ngan"
                  className="w-full px-3 py-2.5 rounded-lg text-sm neon-input"
                  style={{ background: '#1a1a2e' }}
                />
              </div>
            </div>

            {/* Neon Color */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Palette className="w-3.5 h-3.5" />
                <span>Mau neon</span>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {NEON_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    className={cn(
                      'w-full aspect-square rounded-lg smooth-transition neon-press',
                      localSettings.neon_color === color.value && 'ring-2 ring-white ring-offset-2 ring-offset-[#141420]'
                    )}
                    style={{
                      background: color.value,
                      boxShadow: localSettings.neon_color === color.value ? `0 0 20px ${color.value}` : 'none',
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Animation Speed */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5" />
                <span>Toc do hieu ung</span>
              </div>
              <div className="flex gap-2">
                {ANIMATION_SPEEDS.map(speed => (
                  <button
                    key={speed.value}
                    onClick={() => handleChange('animation_speed', speed.value)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-sm font-medium smooth-transition neon-press',
                      localSettings.animation_speed === speed.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
                    )}
                  >
                    {speed.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer smooth-transition hover:bg-white/5"
                style={{ background: '#1a1a2e' }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm">Hieu ung neon</span>
                </div>
                <button
                  onClick={() => handleChange('enable_neon_effects', localSettings.enable_neon_effects === 'true' ? 'false' : 'true')}
                  className={cn(
                    'w-11 h-6 rounded-full smooth-transition relative',
                    localSettings.enable_neon_effects === 'true' ? 'bg-primary' : 'bg-white/20'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white smooth-transition',
                      localSettings.enable_neon_effects === 'true' ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </label>

              <label
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer smooth-transition hover:bg-white/5"
                style={{ background: '#1a1a2e' }}
              >
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-primary" />
                  <span className="text-sm">Rung phan hoi</span>
                </div>
                <button
                  onClick={() => handleChange('enable_haptic', localSettings.enable_haptic === 'true' ? 'false' : 'true')}
                  className={cn(
                    'w-11 h-6 rounded-full smooth-transition relative',
                    localSettings.enable_haptic === 'true' ? 'bg-primary' : 'bg-white/20'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white smooth-transition',
                      localSettings.enable_haptic === 'true' ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </label>

              <label
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer smooth-transition hover:bg-white/5"
                style={{ background: '#1a1a2e' }}
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span className="text-sm">Am thanh</span>
                </div>
                <button
                  onClick={() => handleChange('enable_sound', localSettings.enable_sound === 'true' ? 'false' : 'true')}
                  className={cn(
                    'w-11 h-6 rounded-full smooth-transition relative',
                    localSettings.enable_sound === 'true' ? 'bg-primary' : 'bg-white/20'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white smooth-transition',
                      localSettings.enable_sound === 'true' ? 'left-6' : 'left-1'
                    )}
                  />
                </button>
              </label>
            </div>

            {/* Save Button */}
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={cn(
                  'w-full py-3 rounded-xl font-medium text-sm',
                  'flex items-center justify-center gap-2 neon-btn neon-press',
                  'text-primary'
                )}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Dang luu...' : 'Luu thay doi'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
