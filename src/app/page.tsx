'use client'

import { useState, useMemo } from 'react'
import { Link, Category } from '@/lib/types'
import { LinkCard } from '@/components/link-card'
import { IframeModal } from '@/components/iframe-modal'
import { AddLinkModal } from '@/components/add-link-modal'
import { StatsPanel } from '@/components/stats-panel'
import { CategoryFilter } from '@/components/category-filter'
import { Plus, Search, BarChart3, Zap, Link2, Settings } from 'lucide-react'
import { SettingsPanel } from '@/components/settings-panel'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function Home() {
  const { data: links = [], isLoading: linksLoading } = useSWR<Link[]>('/api/links', fetcher)
  const { data: categories = [] } = useSWR<Category[]>('/api/categories', fetcher)
  const { data: stats } = useSWR('/api/stats', fetcher)
  const { settings } = useSettings()

  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredLinks = useMemo(() => {
    let filtered = links

    if (selectedCategory === 'favorites') {
      filtered = filtered.filter(link => link.is_favorite)
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(link => link.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        link =>
          link.title.toLowerCase().includes(query) ||
          link.url?.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query) ||
          link.file_name?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [links, selectedCategory, searchQuery])

  const handleAddOrUpdateLink = async (data: Partial<Link>) => {
    if (data.id) {
      await fetch(`/api/links/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    mutate('/api/links')
    mutate('/api/stats')
    setEditingLink(null)
  }

  const handleDeleteLink = async (id: number) => {
    if (confirm('Ban co chac muon xoa lien ket nay?')) {
      await fetch(`/api/links/${id}`, { method: 'DELETE' })
      mutate('/api/links')
      mutate('/api/stats')
    }
  }

  const handleToggleFavorite = async (id: number, isFavorite: boolean) => {
    await fetch(`/api/links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: isFavorite }),
    })
    mutate('/api/links')
    mutate('/api/stats')
  }

  const handleExport = (format: 'json' | 'csv') => {
    const category = selectedCategory !== 'all' && selectedCategory !== 'favorites' ? selectedCategory : 'all'
    window.open(`/api/export?format=${format}&category=${category}`, '_blank')
  }

  return (
    <div className="min-h-full page-transition">
      {/* Header */}
      <header className="max-w-md mx-auto px-4 pt-8 pb-6 text-center relative">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-8 right-4 p-2.5 rounded-xl bg-secondary/50 border border-border/30 neon-press smooth-transition hover:border-primary/50 hover:bg-primary/10"
        >
          <Settings className="w-4 h-4 text-primary" />
        </button>

        <div className="float-anim inline-block mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center neon-glow glow-pulse"
            style={{ background: `linear-gradient(135deg, ${settings.neon_color}, ${settings.neon_color}99)` }}
          >
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1 neon-text">{settings.profile_name}</h1>
        <p className="text-xs text-muted-foreground">{settings.profile_bio}</p>
      </header>

      {/* Search & Filter */}
      <div className="max-w-md mx-auto px-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tim kiem lien ket..."
            className={cn(
              'w-full pl-11 pr-4 py-3 rounded-xl text-sm neon-input',
              'bg-secondary',
              'placeholder:text-muted-foreground/50'
            )}
          />
        </div>

        <div className="flex items-center justify-between">
          <CategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <button
            onClick={() => setIsStatsOpen(true)}
            className="p-2.5 rounded-xl bg-secondary border border-border/50 neon-press smooth-transition hover:border-primary/50 hover:bg-primary/10"
          >
            <BarChart3 className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Links Container */}
      <main className="max-w-md mx-auto px-4 pb-4 space-y-2">
        {linksLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-card border border-border/50 animate-pulse" />
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="text-center py-10">
            <div className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center">
              <Link2 className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground text-xs">
              {searchQuery ? 'Khong tim thay lien ket nao' : 'Chua co lien ket nao. Nhan + de them.'}
            </p>
          </div>
        ) : (
          filteredLinks.map((link, index) => (
            <LinkCard
              key={link.id}
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
          ))
        )}
      </main>

      {/* Add Button */}
      <div className="max-w-md mx-auto px-4 pb-6 pt-2">
        <button
          onClick={() => {
            setEditingLink(null)
            setIsAddModalOpen(true)
          }}
          className={cn(
            'w-full py-3 rounded-xl font-medium text-sm',
            'flex items-center justify-center gap-2 neon-btn neon-press',
            'text-primary'
          )}
        >
          <Plus className="w-4 h-4" />
          Them lien ket moi
        </button>
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

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
