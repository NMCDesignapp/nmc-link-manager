'use client'

import { useEffect, useRef } from 'react'

export function HoneycombBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let hexagons: { x: number; y: number; size: number; phase: number; speed: number }[] = []

    const resize = () => {
      width = window.innerWidth
      height = document.documentElement.scrollHeight
      canvas.width = width
      canvas.height = height
      generateHexagons()
    }

    const hexSize = 38
    const hexHeight = hexSize * Math.sqrt(3)

    const generateHexagons = () => {
      hexagons = []
      const cols = Math.ceil(width / (hexSize * 1.5)) + 2
      const rows = Math.ceil(height / hexHeight) + 2

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * hexSize * 1.5
          const y = row * hexHeight + (col % 2 === 0 ? 0 : hexHeight / 2)
          hexagons.push({
            x,
            y,
            size: hexSize,
            phase: Math.random() * Math.PI * 2,
            speed: 0.003 + Math.random() * 0.005,
          })
        }
      }
    }

    const drawHex = (cx: number, cy: number, size: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const px = cx + size * Math.cos(angle)
        const py = cy + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    }

    let time = 0

    const animate = () => {
      time += 1
      ctx.clearRect(0, 0, width, height)

      for (const hex of hexagons) {
        const pulse = Math.sin(time * hex.speed + hex.phase)
        const alpha = 0.025 + pulse * 0.015

        // Draw hex outline
        drawHex(hex.x, hex.y, hex.size)
        ctx.strokeStyle = `rgba(0, 255, 136, ${Math.max(0.008, alpha)})`
        ctx.lineWidth = 0.5
        ctx.stroke()

        // Occasional glow on some hexagons
        if (pulse > 0.85) {
          drawHex(hex.x, hex.y, hex.size)
          ctx.strokeStyle = `rgba(0, 255, 136, ${0.06 * (pulse - 0.85) / 0.15})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // Animated flowing lines along honeycomb paths
      const lineCount = 5
      for (let l = 0; l < lineCount; l++) {
        const linePhase = (time * 0.008 + l * 1.3) % (width + height)
        const baseY = (height / (lineCount + 1)) * (l + 1)
        const wobbleY = Math.sin(time * 0.01 + l * 2) * 60

        ctx.beginPath()
        ctx.moveTo(0, baseY + wobbleY)

        for (let x = 0; x < width; x += hexSize * 1.5) {
          const col = Math.round(x / (hexSize * 1.5))
          const yOffset = (col % 2 === 0 ? 0 : hexHeight / 2)
          const nearHex = hexagons.find(h =>
            Math.abs(h.x - x) < hexSize && Math.abs(h.y - (baseY + yOffset)) < hexHeight
          )
          const snapY = nearHex ? nearHex.y : baseY + yOffset + wobbleY
          ctx.lineTo(x, snapY + Math.sin(time * 0.015 + x * 0.01 + l) * 15)
        }

        const lineAlpha = 0.04 + Math.sin(time * 0.02 + l) * 0.02
        ctx.strokeStyle = `rgba(0, 212, 255, ${Math.max(0.01, lineAlpha)})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      animRef.current = requestAnimationFrame(animate)
    }

    resize()
    animate()

    // Re-measure on scroll/resize
    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    // Periodically re-measure height in case content changes
    const interval = setInterval(() => {
      const newHeight = document.documentElement.scrollHeight
      if (Math.abs(newHeight - height) > 100) {
        resize()
      }
    }, 3000)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', onResize)
      clearInterval(interval)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.6 }}
    />
  )
}
