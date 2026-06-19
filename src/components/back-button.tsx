'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface BackButtonProps {
  /** Override default behavior with custom onClick */
  onClick?: () => void
  /** Override default route. Default: '/' */
  href?: string
  /** Size in px. Default: 32 */
  size?: number
  /** Custom title/tooltip */
  title?: string
  /** Optional className override (use sparingly) */
  className?: string
  /** Optional aria-label override */
  ariaLabel?: string
}

/**
 * Neon round back button used across all pages.
 * - Hình tròn, nhỏ
 * - Bên trong có dấu > (ChevronLeft)
 * - Màu xanh neon (#00ff88 / emerald)
 * - Glow effect + hover scale
 */
export function BackButton({
  onClick,
  href = '/',
  size = 32,
  title = 'Trở về',
  className = '',
  ariaLabel,
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) onClick()
    else router.push(href)
  }

  // Compute size-dependent values
  const iconSize = Math.round(size * 0.5) // 50% of button size
  const borderWidth = Math.max(1, Math.round(size * 0.04)) // ~4% of size

  return (
    <button
      onClick={handleClick}
      title={title}
      aria-label={ariaLabel || title}
      className={`group inline-flex items-center justify-center rounded-full flex-shrink-0 cursor-pointer transition-all duration-200 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: 'rgba(0, 255, 136, 0.08)',
        border: `${borderWidth}px solid rgba(0, 255, 136, 0.45)`,
        color: '#00ff88',
        boxShadow: '0 0 8px rgba(0, 255, 136, 0.25), inset 0 0 6px rgba(0, 255, 136, 0.10)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 255, 136, 0.18)'
        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.85)'
        e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 255, 136, 0.55), inset 0 0 10px rgba(0, 255, 136, 0.20)'
        e.currentTarget.style.transform = 'scale(1.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)'
        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.45)'
        e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 255, 136, 0.25), inset 0 0 6px rgba(0, 255, 136, 0.10)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)' }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
    >
      <ChevronLeft
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          strokeWidth: 2.5,
          filter: 'drop-shadow(0 0 4px rgba(0, 255, 136, 0.6))',
        }}
      />
    </button>
  )
}
