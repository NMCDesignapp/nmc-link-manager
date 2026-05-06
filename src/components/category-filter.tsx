'use client'

import { Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Grid3X3, Star } from 'lucide-react'
import { motion } from '@/lib/animations'

interface CategoryFilterProps {
  categories: Category[]
  selected: string
  onSelect: (category: string) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide flex-1">
      <motion.button
        onClick={() => onSelect('all')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap',
          'text-xs font-medium smooth-transition shrink-0 neon-press',
          selected === 'all' && 'neon-glow'
        )}
        style={
          selected === 'all'
            ? {
                background: 'rgba(0, 255, 136, 0.1)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                color: '#00ff88',
              }
            : {
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }
        }
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        layout
      >
        <Grid3X3 className="w-3 h-3" />
        Tat ca
      </motion.button>

      <motion.button
        onClick={() => onSelect('favorites')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap',
          'text-xs font-medium smooth-transition shrink-0 neon-press',
          selected === 'favorites' && 'neon-glow'
        )}
        style={
          selected === 'favorites'
            ? {
                background: 'rgba(0, 255, 136, 0.1)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                color: '#00ff88',
              }
            : {
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }
        }
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        layout
      >
        <Star className={cn('w-3 h-3', selected === 'favorites' && 'fill-current')} />
        Yeu thich
      </motion.button>

      {categories.map(cat => (
        <motion.button
          key={cat.id}
          onClick={() => onSelect(cat.name)}
          className={cn(
            'px-3 py-1.5 rounded-lg whitespace-nowrap',
            'text-xs font-medium smooth-transition shrink-0 neon-press',
            selected === cat.name && 'neon-glow'
          )}
          style={
            selected === cat.name
              ? {
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '1px solid rgba(0, 255, 136, 0.3)',
                  color: '#00ff88',
                }
              : {
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }
          }
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {cat.name}
        </motion.button>
      ))}
    </div>
  )
}
