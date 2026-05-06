'use client'

import { Link } from '@/lib/types'
import {
  Edit,
  Trash2,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Github,
  Linkedin,
  Mail,
  Phone,
  ShoppingBag,
  Music,
  Camera,
  Film,
  BookOpen,
  Coffee,
  Heart,
  File,
  FileText,
  Image,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ElementType> = {
  globe: Globe,
  instagram: Instagram,
  twitter: Twitter,
  facebook: Facebook,
  youtube: Youtube,
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  phone: Phone,
  'shopping-bag': ShoppingBag,
  music: Music,
  camera: Camera,
  film: Film,
  'book-open': BookOpen,
  coffee: Coffee,
  heart: Heart,
  file: File,
  'file-text': FileText,
  image: Image,
  video: Video,
}

interface LinkCardProps {
  link: Link
  index?: number
  onOpen: (link: Link) => void
  onEdit: (link: Link) => void
  onDelete: (id: number) => void
  onToggleFavorite: (id: number, isFavorite: boolean) => void
}

export function LinkCard({ link, index = 0, onOpen, onEdit, onDelete }: LinkCardProps) {
  const IconComponent = iconMap[link.icon || 'globe'] || Globe

  const handleClick = async () => {
    await fetch(`/api/links/${link.id}/click`, { method: 'POST' })
    onOpen(link)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit(link)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDelete(link.id)
  }

  const getSubtitle = () => {
    if (link.link_type === 'web') {
      try {
        return new URL(link.url || '').hostname
      } catch {
        return link.url
      }
    }
    return link.file_name || link.link_type
  }

  return (
    <div
      className={cn(
        'neon-card neon-press block rounded-xl px-5 py-4',
        'flex items-center gap-4 cursor-pointer stagger-item',
        'bg-card border border-border/30'
      )}
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={handleClick}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(0, 255, 136, 0.1)' }}
      >
        <IconComponent className="w-5 h-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="block font-medium text-sm truncate">{link.title}</span>
        <span className="block text-xs text-muted-foreground truncate mt-0.5">{getSubtitle()}</span>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 smooth-transition hover:bg-primary/10 neon-ripple"
        >
          <Edit className="w-3 h-3" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-destructive opacity-60 hover:opacity-100 smooth-transition hover:bg-destructive/10 neon-ripple"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
