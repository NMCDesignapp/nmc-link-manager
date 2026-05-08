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

// Convert hex neon color to a muted pastel/cute solid background
function neonToCuteBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  // Mix with dark base, keep ~30% color saturation for a cute but dark-mode friendly tone
  const mix = 0.18
  const base = 20 // dark base
  const rr = Math.round(base + (r - base) * mix)
  const gg = Math.round(base + (g - base) * mix)
  const bb = Math.round(base + (b - base) * mix)
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

  const cuteBg = neonToCuteBg(neonColor)

  return (
    <motion.button
      onClick={handleClick}
      className="w-full rounded-lg px-2 py-2 flex flex-row items-center gap-2 cursor-pointer neon-press neon-sweep relative overflow-hidden"
      style={{
        background: cuteBg,
        border: `1px solid ${neonColor}35`,
        boxShadow: `0 0 8px ${neonColor}10`,
        minHeight: '48px',
      }}
      whileHover={{
        y: -1,
        boxShadow: `0 4px 18px ${neonColor}20`,
        borderColor: `${neonColor}55`,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* Favorite dot */}
      {link.is_favorite && (
        <div
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{
            background: '#ffcc00',
            boxShadow: '0 0 5px #ffcc0080',
          }}
        />
      )}

      {/* Icon */}
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
        style={{
          background: `${neonColor}22`,
        }}
      >
        <IconComponent className="w-3.5 h-3.5" style={{ color: neonColor }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <span
          className="block font-semibold text-[11px] leading-tight truncate"
          style={{ color: 'rgba(255, 255, 255, 0.90)' }}
        >
          {link.title}
        </span>
        <span
          className="block text-[9px] italic truncate opacity-45"
        >
          {getSubtitle()}
        </span>
      </div>
    </motion.button>
  )
}
