'use client'

import { Link } from '@/lib/types'
import {
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

// Neon hex → bright solid fill for button background
function neonToSolidBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Brighten to ~65% saturation for a vivid solid fill
  const factor = 0.55
  const base = 30
  const rr = Math.min(255, Math.round(base + (r - base) * factor))
  const gg = Math.min(255, Math.round(base + (g - base) * factor))
  const bb = Math.min(255, Math.round(base + (b - base) * factor))
  return `rgb(${rr}, ${gg}, ${bb})`
}

interface LinkCardProps {
  link: Link
  index?: number
  neonColor?: string
  onOpen: (link: Link) => void
  onEdit?: (link: Link) => void
  onDelete?: (id: number) => void
  onToggleFavorite?: (id: number, isFavorite: boolean) => void
}

export function LinkCard({ link, index = 0, neonColor = '#00ff88', onOpen, onEdit, onDelete, onToggleFavorite }: LinkCardProps) {
  const IconComponent = iconMap[link.icon || 'globe'] || Globe

  const handleClick = async () => {
    try {
      await fetch(`/api/links/${link.id}/click`, { method: 'POST' })
    } catch {}
    onOpen(link)
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

  const solidBg = neonToSolidBg(neonColor)

  return (
    <motion.button
      onClick={handleClick}
      className="w-full rounded-xl px-3 py-2.5 flex flex-row items-center gap-2.5 cursor-pointer relative overflow-hidden"
      style={{
        background: solidBg,
        minHeight: '50px',
        boxShadow: `0 2px 8px rgba(0,0,0,0.3), 0 0 12px ${neonColor}20`,
      }}
      whileHover={{
        y: -1,
        boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 20px ${neonColor}35`,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* Favorite dot */}
      {link.is_favorite && (
        <div
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{
            background: '#ffcc00',
            boxShadow: '0 0 6px rgba(255,204,0,0.6)',
          }}
        />
      )}

      {/* Icon - black on bright background */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.15)' }}
      >
        <IconComponent className="w-4 h-4" style={{ color: 'rgba(0,0,0,0.8)' }} />
      </div>

      {/* Text - black on bright background */}
      <div className="flex-1 min-w-0 text-left">
        <span
          className="block font-bold text-[12px] leading-tight truncate"
          style={{ color: 'rgba(0,0,0,0.85)' }}
        >
          {link.title}
        </span>
        <span
          className="block text-[9px] italic truncate"
          style={{ color: 'rgba(0,0,0,0.50)' }}
        >
          {getSubtitle()}
        </span>
      </div>
    </motion.button>
  )
}
