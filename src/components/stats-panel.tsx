'use client'

import { X, Link2, MousePointerClick, Star, Download, TrendingUp, Calculator, Percent, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-xl overflow-hidden max-h-[85vh] overflow-y-auto modal-enter"
        style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4"
          style={{ background: '#141420', borderBottom: '1px solid rgba(0, 255, 136, 0.1)' }}
        >
          <h2 className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Thong ke & Phan tich
          </h2>
          <button onClick={onClose} className="p-2 -mr-2 rounded-xl hover:bg-secondary smooth-transition neon-press">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)' }}
            >
              <Link2 className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="text-xl font-bold neon-text">{stats?.total_links || 0}</div>
              <div className="text-[10px] text-muted-foreground">Lien ket</div>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(0, 200, 150, 0.1)', border: '1px solid rgba(0, 200, 150, 0.2)' }}
            >
              <MousePointerClick className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-xl font-bold">{stats?.total_clicks || 0}</div>
              <div className="text-[10px] text-muted-foreground">Luot click</div>
            </div>
            <div
              className="p-3 rounded-xl text-center"
              style={{ background: 'rgba(0, 180, 180, 0.1)', border: '1px solid rgba(0, 180, 180, 0.2)' }}
            >
              <Star className="w-5 h-5 text-teal-400 mx-auto mb-1" />
              <div className="text-xl font-bold">{stats?.favorites || 0}</div>
              <div className="text-[10px] text-muted-foreground">Yeu thich</div>
            </div>
          </div>

          {/* Computed Stats */}
          {computedStats && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5" />
                Phan tich chi tiet
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl" style={{ background: '#1a1a2e' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">TB Click/Link</span>
                  </div>
                  <div className="text-lg font-bold">{computedStats.avgClicksPerLink}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: '#1a1a2e' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] text-muted-foreground">Ti le yeu thich</span>
                  </div>
                  <div className="text-lg font-bold">{computedStats.favoritePercentage}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Top Links */}
          {stats?.top_links && stats.top_links.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Top lien ket duoc click</h3>
              <div className="space-y-1.5">
                {stats.top_links.slice(0, 5).map((link, index) => (
                  <div key={link.id} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#1a1a2e' }}>
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(0, 255, 136, 0.2)', color: '#00ff88' }}
                    >
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate text-xs">{link.title}</span>
                    <span className="text-xs text-primary font-medium">{link.click_count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories Distribution */}
          {stats?.categories && stats.categories.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">Phan bo theo danh muc</h3>
              <div className="flex flex-wrap gap-1.5">
                {stats.categories.map(cat => (
                  <span
                    key={cat.category}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)' }}
                  >
                    {cat.category}: {cat.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-medium text-muted-foreground">Xuat du lieu</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onExport('json')}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
                  'text-xs font-medium smooth-transition neon-press glow-hover'
                )}
                style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', color: '#00ff88' }}
              >
                <Download className="w-3.5 h-3.5" />
                JSON
              </button>
              <button
                onClick={() => onExport('csv')}
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
                  'text-xs font-medium smooth-transition neon-press glow-hover'
                )}
                style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', color: '#00ff88' }}
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
