'use client'

import { X, Link2, MousePointerClick, Star, Download, TrendingUp, Calculator, Percent, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { motion, AnimatePresence, overlayVariants, modalVariants, popVariants, staggerContainer, staggerItem } from '@/lib/animations'

interface Stats {
  total_links: number
  total_clicks: number
  favorites: number
  categories: Array<{ category: string; count: number }>
  top_links: Array<{ id: number; title: string; url: string; click_count: number }>
}

interface StatsPanelProps {
  isOpen: boolean
  stats: Stats | null
  onClose: () => void
  onExport: (format: 'json' | 'csv') => void
}

export function StatsPanel({ isOpen, stats, onClose, onExport }: StatsPanelProps) {
  const computedStats = useMemo(() => {
    if (!stats) return null

    const avgClicksPerLink = stats.total_links > 0 ? (stats.total_clicks / stats.total_links).toFixed(1) : '0'
    const favoritePercentage = stats.total_links > 0 ? ((stats.favorites / stats.total_links) * 100).toFixed(0) : '0'

    return { avgClicksPerLink, favoritePercentage }
  }, [stats])

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
            className="mx-4 w-full max-w-sm rounded-xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
            onClick={e => e.stopPropagation()}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <div
              className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
              style={{ background: '#141420', borderBottom: '1px solid rgba(0, 255, 136, 0.1)' }}
            >
              <motion.h2
                className="text-base font-semibold flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <TrendingUp className="w-5 h-5 text-primary" />
                Thong ke & Phan tich
              </motion.h2>
              <motion.button
                onClick={onClose}
                className="p-2 -mr-2 rounded-xl hover:bg-secondary smooth-transition neon-press"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="p-5 space-y-5">
              {/* Main Stats */}
              <motion.div
                className="grid grid-cols-3 gap-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {[
                  { icon: Link2, value: stats?.total_links || 0, label: 'Lien ket', color: '0, 255, 136', neon: true },
                  { icon: MousePointerClick, value: stats?.total_clicks || 0, label: 'Luot click', color: '0, 200, 150', neon: false },
                  { icon: Star, value: stats?.favorites || 0, label: 'Yeu thich', color: '0, 180, 180', neon: false },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="p-3 rounded-xl text-center"
                    style={{ background: `rgba(${stat.color}, 0.1)`, border: `1px solid rgba(${stat.color}, 0.2)` }}
                    variants={staggerItem}
                    custom={i}
                    whileHover={{ scale: 1.05, y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <stat.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                    <div className={cn('text-xl font-bold', stat.neon && 'neon-text')}>{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Computed Stats */}
              {computedStats && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5" />
                    Phan tich chi tiet
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.div
                      className="p-3 rounded-xl"
                      style={{ background: '#1a1a2e' }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] text-muted-foreground">TB Click/Link</span>
                      </div>
                      <div className="text-lg font-bold">{computedStats.avgClicksPerLink}</div>
                    </motion.div>
                    <motion.div
                      className="p-3 rounded-xl"
                      style={{ background: '#1a1a2e' }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Percent className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] text-muted-foreground">Ti le yeu thich</span>
                      </div>
                      <div className="text-lg font-bold">{computedStats.favoritePercentage}%</div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Top Links */}
              {stats?.top_links && stats.top_links.length > 0 && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-xs font-medium text-muted-foreground">Top lien ket duoc click</h3>
                  <div className="space-y-1.5">
                    {stats.top_links.slice(0, 5).map((link, index) => (
                      <motion.div
                        key={link.id}
                        className="flex items-center gap-2 p-2.5 rounded-lg"
                        style={{ background: '#1a1a2e' }}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        whileHover={{ x: 4, background: 'rgba(0, 255, 136, 0.05)' }}
                      >
                        <motion.span
                          className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(0, 255, 136, 0.2)', color: '#00ff88' }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.35 + index * 0.05, type: 'spring', stiffness: 300 }}
                        >
                          {index + 1}
                        </motion.span>
                        <span className="flex-1 truncate text-xs">{link.title}</span>
                        <span className="text-xs text-primary font-medium">{link.click_count}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Categories Distribution */}
              {stats?.categories && stats.categories.length > 0 && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h3 className="text-xs font-medium text-muted-foreground">Phan bo theo danh muc</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.categories.map((cat, i) => (
                      <motion.span
                        key={cat.category}
                        className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                        style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)' }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.03 }}
                        whileHover={{ scale: 1.1 }}
                      >
                        {cat.category}: {cat.count}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Export Buttons */}
              <motion.div
                className="space-y-2 pt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="text-xs font-medium text-muted-foreground">Xuat du lieu</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['json', 'csv'].map(format => (
                    <motion.button
                      key={format}
                      onClick={() => onExport(format as 'json' | 'csv')}
                      className={cn(
                        'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
                        'text-xs font-medium smooth-transition neon-press glow-hover'
                      )}
                      style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', color: '#00ff88' }}
                      whileHover={{ scale: 1.05, background: 'rgba(0, 255, 136, 0.15)' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {format.toUpperCase()}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
