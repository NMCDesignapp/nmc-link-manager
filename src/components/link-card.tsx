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

  // Solid dark card with warm tint - distinctly different from the neon green Thi Đua button
  // Uses a deep indigo/slate base that creates a "floating card" feel
  const cardBg = '#1c1c35'
  const cardBorder = 'rgba(130, 140, 255, 0.20)'
  const iconBg = 'rgba(130, 140, 255, 0.12)'

  return (
    <motion.button
      onClick={handleClick}
      className="w-full rounded-xl px-3 py-2.5 flex flex-row items-center gap-2.5 cursor-pointer neon-press relative overflow-hidden"
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: `0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
        minHeight: '50px',
      }}
      whileHover={{
        y: -1,
        boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 0 12px ${neonColor}15`,
        borderColor: `${neonColor}40`,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* Neon sweep line on hover */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${neonColor}10, transparent)`,
        }}
      />

      {/* Favorite dot */}
      {link.is_favorite && (
        <div
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
          style={{
            background: '#ffcc00',
            boxShadow: '0 0 6px #ffcc0080',
          }}
        />
      )}

      {/* Icon */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: iconBg,
          boxShadow: `0 0 8px rgba(130, 140, 255, 0.08)`,
        }}
      >
        <IconComponent className="w-4 h-4" style={{ color: '#8e8eff' }} />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <span
          className="block font-semibold text-[12px] leading-tight truncate"
          style={{ color: 'rgba(255, 255, 255, 0.92)' }}
        >
          {link.title}
        </span>
        <span
          className="block text-[9px] italic truncate"
          style={{ color: 'rgba(130, 140, 255, 0.55)' }}
        >
          {getSubtitle()}
        </span>
      </div>
    </motion.button>
  )
}
