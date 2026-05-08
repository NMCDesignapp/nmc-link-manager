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
    // Increment click count
    try {
      await fetch(`/api/links/${link.id}/click`, { method: 'POST' })
    } catch {}

    // Open all links in in-app browser
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

  return (
    <motion.button
      onClick={handleClick}
      className="w-full rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer neon-press relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${neonColor}12, ${neonColor}20)`,
        border: `1px solid ${neonColor}30`,
        boxShadow: `0 0 12px ${neonColor}08, inset 0 0 20px ${neonColor}05`,
        minHeight: '80px',
      }}
      whileHover={{
        y: -2,
        boxShadow: `0 6px 25px ${neonColor}18`,
        borderColor: `${neonColor}50`,
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
    >
      {/* Favorite indicator - subtle star in top-right */}
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
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `${neonColor}18`,
          boxShadow: `0 0 10px ${neonColor}10`,
        }}
      >
        <IconComponent className="w-4.5 h-4.5" style={{ color: neonColor }} />
      </div>

      {/* Name - large */}
      <span
        className="block font-semibold text-[13px] leading-tight truncate w-full"
        style={{ color: 'rgba(255, 255, 255, 0.92)' }}
      >
        {link.title}
      </span>

      {/* URL - small italic */}
      <span
        className="block text-[10px] italic truncate w-full opacity-50"
      >
        {getSubtitle()}
      </span>
    </motion.button>
  )
}
