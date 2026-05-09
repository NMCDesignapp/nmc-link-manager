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

// Vibrant solid color palette - each link gets its own vivid solid color
const VIVID_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
  '#0ea5e9', // sky
  '#a855f7', // purple
  '#22c55e', // green
  '#eab308', // yellow
]

// Deterministic hash from link id → color index
function getLinkColor(linkId: number, linkColor?: string): string {
  // If the link has a custom color set that's not the default, use it
  if (linkColor && linkColor !== '#3b82f6' && linkColor !== '#00ff88') {
    return linkColor
  }
  return VIVID_COLORS[linkId % VIVID_COLORS.length]
}

// Lighten a hex color for subtle hover effect
function lightenColor(hex: string, amount: number = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const rr = Math.min(255, Math.round(r + (255 - r) * amount))
  const gg = Math.min(255, Math.round(g + (255 - g) * amount))
  const bb = Math.min(255, Math.round(b + (255 - b) * amount))
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

  const solidColor = getLinkColor(link.id, link.color)
  const hoverBg = lightenColor(solidColor, 0.12)

  return (
    <motion.button
      onClick={handleClick}
      className="w-full rounded-xl px-3 py-2.5 flex flex-row items-center gap-2.5 cursor-pointer relative overflow-hidden"
      style={{
        background: solidColor,
        minHeight: '50px',
        boxShadow: `0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08) inset`,
      }}
      whileHover={{
        y: -2,
        background: hoverBg,
        boxShadow: `0 6px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.12) inset`,
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
            boxShadow: '0 0 6px rgba(255,204,0,0.7)',
          }}
        />
      )}

      {/* Icon - white on solid color */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.25)' }}
      >
        <IconComponent className="w-4 h-4" style={{ color: 'white' }} />
      </div>

      {/* Text - white on solid color */}
      <div className="flex-1 min-w-0 text-left">
        <span
          className="block font-bold text-[12px] leading-tight truncate"
          style={{ color: 'white' }}
        >
          {link.title}
        </span>
        <span
          className="block text-[9px] italic truncate"
          style={{ color: 'rgba(255,255,255,0.70)' }}
        >
          {getSubtitle()}
        </span>
      </div>
    </motion.button>
  )
}
