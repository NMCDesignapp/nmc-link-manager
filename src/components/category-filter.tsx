'use client'

import { Category } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Grid3X3, Star } from 'lucide-react'

interface CategoryFilterProps {
  categories: Category[]
  selected: string
  onSelect: (category: string) => void
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide flex-1">
      <button
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
      >
        <Grid3X3 className="w-3 h-3" />
        Tat ca
      </button>

      <button
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
      >
        <Star className={cn('w-3 h-3', selected === 'favorites' && 'fill-current')} />
        Yeu thich
      </button>

      {categories.map(cat => (
        <button
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
        >
          {cat.name}
        </button>
      ))}
    </div>
  )
}
