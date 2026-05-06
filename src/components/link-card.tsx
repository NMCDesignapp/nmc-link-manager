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
  Star,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from '@/lib/animations'

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

export function LinkCard({ link, index = 0, onOpen, onEdit, onDelete, onToggleFavorite }: LinkCardProps) {
  const IconComponent = iconMap[link.icon || 'globe'] || Globe

  const handleClick = async () => {
    // Increment click count
    try {
      await fetch(`/api/links/${link.id}/click`, { method: 'POST' })
    } catch {}

    // Web links: open directly in new tab (no iframe)
    if (link.link_type === 'web' && link.url) {
      window.open(link.url, '_blank', 'noopener,noreferrer')
    } else {
      // Files/images/videos: open in modal
      onOpen(link)
    }
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

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleFavorite(link.id, !link.is_favorite)
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
    <motion.div
      className={cn(
        'neon-card neon-press block rounded-xl px-4 py-3.5',
        'flex items-center gap-3.5 cursor-pointer',
        'bg-card border border-border/30'
      )}
      whileHover={{
        y: -2,
        boxShadow: '0 8px 30px rgba(0, 255, 136, 0.15)',
        borderColor: 'rgba(0, 255, 136, 0.3)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
    >
      <motion.div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(0, 255, 136, 0.1)' }}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ duration: 0.2 }}
      >
        <IconComponent className="w-5 h-5 text-primary" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <span className="block font-medium text-sm truncate">{link.title}</span>
        <span className="block text-xs text-muted-foreground truncate mt-0.5">{getSubtitle()}</span>
      </div>

      <div className="flex gap-0.5 flex-shrink-0 items-center">
        {/* External link icon for web links */}
        {link.link_type === 'web' && (
          <motion.div
            className="p-1.5 rounded-lg opacity-30"
            whileHover={{ opacity: 1, scale: 1.1 }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </motion.div>
        )}
        <motion.button
          onClick={handleFavorite}
          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 smooth-transition"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
        >
          <Star className={cn('w-3.5 h-3.5', link.is_favorite && 'fill-yellow-400 text-yellow-400')} />
        </motion.button>
        <motion.button
          onClick={handleEdit}
          className="p-1.5 rounded-lg opacity-40 hover:opacity-100 smooth-transition hover:bg-primary/10"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
        >
          <Edit className="w-3 h-3" />
        </motion.button>
        <motion.button
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-destructive opacity-60 hover:opacity-100 smooth-transition hover:bg-destructive/10"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
        >
          <Trash2 className="w-3 h-3" />
        </motion.button>
      </div>
    </motion.div>
  )
}
