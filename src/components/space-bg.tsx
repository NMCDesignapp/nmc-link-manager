'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/hooks/use-settings'

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { settings } = useSettings()
  const neonColor = settings.neon_color || '#00ff88'
  const pathname = usePathname()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Parse neon color to RGB
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return { r, g, b }
    }

    // ===== MATRIX BINARY RAIN (full screen) =====
    class MatrixColumn {
      x: number
      y: number
      speed: number
      chars: string[]
      length: number
      fontSize: number
      brightness: number

      constructor(x: number, canvasHeight: number) {
        this.x = x
        this.y = Math.random() * -500
        this.speed = 1.5 + Math.random() * 3.5
        this.length = 8 + Math.floor(Math.random() * 20)
        this.fontSize = 14 + Math.floor(Math.random() * 8) // larger font: 14-22px (was 10-16px)
        this.brightness = 0.3 + Math.random() * 0.7
        const chars: string[] = []
        for (let i = 0; i < this.length; i++) {
          chars.push(Math.random() > 0.5 ? '1' : '0')
        }
        this.chars = chars
      }

      update() {
        this.y += this.speed
        if (Math.random() < 0.05) {
          const idx = Math.floor(Math.random() * this.chars.length)
          this.chars[idx] = Math.random() > 0.5 ? '1' : '0'
        }
        const totalHeight = this.length * this.fontSize
        if (this.y > canvas!.height + totalHeight) {
          this.y = -totalHeight - Math.random() * 200
          this.speed = 1.5 + Math.random() * 3.5
        }
      }

      draw(ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number }) {
        ctx.font = `${this.fontSize}px monospace`
        for (let i = 0; i < this.chars.length; i++) {
          const charY = this.y + i * this.fontSize
          if (charY < 0 || charY > canvas!.height) continue

          const fadeRatio = i / this.chars.length
          const alpha = (1 - fadeRatio) * this.brightness

          if (i === this.chars.length - 1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            ctx.shadowBlur = 8
          } else if (i > this.chars.length - 4) {
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.8})`
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`
            ctx.shadowBlur = 4
          } else {
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.35})`
            ctx.shadowBlur = 0
          }

          ctx.fillText(this.chars[i], this.x, charY)
          ctx.shadowBlur = 0
        }
      }
    }

    // Create matrix columns — wider spacing for larger font
    const columnSpacing = 28
    const columnCount = Math.ceil(canvas.width / columnSpacing) + 1
    const matrixColumns: MatrixColumn[] = []
    for (let i = 0; i < columnCount; i++) {
      matrixColumns.push(new MatrixColumn(i * columnSpacing, canvas.height))
    }

    const color = hexToRgb(neonColor)

    const animate = () => {
      time += 0.016
      // Clear with dark background (no transparency — solid fill)
      ctx.fillStyle = '#1a2332'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw matrix rain across full screen
      matrixColumns.forEach(col => {
        col.update()
        col.draw(ctx, color)
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [neonColor])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 1 }}
    />
  )
}
