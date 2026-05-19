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

// Vibrant solid color palette
const VIVID_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#e11d48',
  '#0ea5e9', '#a855f7', '#22c55e', '#eab308',
]

function getLinkColor(linkId: number, linkColor?: string): string {
  if (linkColor && linkColor !== '#3b82f6' && linkColor !== '#00ff88') {
    return linkColor
  }
  return VIVID_COLORS[linkId % VIVID_COLORS.length]
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

  return (
    <motion.button
      onClick={handleClick}
      className="w-full rounded-none px-3 py-2.5 flex flex-row items-center gap-2.5 cursor-pointer relative overflow-hidden group"
      style={{
        background: 'rgba(10, 10, 25, 0.9)',
        minHeight: '50px',
        boxShadow: `0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.3)`,
        border: `1.5px solid ${solidColor}40`,
      }}
      whileHover={{
        y: -3,
        boxShadow: `0 8px 25px rgba(0,0,0,0.6), 0 0 20px ${solidColor}30, inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* LED border animation - running light effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ borderRadius: 0 }}
      >
        {/* Top edge LED runner */}
        <motion.div
          className="absolute h-[2px] w-[40%]"
          style={{
            background: `linear-gradient(90deg, transparent, ${solidColor}, transparent)`,
            boxShadow: `0 0 8px ${solidColor}80, 0 0 16px ${solidColor}40`,
            top: -1,
            left: 0,
          }}
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: index * 0.3 }}
        />
        {/* Bottom edge LED runner */}
        <motion.div
          className="absolute h-[2px] w-[40%]"
          style={{
            background: `linear-gradient(90deg, transparent, ${solidColor}, transparent)`,
            boxShadow: `0 0 8px ${solidColor}80, 0 0 16px ${solidColor}40`,
            bottom: -1,
            right: 0,
          }}
          animate={{ x: ['100%', '-300%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', delay: index * 0.3 + 1.2 }}
        />
        {/* Left edge LED runner */}
        <motion.div
          className="absolute w-[2px] h-[40%]"
          style={{
            background: `linear-gradient(180deg, transparent, ${solidColor}, transparent)`,
            boxShadow: `0 0 8px ${solidColor}80, 0 0 16px ${solidColor}40`,
            left: -1,
            top: 0,
          }}
          animate={{ y: ['-100%', '300%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: index * 0.2 + 0.5 }}
        />
        {/* Right edge LED runner */}
        <motion.div
          className="absolute w-[2px] h-[40%]"
          style={{
            background: `linear-gradient(180deg, transparent, ${solidColor}, transparent)`,
            boxShadow: `0 0 8px ${solidColor}80, 0 0 16px ${solidColor}40`,
            right: -1,
            bottom: 0,
          }}
          animate={{ y: ['100%', '-300%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: index * 0.2 + 1.7 }}
        />
      </div>

      {/* Corner LED dots - always glowing */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5" style={{ background: solidColor, boxShadow: `0 0 6px ${solidColor}80`, opacity: 0.7 }} />
      <div className="absolute top-0 right-0 w-1.5 h-1.5" style={{ background: solidColor, boxShadow: `0 0 6px ${solidColor}80`, opacity: 0.7 }} />
      <div className="absolute bottom-0 left-0 w-1.5 h-1.5" style={{ background: solidColor, boxShadow: `0 0 6px ${solidColor}80`, opacity: 0.7 }} />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5" style={{ background: solidColor, boxShadow: `0 0 6px ${solidColor}80`, opacity: 0.7 }} />

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

      {/* Icon */}
      <div
        className="w-7 h-7 rounded-none flex items-center justify-center flex-shrink-0"
        style={{ background: `${solidColor}20`, border: `1px solid ${solidColor}40` }}
      >
        <IconComponent className="w-4 h-4" style={{ color: solidColor }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <span
          className="block font-bold text-[12px] leading-tight truncate"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          {link.title}
        </span>
        <span
          className="block text-[9px] italic truncate"
          style={{ color: `${solidColor}90` }}
        >
          {getSubtitle()}
        </span>
      </div>
    </motion.button>
  )
}
