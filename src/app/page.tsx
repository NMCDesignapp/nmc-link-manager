'use client'

import { useState, useMemo } from 'react'
import { Link, Category } from '@/lib/types'
import { LinkCard } from '@/components/link-card'
import { IframeModal } from '@/components/iframe-modal'
import { AddLinkModal } from '@/components/add-link-modal'
import { StatsPanel } from '@/components/stats-panel'
import { MonthlyCalendar } from '@/components/monthly-calendar'
import { Zap, Link2, Settings, Check, AlertCircle } from 'lucide-react'
import { SettingsPanel } from '@/components/settings-panel'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import { motion, AnimatePresence, pageVariants, staggerContainer, staggerItem, floatAnimation, glowPulseAnimation } from '@/lib/animations'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

// Neon divider component
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

export default function Home() {
  const { data: linksData, isLoading: linksLoading, error: linksError } = useSWR<Link[]>('/api/links', fetcher)
  const { data: categoriesData, error: categoriesError } = useSWR<Category[]>('/api/categories', fetcher)
  const { data: stats, error: statsError } = useSWR('/api/stats', fetcher)

  const links = Array.isArray(linksData) ? linksData : []
  const categories = Array.isArray(categoriesData) ? categoriesData : []
  const { settings } = useSettings()

  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

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

      // Auto-create category if it doesn't exist
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

  const handleDeleteLink = async (id: number) => {
    if (confirm('Ban co chac muon xoa lien ket nay?')) {
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

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/export?format=${format}&category=all`, '_blank')
  }

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
              color: saveStatus === 'error' ? '#ff4444' : '#00ff88',
              backdropFilter: 'blur(12px)',
            }}
          >
            {saveStatus === 'saving' && (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Dang luu...
              </>
            )}
            {saveStatus === 'success' && (
              <>
                <Check className="w-4 h-4" />
                Da luu thanh cong!
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4" />
                Luu that bai!
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - fixed */}
      <motion.header
        className="max-w-md mx-auto w-full px-4 pt-8 pb-4 text-center relative flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-8 right-4 p-2.5 rounded-xl bg-secondary/50 border border-border/30 neon-press smooth-transition hover:border-primary/50 hover:bg-primary/10"
          whileHover={{ scale: 1.05, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <Settings className="w-4 h-4 text-primary" />
        </motion.button>

        <motion.div
          className="inline-block mb-3"
          animate={floatAnimation}
        >
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${settings.neon_color}, ${settings.neon_color}99)` }}
            animate={glowPulseAnimation}
          >
            <Zap className="w-7 h-7 text-primary-foreground" />
          </motion.div>
        </motion.div>
        <motion.h1
          className="text-2xl font-bold mb-1 neon-text"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {settings.profile_name}
        </motion.h1>
        <motion.p
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {settings.profile_bio}
        </motion.p>
      </motion.header>

      {/* Neon Divider - below header */}
      <div className="max-w-md mx-auto w-full px-6 flex-shrink-0">
        <NeonDivider color={settings.neon_color} />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-md mx-auto w-full px-4 pt-2 pb-2">
          {/* Error Display */}
          <AnimatePresence>
            {(linksError || categoriesError) && (
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-center">
                  <p className="text-destructive font-medium mb-1">Loi ket noi co so du lieu</p>
                  <p className="text-muted-foreground text-xs">Vui long kiem tra DATABASE_URL trong Environment Variables tren Vercel</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Links Container - scrollable */}
          {linksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="h-16 rounded-xl bg-card border border-border/50"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.3 }}
                >
                  <div className="h-full rounded-xl skeleton-pulse" />
                </motion.div>
              ))}
            </div>
          ) : linksError ? (
            <motion.div
              className="text-center py-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center">
                <Link2 className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground text-xs">Khong the tai lien ket. Vui long thu lai sau.</p>
            </motion.div>
          ) : links.length === 0 ? (
            <motion.div
              className="text-center py-10"
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
                Chua co lien ket nao. Mo Cai dat de them.
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-2"
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
                      onOpen={setSelectedLink}
                      onEdit={link => {
                        setEditingLink(link)
                        setIsAddModalOpen(true)
                      }}
                      onDelete={handleDeleteLink}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Neon Divider - below links */}
        <div className="max-w-md mx-auto w-full px-6 pt-2">
          <NeonDivider color={settings.neon_color} />
        </div>

        {/* Calendar - below divider */}
        <motion.div
          className="max-w-md mx-auto w-full px-4 pt-3 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: 'rgba(30, 30, 50, 0.6)',
              border: '1px solid rgba(0, 255, 136, 0.1)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <MonthlyCalendar />
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <IframeModal link={selectedLink} onClose={() => setSelectedLink(null)} />

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
        onOpenStats={() => setIsStatsOpen(true)}
      />
    </div>
  )
}
