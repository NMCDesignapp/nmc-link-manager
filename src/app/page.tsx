'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link, Category } from '@/lib/types'
import { LinkCard } from '@/components/link-card'
import { IframeModal } from '@/components/iframe-modal'
import { AddLinkModal } from '@/components/add-link-modal'
import { StatsPanel } from '@/components/stats-panel'
import { MonthlyCalendar } from '@/components/monthly-calendar'
import { Settings, Check, AlertCircle, Link2, Trophy } from 'lucide-react'
import { SettingsPanel } from '@/components/settings-panel'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import { motion, AnimatePresence, staggerContainer, staggerItem, glowPulseAnimation } from '@/lib/animations'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

// Neon divider component with stronger glow
function NeonDivider({ color = '#00ff88' }: { color?: string }) {
  return (
    <div className="relative h-6 flex items-center justify-center">
      <div
        className="w-full h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}60, ${color}, ${color}60, transparent)`,
          boxShadow: `0 0 8px ${color}40, 0 0 16px ${color}20`,
        }}
      />
      {/* Glow pulse effect */}
      <motion.div
        className="absolute h-[1px] left-0 right-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
          scaleX: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

// Creative N•M•C text with neon effects - horizontal layout with flowing chevron arrows
function NMCLogo({ color = '#00ff88' }: { color?: string }) {
  const parts = ['N', '•', 'M', '•', 'C']

  // Flowing chevron arrow stream - spans from edge toward center text
  // Uses SVG with animated sweep mask for ultra-smooth flowing light effect
  const ArrowStream = ({ direction }: { direction: 'left' | 'right' }) => {
    const isLeft = direction === 'left'
    const count = 18
    const spacing = 14
    const svgW = count * spacing
    const svgH = 22

    return (
      <div className="flex-1 min-w-0 overflow-hidden" style={{ height: '24px' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Proximity fade gradient - chevrons near text are brighter */}
            <linearGradient id={`fade-${direction}`} x1="0%" y1="0%" x2="100%" y2="0%">
              {isLeft ? (
                <>
                  <stop offset="0%" stopColor={color} stopOpacity="0.06" />
                  <stop offset="80%" stopColor={color} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                  <stop offset="20%" stopColor={color} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.06" />
                </>
              )}
            </linearGradient>

            {/* Sweep gradient for animated glow - moves from edge toward text */}
            <linearGradient id={`sweep-${direction}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={svgW} y2="0">
              <stop stopColor="white" stopOpacity="0">
                <animate
                  attributeName="offset"
                  values={isLeft ? '-0.25;-0.25;1.25' : '1.25;1.25;-0.25'}
                  keyTimes="0;0.55;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop stopColor="white" stopOpacity="1">
                <animate
                  attributeName="offset"
                  values={isLeft ? '-0.12;-0.12;1.38' : '1.38;1.38;-0.12'}
                  keyTimes="0;0.55;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop stopColor="white" stopOpacity="0">
                <animate
                  attributeName="offset"
                  values={isLeft ? '0;0;1.5' : '1.5;1.5;0'}
                  keyTimes="0;0.55;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>

            <mask id={`mask-${direction}`}>
              <rect x="0" y="0" width={svgW} height={svgH} fill={`url(#sweep-${direction})`} />
            </mask>
          </defs>

          {/* Base chevrons - always dimly visible */}
          {Array.from({ length: count }).map((_, i) => {
            const x = i * spacing
            return (
              <path
                key={i}
                d={isLeft
                  ? `M${x + 4} 4 L${x + 10} 11 L${x + 4} 18`
                  : `M${x + 10} 4 L${x + 4} 11 L${x + 10} 18`
                }
                fill="none"
                stroke={`url(#fade-${direction})`}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {/* Glow chevrons - revealed by sweeping mask */}
          <g mask={`url(#mask-${direction})`} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
            {Array.from({ length: count }).map((_, i) => {
              const x = i * spacing
              return (
                <path
                  key={`g${i}`}
                  d={isLeft
                    ? `M${x + 4} 4 L${x + 10} 11 L${x + 4} 18`
                    : `M${x + 10} 4 L${x + 4} 11 L${x + 10} 18`
                  }
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}
          </g>
        </svg>
      </div>
    )
  }

  return (
    <div className="flex items-center w-full">
      {/* Left arrows: flowing right → toward text */}
      <ArrowStream direction="left" />

      {/* N•M•C text */}
      <div className="flex items-center justify-center gap-0.5 flex-shrink-0 px-1">
        {parts.map((part, i) => {
          const isBullet = part === '•'
          return (
            <motion.span
              key={i}
              className="relative inline-block leading-none"
              style={{
                fontSize: isBullet ? '1.5rem' : '3rem',
                fontWeight: isBullet ? 400 : 900,
                fontFamily: '"Outfit", system-ui, sans-serif',
                color: isBullet ? `${color}60` : color,
                textShadow: isBullet
                  ? `0 0 6px ${color}30`
                  : `0 0 10px ${color}80, 0 0 30px ${color}40, 0 0 60px ${color}20, 0 0 100px ${color}10`,
                letterSpacing: isBullet ? '0' : '0.05em',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + i * 0.08,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {part}
              {!isBullet && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, ${color}30 50%, transparent 100%)`,
                    backgroundSize: '100% 200%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '0% 200%'],
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.2,
                  }}
                />
              )}
            </motion.span>
          )
        })}
      </div>

      {/* Right arrows: flowing left ← toward text */}
      <ArrowStream direction="right" />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { data: linksData, isLoading: linksLoading, error: linksError } = useSWR<Link[]>('/api/links', fetcher)
  const { data: categoriesData, error: categoriesError } = useSWR<Category[]>('/api/categories', fetcher)
  const { data: stats, error: statsError } = useSWR('/api/stats', fetcher)

  const links = Array.isArray(linksData) ? linksData : []
  const categories = Array.isArray(categoriesData) ? categoriesData : []
  const { settings } = useSettings()

  // Load neon color from localStorage immediately on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('nmc-app-settings')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.neon_color) {
            document.documentElement.style.setProperty('--primary', parsed.neon_color)
          }
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [modalKey, setModalKey] = useState(0)

  const handleAddOrUpdateLink = async (data: Partial<Link>) => {
    setSaveStatus('saving')
    try {
      let res: Response
      if (data.id) {
        res = await fetch(`/api/links/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save link')
      }

      if (data.category && data.category !== 'General') {
        const existingCat = categories.find(c => c.name === data.category)
        if (!existingCat) {
          await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.category, color: '#3b82f6' }),
          })
          mutate('/api/categories')
        }
      }

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
      mutate('/api/links')
      mutate('/api/stats')
      setEditingLink(null)
    } catch (error) {
      console.error('Failed to save link:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/export?format=${format}&category=all`, '_blank')
  }

  const neonColor = settings.neon_color || '#00ff88'

  const handleOpenLink = useCallback((link: Link) => {
    setModalKey(k => k + 1)
    setSelectedLink(link)
  }, [])

  const handleCloseLink = useCallback(() => {
    setSelectedLink(null)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Save Status Toast */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg"
            style={{
              background: saveStatus === 'success' ? 'rgba(0, 255, 136, 0.15)' : saveStatus === 'error' ? 'rgba(255, 68, 68, 0.15)' : 'rgba(0, 255, 136, 0.1)',
              border: `1px solid ${saveStatus === 'success' ? 'rgba(0, 255, 136, 0.3)' : saveStatus === 'error' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(0, 255, 136, 0.2)'}`,
              color: saveStatus === 'error' ? '#ff4444' : neonColor,
              backdropFilter: 'blur(12px)',
            }}
          >
            {saveStatus === 'saving' && (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            )}
            {saveStatus === 'success' && (
              <>
                <Check className="w-4 h-4" />
                Đã lưu thành công!
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4" />
                Lưu thất bại!
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - fixed at top */}
      <motion.header
        className="max-w-lg mx-auto w-full px-4 pt-10 pb-3 text-center relative flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* N.M.C Creative Logo Text */}
        <NMCLogo color={neonColor} />

        {/* Bio + Settings button inline */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <p className="text-xs text-muted-foreground">
            {settings.profile_bio}
          </p>
          <motion.button
            onClick={() => setIsSettingsOpen(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: `${neonColor}15`,
              border: `1px solid ${neonColor}30`,
              boxShadow: `0 0 8px ${neonColor}20`,
            }}
            animate={{
              boxShadow: [
                `0 0 8px ${neonColor}20`,
                `0 0 16px ${neonColor}35`,
                `0 0 8px ${neonColor}20`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileHover={{
              scale: 1.2,
              rotate: 90,
              boxShadow: `0 0 20px ${neonColor}50`,
            }}
            whileTap={{ scale: 0.85 }}
          >
            <Settings className="w-3 h-3" style={{ color: neonColor }} />
          </motion.button>
        </motion.div>
      </motion.header>

      {/* Neon Divider - below header */}
      <div className="max-w-lg mx-auto w-full px-6 flex-shrink-0">
        <NeonDivider color={neonColor} />
      </div>

      {/* Thi Đua Navigation Button */}
      <motion.div
        className="max-w-lg mx-auto w-full px-4 pb-2 flex-shrink-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <motion.button
          onClick={() => router.push('/thi-dua-chau')}
          className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white"
          style={{
            background: '#f59e0b',
            boxShadow: '0 2px 10px rgba(245,158,11,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset',
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(245,158,11,0.4), 0 0 0 1px rgba(255,255,255,0.15) inset' }}
          whileTap={{ scale: 0.98 }}
        >
          <Trophy className="w-4 h-4" />
          Thi Đua
        </motion.button>
      </motion.div>

      {/* Scrollable content area - only the link buttons section scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-lg mx-auto w-full px-4 pt-2 pb-2">
          {/* Links Grid - 2 per row, scrollable */}
          {linksLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="h-20 rounded-xl bg-card border border-border/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                >
                  <div className="h-full rounded-xl skeleton-pulse" />
                </motion.div>
              ))}
            </div>
          ) : linksError || links.length === 0 ? (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div
                className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Link2 className="w-10 h-10 text-primary" />
              </motion.div>
              <p className="text-muted-foreground text-xs">
                Chưa có liên kết nào. Mở Cài đặt để thêm.
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-2"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <AnimatePresence mode="popLayout">
                {links.map((link, index) => (
                  <motion.div
                    key={link.id}
                    variants={staggerItem}
                    layout
                    layoutId={`link-${link.id}`}
                  >
                    <LinkCard
                      link={link}
                      index={index}
                      neonColor={neonColor}
                      onOpen={handleOpenLink}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Calendar - pinned to bottom, not scrollable */}
      <div className="flex-shrink-0">
        {/* Neon Divider - above calendar */}
        <div className="max-w-lg mx-auto w-full px-6 pt-1">
          <NeonDivider color={neonColor} />
        </div>

        <motion.div
          className="max-w-lg mx-auto w-full px-4 pt-2 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div
            className="rounded-xl p-3"
            style={{
              background: 'rgba(14, 14, 30, 0.85)',
              border: `1px solid ${neonColor}18`,
              backdropFilter: 'blur(12px)',
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${neonColor}08`,
            }}
          >
            <MonthlyCalendar neonColor={neonColor} compact />
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedLink && (
          <IframeModal key={`modal-${modalKey}`} link={selectedLink} onClose={handleCloseLink} />
        )}
      </AnimatePresence>

      <AddLinkModal
        isOpen={isAddModalOpen}
        editingLink={editingLink}
        categories={categories}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingLink(null)
        }}
        onSubmit={handleAddOrUpdateLink}
      />

      <StatsPanel isOpen={isStatsOpen} stats={stats} onClose={() => setIsStatsOpen(false)} onExport={handleExport} />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onAddLink={() => {
          setEditingLink(null)
          setIsAddModalOpen(true)
        }}
        onEditLink={(link) => {
          setEditingLink(link)
          setIsAddModalOpen(true)
        }}
        onOpenStats={() => setIsStatsOpen(true)}
      />
    </div>
  )
}
