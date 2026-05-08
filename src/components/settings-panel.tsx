'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Settings, Palette, Zap, Volume2, Vibrate, User, Save, Plus, BarChart3, Database, Link2, Star, Edit, Trash2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings, AppSettings, defaultSettings } from '@/hooks/use-settings'
import { Link } from '@/lib/types'
import { motion, AnimatePresence, overlayVariants, modalVariants, staggerContainer, staggerItem } from '@/lib/animations'
import useSWR, { mutate } from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fetch error')
  return res.json()
}

const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
}

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onAddLink: () => void
  onEditLink: (link: Link) => void
  onOpenStats: () => void
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
  { name: 'Chậm', value: 'slow' },
  { name: 'Bình thường', value: 'normal' },
  { name: 'Nhanh', value: 'fast' },
]

export function SettingsPanel({ isOpen, onClose, onAddLink, onEditLink, onOpenStats }: SettingsPanelProps) {
  const { settings, updateSettings, isLoading } = useSettings()
  const { data: linksData } = useSWR<Link[]>('/api/links', fetcher)
  const [localSettings, setLocalSettings] = useState<AppSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showLinkManager, setShowLinkManager] = useState(false)
  const initializedRef = useRef(false)

  const links = Array.isArray(linksData) ? linksData : []
  const neonColor = localSettings.neon_color || '#00ff88'

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
      setShowLinkManager(false)
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
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nmc-app-settings')
        const current = stored ? JSON.parse(stored) : {}
        localStorage.setItem('nmc-app-settings', JSON.stringify({ ...current, neon_color: color }))
      }
    } catch {
      // ignore
    }
  }

  const handleDeleteLink = async (id: number) => {
    if (confirm('Bạn có chắc muốn xóa liên kết này?')) {
      try {
        await fetch(`/api/links/${id}`, { method: 'DELETE' })
        mutate('/api/links')
        mutate('/api/stats')
      } catch (error) {
        console.error('Failed to delete link:', error)
      }
    }
  }

  const handleToggleFavorite = async (id: number, isFavorite: boolean) => {
    try {
      await fetch(`/api/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      })
      mutate('/api/links')
      mutate('/api/stats')
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
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
            style={{ background: '#141420', border: `1px solid ${neonColor}20` }}
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
                  <Settings className="w-5 h-5" style={{ color: neonColor }} />
                </motion.div>
                <h2 className="text-base font-semibold">Cài đặt</h2>
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
                {/* Quick Actions */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Thao tác nhanh</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      onClick={() => {
                        onClose()
                        onAddLink()
                      }}
                      className="py-2.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 neon-btn neon-press"
                      style={{ color: neonColor, background: `${neonColor}10`, border: `1px solid ${neonColor}30` }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm link
                    </motion.button>
                    <motion.button
                      onClick={() => setShowLinkManager(!showLinkManager)}
                      className="py-2.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 smooth-transition"
                      style={{
                        background: showLinkManager ? `${neonColor}20` : `${neonColor}10`,
                        border: `1px solid ${neonColor}30`,
                        color: neonColor,
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Quản lý link
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        onClose()
                        onOpenStats()
                      }}
                      className="py-2.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 smooth-transition"
                      style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#00d4ff' }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Thống kê
                    </motion.button>
                  </div>
                </motion.div>

                {/* Link Manager - collapsible */}
                <AnimatePresence>
                  {showLinkManager && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {links.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">Chưa có liên kết nào</p>
                        ) : (
                          links.map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center gap-2 p-2 rounded-lg"
                              style={{
                                background: `${neonColor}08`,
                                border: `1px solid ${neonColor}15`,
                              }}
                            >
                              <div
                                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                                style={{ background: `${neonColor}15` }}
                              >
                                {(() => {
                                  const IconComp = ICON_MAP[link.icon || 'globe'] || Globe
                                  return <IconComp className="w-3.5 h-3.5" style={{ color: neonColor }} />
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="block text-xs font-medium truncate">{link.title}</span>
                                <span className="block text-[10px] text-muted-foreground truncate">{link.url || link.link_type}</span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <motion.button
                                  onClick={() => handleToggleFavorite(link.id, !link.is_favorite)}
                                  className="p-1 rounded"
                                  whileTap={{ scale: 0.85 }}
                                >
                                  <Star className={cn('w-3 h-3', link.is_favorite && 'fill-yellow-400 text-yellow-400')} />
                                </motion.button>
                                <motion.button
                                  onClick={() => {
                                    onClose()
                                    setTimeout(() => onEditLink(link), 300)
                                  }}
                                  className="p-1 rounded hover:bg-white/10"
                                  whileTap={{ scale: 0.85 }}
                                >
                                  <Edit className="w-3 h-3" />
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="p-1 rounded text-red-400 hover:bg-red-400/10"
                                  whileTap={{ scale: 0.85 }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </motion.button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile Section */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    <span>Hồ sơ</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={localSettings.profile_name}
                      onChange={e => handleChange('profile_name', e.target.value)}
                      placeholder="Tên hiển thị"
                      className="w-full px-3 py-2.5 rounded-lg text-sm neon-input"
                      style={{ background: '#1a1a2e' }}
                    />
                    <input
                      type="text"
                      value={localSettings.profile_bio}
                      onChange={e => handleChange('profile_bio', e.target.value)}
                      placeholder="Mô tả ngắn"
                      className="w-full px-3 py-2.5 rounded-lg text-sm neon-input"
                      style={{ background: '#1a1a2e' }}
                    />
                  </div>
                </motion.div>

                {/* Data Source - CSV URL */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="w-3.5 h-3.5" />
                    <span>Nguồn dữ liệu thi đua</span>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={localSettings.csv_url}
                      onChange={e => handleChange('csv_url', e.target.value)}
                      placeholder="Google Sheets CSV URL"
                      className="w-full px-3 py-2.5 rounded-lg text-xs font-mono neon-input"
                      style={{ background: '#1a1a2e' }}
                    />
                    <p className="text-[10px] text-muted-foreground/60">Liên kết Google Sheets (CSV) để đồng bộ dữ liệu hợp đồng cho trang thi đua</p>
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
                    <span>Màu neon</span>
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
                    <span>Tốc độ hiệu ứng</span>
                  </div>
                  <div className="flex gap-2">
                    {ANIMATION_SPEEDS.map(speed => (
                      <motion.button
                        key={speed.value}
                        onClick={() => handleChange('animation_speed', speed.value)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg text-sm font-medium smooth-transition neon-press',
                          localSettings.animation_speed === speed.value
                            ? 'text-primary'
                            : 'bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10'
                        )}
                        style={localSettings.animation_speed === speed.value ? {
                          background: `${neonColor}15`,
                          border: `1px solid ${neonColor}30`,
                        } : {}}
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
                    { key: 'enable_neon_effects' as const, icon: Zap, label: 'Hiệu ứng neon' },
                    { key: 'enable_haptic' as const, icon: Vibrate, label: 'Rung phản hồi' },
                    { key: 'enable_sound' as const, icon: Volume2, label: 'Âm thanh' },
                  ].map((toggle) => (
                    <label
                      key={toggle.key}
                      className="flex items-center justify-between p-3 rounded-lg cursor-pointer smooth-transition hover:bg-white/5"
                      style={{ background: '#1a1a2e' }}
                    >
                      <div className="flex items-center gap-2">
                        <toggle.icon className="w-4 h-4" style={{ color: neonColor }} />
                        <span className="text-sm">{toggle.label}</span>
                      </div>
                      <motion.button
                        onClick={() => handleChange(toggle.key, localSettings[toggle.key] === 'true' ? 'false' : 'true')}
                        className={cn(
                          'w-11 h-6 rounded-full smooth-transition relative',
                          localSettings[toggle.key] === 'true' ? '' : 'bg-white/20'
                        )}
                        style={localSettings[toggle.key] === 'true' ? { background: neonColor } : {}}
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
                      )}
                      style={{ color: neonColor }}
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
                      {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
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
