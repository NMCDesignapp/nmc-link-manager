'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Settings, Palette, Zap, Volume2, Vibrate, User, Save, Plus, BarChart3, Database, Link2, Star, Edit, Trash2, Globe, Users, ChevronDown, ChevronRight, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings, AppSettings, defaultSettings } from '@/hooks/use-settings'
import { Link } from '@/lib/types'
import { motion, AnimatePresence, overlayVariants, modalVariants } from '@/lib/animations'
import useSWR, { mutate } from 'swr'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fetch error')
  return res.json()
}

const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe,
}

interface StaffMember {
  id: string
  agentCode: string
  agentName: string
  position: string
  ban: string
  nhom: string
  maNhom: string
  leaderAgentCode: string
  recruiterCode: string
  startDate: string | null
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
  const { data: staffData, mutate: mutateStaff } = useSWR<StaffMember[]>('/api/staff', fetcher)
  const [localSettings, setLocalSettings] = useState<AppSettings>(defaultSettings)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showLinkManager, setShowLinkManager] = useState(false)
  const [showStaffManager, setShowStaffManager] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [staffForm, setStaffForm] = useState({ agentCode: '', agentName: '', position: '', ban: '', nhom: '', maNhom: '', leaderAgentCode: '' })
  const initializedRef = useRef(false)

  const links = Array.isArray(linksData) ? linksData : []
  const staff = Array.isArray(staffData) ? staffData : []
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
      setShowStaffManager(false)
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

  // Staff management handlers
  const handleAddStaff = async () => {
    if (!staffForm.agentCode || !staffForm.agentName) return
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })
      if (res.ok) {
        mutateStaff()
        setStaffForm({ agentCode: '', agentName: '', position: '', ban: '', nhom: '', maNhom: '', leaderAgentCode: '' })
        setShowAddStaff(false)
      }
    } catch (error) {
      console.error('Failed to add staff:', error)
    }
  }

  const handleUpdateStaff = async (id: string) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })
      if (res.ok) {
        mutateStaff()
        setEditingStaffId(null)
        setStaffForm({ agentCode: '', agentName: '', position: '', ban: '', nhom: '', maNhom: '', leaderAgentCode: '' })
      }
    } catch (error) {
      console.error('Failed to update staff:', error)
    }
  }

  const handleDeleteStaff = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa nhân sự này?')) {
      try {
        await fetch(`/api/staff/${id}`, { method: 'DELETE' })
        mutateStaff()
      } catch (error) {
        console.error('Failed to delete staff:', error)
      }
    }
  }

  const handleClearAllStaff = async () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ danh sách nhân sự?')) {
      try {
        await fetch('/api/staff', { method: 'DELETE' })
        mutateStaff()
      } catch (error) {
        console.error('Failed to clear staff:', error)
      }
    }
  }

  const startEditStaff = (s: StaffMember) => {
    setEditingStaffId(s.id)
    setStaffForm({
      agentCode: s.agentCode, agentName: s.agentName, position: s.position,
      ban: s.ban, nhom: s.nhom, maNhom: s.maNhom, leaderAgentCode: s.leaderAgentCode,
    })
    setShowAddStaff(true)
  }

  // Group staff by maNhom
  const groupedStaff = staff.reduce((acc, s) => {
    const key = s.maNhom || '_none'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<string, StaffMember[]>)

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
                  <div className="grid grid-cols-4 gap-1.5">
                    <motion.button
                      onClick={() => {
                        onClose()
                        onAddLink()
                      }}
                      className="py-2 px-1 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center gap-1 neon-btn neon-press"
                      style={{ color: neonColor, background: `${neonColor}10`, border: `1px solid ${neonColor}30` }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm link
                    </motion.button>
                    <motion.button
                      onClick={() => setShowLinkManager(!showLinkManager)}
                      className="py-2 px-1 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center gap-1 smooth-transition"
                      style={{
                        background: showLinkManager ? `${neonColor}20` : `${neonColor}10`,
                        border: `1px solid ${neonColor}30`,
                        color: neonColor,
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      QL link
                    </motion.button>
                    <motion.button
                      onClick={() => setShowStaffManager(!showStaffManager)}
                      className="py-2 px-1 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center gap-1 smooth-transition"
                      style={{
                        background: showStaffManager ? 'rgba(255, 160, 0, 0.2)' : 'rgba(255, 160, 0, 0.1)',
                        border: '1px solid rgba(255, 160, 0, 0.3)',
                        color: '#ffa000',
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Nhân sự
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        onClose()
                        onOpenStats()
                      }}
                      className="py-2 px-1 rounded-lg text-[10px] font-medium flex flex-col items-center justify-center gap-1 smooth-transition"
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

                {/* Staff Manager - collapsible */}
                <AnimatePresence>
                  {showStaffManager && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3">
                        {/* Staff header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" style={{ color: '#ffa000' }} />
                            <span className="text-xs font-medium" style={{ color: '#ffa000' }}>Danh sách nhân sự</span>
                            <span className="text-[10px] text-muted-foreground">({staff.length})</span>
                          </div>
                          <div className="flex gap-1">
                            <motion.button
                              onClick={() => {
                                setShowAddStaff(true)
                                setEditingStaffId(null)
                                setStaffForm({ agentCode: '', agentName: '', position: '', ban: '', nhom: '', maNhom: '', leaderAgentCode: '' })
                              }}
                              className="p-1 rounded text-amber-400 hover:bg-amber-400/10"
                              whileTap={{ scale: 0.85 }}
                              title="Thêm nhân sự"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </motion.button>
                            {staff.length > 0 && (
                              <motion.button
                                onClick={handleClearAllStaff}
                                className="p-1 rounded text-red-400 hover:bg-red-400/10"
                                whileTap={{ scale: 0.85 }}
                                title="Xóa tất cả"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* Add/Edit staff form */}
                        <AnimatePresence>
                          {showAddStaff && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-2 p-2.5 rounded-lg" style={{ background: 'rgba(255, 160, 0, 0.06)', border: '1px solid rgba(255, 160, 0, 0.15)' }}>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={staffForm.agentCode}
                                    onChange={e => setStaffForm(f => ({ ...f, agentCode: e.target.value }))}
                                    placeholder="Mã NV"
                                    className="px-2 py-1.5 rounded text-xs neon-input"
                                    style={{ background: '#1a1a2e' }}
                                    disabled={!!editingStaffId}
                                  />
                                  <input
                                    type="text"
                                    value={staffForm.agentName}
                                    onChange={e => setStaffForm(f => ({ ...f, agentName: e.target.value }))}
                                    placeholder="Tên NV"
                                    className="px-2 py-1.5 rounded text-xs neon-input"
                                    style={{ background: '#1a1a2e' }}
                                  />
                                  <input
                                    type="text"
                                    value={staffForm.position}
                                    onChange={e => setStaffForm(f => ({ ...f, position: e.target.value }))}
                                    placeholder="Chức vụ"
                                    className="px-2 py-1.5 rounded text-xs neon-input"
                                    style={{ background: '#1a1a2e' }}
                                  />
                                  <input
                                    type="text"
                                    value={staffForm.ban}
                                    onChange={e => setStaffForm(f => ({ ...f, ban: e.target.value }))}
                                    placeholder="Ban"
                                    className="px-2 py-1.5 rounded text-xs neon-input"
                                    style={{ background: '#1a1a2e' }}
                                  />
                                  <input
                                    type="text"
                                    value={staffForm.nhom}
                                    onChange={e => setStaffForm(f => ({ ...f, nhom: e.target.value }))}
                                    placeholder="Nhóm"
                                    className="px-2 py-1.5 rounded text-xs neon-input"
                                    style={{ background: '#1a1a2e' }}
                                  />
                                  <input
                                    type="text"
                                    value={staffForm.maNhom}
                                    onChange={e => setStaffForm(f => ({ ...f, maNhom: e.target.value }))}
                                    placeholder="Mã nhóm"
                                    className="px-2 py-1.5 rounded text-xs neon-input"
                                    style={{ background: '#1a1a2e' }}
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={staffForm.leaderAgentCode}
                                  onChange={e => setStaffForm(f => ({ ...f, leaderAgentCode: e.target.value }))}
                                  placeholder="Mã Trưởng nhóm"
                                  className="w-full px-2 py-1.5 rounded text-xs neon-input"
                                  style={{ background: '#1a1a2e' }}
                                />
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => editingStaffId ? handleUpdateStaff(editingStaffId) : handleAddStaff()}
                                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                                    style={{ background: 'rgba(255, 160, 0, 0.15)', border: '1px solid rgba(255, 160, 0, 0.3)', color: '#ffa000' }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {editingStaffId ? 'Cập nhật' : 'Thêm'}
                                  </motion.button>
                                  <motion.button
                                    onClick={() => { setShowAddStaff(false); setEditingStaffId(null) }}
                                    className="py-1.5 px-3 rounded-lg text-xs text-muted-foreground hover:bg-white/5"
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    Hủy
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Staff list grouped by maNhom */}
                        <div className="max-h-64 overflow-y-auto pr-1 space-y-1.5">
                          {staff.length === 0 ? (
                            <div className="text-center py-4">
                              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                              <p className="text-xs text-muted-foreground">Chưa có nhân sự</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">Nhấn Đồng bộ ở trang thi đua để tự động nhập, hoặc thêm thủ công</p>
                            </div>
                          ) : (
                            Object.entries(groupedStaff).sort(([a], [b]) => a.localeCompare(b)).map(([maNhom, members]) => {
                              const leader = members.find(m =>
                                m.position && (m.position.toLowerCase().includes('trưởng nhóm') || m.position.toLowerCase().includes('trưởng ban') || m.position.toLowerCase().includes('tiền trưởng'))
                              )
                              const groupLabel = maNhom === '_none' ? 'Chưa phân nhóm' : (members[0]?.nhom || maNhom)
                              const isExpanded = expandedGroup === maNhom

                              return (
                                <div key={maNhom} className="rounded-lg overflow-hidden" style={{ background: 'rgba(255, 160, 0, 0.04)', border: '1px solid rgba(255, 160, 0, 0.1)' }}>
                                  <button
                                    onClick={() => setExpandedGroup(isExpanded ? null : maNhom)}
                                    className="w-full flex items-center gap-2 p-2 text-left"
                                  >
                                    {isExpanded ? <ChevronDown className="w-3 h-3 text-amber-400" /> : <ChevronRight className="w-3 h-3 text-amber-400" />}
                                    <span className="text-xs font-medium text-amber-400 flex-1 truncate">{groupLabel}</span>
                                    <span className="text-[10px] text-muted-foreground">{members.length} TVV</span>
                                    {leader && <span className="text-[10px] text-amber-300/60 truncate max-w-[80px]">TN: {leader.agentName}</span>}
                                  </button>
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-2 pb-2 space-y-1">
                                          {members.map(m => (
                                            <div key={m.id} className="flex items-center gap-1.5 p-1.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                              <div className="flex-1 min-w-0">
                                                <span className="block text-[11px] font-medium truncate">{m.agentName}</span>
                                                <span className="block text-[9px] text-muted-foreground">{m.agentCode} {m.position && `· ${m.position}`}</span>
                                              </div>
                                              <motion.button
                                                onClick={() => startEditStaff(m)}
                                                className="p-0.5 rounded hover:bg-white/10"
                                                whileTap={{ scale: 0.85 }}
                                              >
                                                <Edit className="w-2.5 h-2.5 text-muted-foreground" />
                                              </motion.button>
                                              <motion.button
                                                onClick={() => handleDeleteStaff(m.id)}
                                                className="p-0.5 rounded text-red-400 hover:bg-red-400/10"
                                                whileTap={{ scale: 0.85 }}
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </motion.button>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )
                            })
                          )}
                        </div>
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
