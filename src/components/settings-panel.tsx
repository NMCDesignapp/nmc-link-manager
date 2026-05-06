'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Settings, Palette, Zap, Volume2, Vibrate, User, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings, AppSettings, defaultSettings } from '@/hooks/use-settings'
import { motion, AnimatePresence, overlayVariants, modalVariants, popVariants, staggerContainer, staggerItem } from '@/lib/animations'

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
      initializedRef.current = true
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
          onClick={onClose}
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className="mx-4 w-full max-w-sm rounded-xl p-5 max-h-[90vh] overflow-y-auto"
            style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
            onClick={e => e.stopPropagation()}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between mb-5"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Settings className="w-5 h-5 text-primary" />
                </motion.div>
                <h2 className="text-base font-semibold">Cai dat</h2>
              </div>
              <motion.button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 smooth-transition neon-press"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    className="h-16 rounded-lg skeleton-pulse"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Profile Section */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
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
                </motion.div>

                {/* Neon Color */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Mau neon</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {NEON_COLORS.map((color, i) => (
                      <motion.button
                        key={color.value}
                        onClick={() => handleColorChange(color.value)}
                        className={cn(
                          'w-full aspect-square rounded-lg smooth-transition',
                          localSettings.neon_color === color.value && 'ring-2 ring-white ring-offset-2 ring-offset-[#141420]'
                        )}
                        style={{
                          background: color.value,
                          boxShadow: localSettings.neon_color === color.value ? `0 0 20px ${color.value}` : 'none',
                        }}
                        title={color.name}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 + i * 0.03, type: 'spring', stiffness: 300 }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Animation Speed */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Toc do hieu ung</span>
                  </div>
                  <div className="flex gap-2">
                    {ANIMATION_SPEEDS.map(speed => (
                      <motion.button
                        key={speed.value}
                        onClick={() => handleChange('animation_speed', speed.value)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg text-sm font-medium smooth-transition neon-press',
                          localSettings.animation_speed === speed.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        layout
                      >
                        {speed.name}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Toggles */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {[
                    { key: 'enable_neon_effects' as const, icon: Zap, label: 'Hieu ung neon' },
                    { key: 'enable_haptic' as const, icon: Vibrate, label: 'Rung phan hoi' },
                    { key: 'enable_sound' as const, icon: Volume2, label: 'Am thanh' },
                  ].map((toggle) => (
                    <label
                      key={toggle.key}
                      className="flex items-center justify-between p-3 rounded-lg cursor-pointer smooth-transition hover:bg-white/5"
                      style={{ background: '#1a1a2e' }}
                    >
                      <div className="flex items-center gap-2">
                        <toggle.icon className="w-4 h-4 text-primary" />
                        <span className="text-sm">{toggle.label}</span>
                      </div>
                      <motion.button
                        onClick={() => handleChange(toggle.key, localSettings[toggle.key] === 'true' ? 'false' : 'true')}
                        className={cn(
                          'w-11 h-6 rounded-full smooth-transition relative',
                          localSettings[toggle.key] === 'true' ? 'bg-primary' : 'bg-white/20'
                        )}
                      >
                        <motion.span
                          className="absolute top-1 w-4 h-4 rounded-full bg-white"
                          animate={{
                            left: localSettings[toggle.key] === 'true' ? '24px' : '4px',
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </label>
                  ))}
                </motion.div>

                {/* Save Button */}
                <AnimatePresence>
                  {hasChanges && (
                    <motion.button
                      onClick={handleSave}
                      disabled={isSaving}
                      className={cn(
                        'w-full py-3 rounded-xl font-medium text-sm',
                        'flex items-center justify-center gap-2 neon-btn neon-press',
                        'text-primary'
                      )}
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Save className="w-4 h-4" />
                      </motion.div>
                      {isSaving ? 'Dang luu...' : 'Luu thay doi'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
