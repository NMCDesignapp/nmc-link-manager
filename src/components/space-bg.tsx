'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/hooks/use-settings'

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { settings } = useSettings()
  const neonColor = settings.neon_color || '#00ff88'
  const pathname = usePathname()

  // Disable space background on quan-ly page (it has its own solid background)
  const isQuanLy = pathname?.startsWith('/quan-ly')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || isQuanLy) return

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

    // ===== MATRIX BINARY RAIN (top 60% of screen) =====
    class MatrixColumn {
      x: number
      y: number
      speed: number
      chars: string[]
      charIndex: number
      length: number
      fontSize: number
      brightness: number

      constructor(x: number, canvasHeight: number) {
        this.x = x
        this.y = Math.random() * -500
        this.speed = 1.5 + Math.random() * 3.5
        this.length = 8 + Math.floor(Math.random() * 20)
        this.fontSize = 10 + Math.floor(Math.random() * 6)
        this.brightness = 0.3 + Math.random() * 0.7
        this.charIndex = 0
        this.chars = []
        // Generate random binary string
        for (let i = 0; i < this.length; i++) {
          this.chars.push(Math.random() > 0.5 ? '1' : '0')
        }
      }

      update() {
        this.y += this.speed
        // Randomly change a character
        if (Math.random() < 0.05) {
          const idx = Math.floor(Math.random() * this.chars.length)
          this.chars[idx] = Math.random() > 0.5 ? '1' : '0'
        }
        // Reset when off screen
        const totalHeight = this.length * this.fontSize
        if (this.y > canvas.height + totalHeight) {
          this.y = -totalHeight - Math.random() * 200
          this.speed = 1.5 + Math.random() * 3.5
        }
      }

      draw(ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number }, maxY: number) {
        ctx.font = `${this.fontSize}px monospace`
        for (let i = 0; i < this.chars.length; i++) {
          const charY = this.y + i * this.fontSize
          if (charY < 0 || charY > maxY) continue

          // Fade: head is brightest, tail fades out
          const fadeRatio = i / this.chars.length
          const alpha = (1 - fadeRatio) * this.brightness

          if (i === this.chars.length - 1) {
            // Head character - bright white/green
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`
            ctx.shadowBlur = 8
          } else if (i > this.chars.length - 4) {
            // Near head - bright color
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.8})`
            ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`
            ctx.shadowBlur = 4
          } else {
            // Tail - dimmer
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.35})`
            ctx.shadowBlur = 0
          }

          ctx.fillText(this.chars[i], this.x, charY)
          ctx.shadowBlur = 0
        }
      }
    }

    // Create matrix columns
    const columnSpacing = 22
    const columnCount = Math.ceil(canvas.width / columnSpacing) + 1
    const matrixColumns: MatrixColumn[] = []
    for (let i = 0; i < columnCount; i++) {
      matrixColumns.push(new MatrixColumn(i * columnSpacing, canvas.height))
    }

    // ===== 4D HYPERCUBE SPACE (bottom 40% of screen) =====
    class Hypercube {
      x: number
      y: number
      size: number
      rotXW: number
      rotYW: number
      rotZW: number
      rotXY: number
      speedXW: number
      speedYW: number
      speedZW: number
      speedXY: number
      alpha: number
      driftX: number
      driftY: number

      constructor(canvasWidth: number, canvasHeight: number) {
        this.x = Math.random() * canvasWidth
        this.y = canvasHeight * 0.6 + Math.random() * canvasHeight * 0.4
        this.size = 15 + Math.random() * 40
        this.rotXW = Math.random() * Math.PI * 2
        this.rotYW = Math.random() * Math.PI * 2
        this.rotZW = Math.random() * Math.PI * 2
        this.rotXY = Math.random() * Math.PI * 2
        this.speedXW = (Math.random() - 0.5) * 0.02
        this.speedYW = (Math.random() - 0.5) * 0.015
        this.speedZW = (Math.random() - 0.5) * 0.01
        this.speedXY = (Math.random() - 0.5) * 0.008
        this.alpha = 0.1 + Math.random() * 0.25
        this.driftX = (Math.random() - 0.5) * 0.4
        this.driftY = (Math.random() - 0.5) * 0.2
      }

      update() {
        this.rotXW += this.speedXW
        this.rotYW += this.speedYW
        this.rotZW += this.speedZW
        this.rotXY += this.speedXY
        this.x += this.driftX
        this.y += this.driftY

        if (this.x < -100) this.x = canvas.width + 100
        if (this.x > canvas.width + 100) this.x = -100
        if (this.y < canvas.height * 0.5) this.y = canvas.height + 50
        if (this.y > canvas.height + 100) this.y = canvas.height * 0.55
      }

      // 4D hypercube (tesseract) vertices - 16 vertices of a 4D cube
      getTesseractVertices(): number[][] {
        const s = this.size
        const vertices: number[][] = []
        for (let i = 0; i < 16; i++) {
          vertices.push([
            ((i & 1) ? 1 : -1) * s,
            ((i & 2) ? 1 : -1) * s,
            ((i & 4) ? 1 : -1) * s,
            ((i & 8) ? 1 : -1) * s,
          ])
        }
        return vertices
      }

      // Apply 4D rotations
      rotate4D(v: number[]): number[] {
        let [x, y, z, w] = v

        // XW rotation
        let nx = x * Math.cos(this.rotXW) - w * Math.sin(this.rotXW)
        let nw = x * Math.sin(this.rotXW) + w * Math.cos(this.rotXW)
        x = nx; w = nw

        // YW rotation
        let ny = y * Math.cos(this.rotYW) - w * Math.sin(this.rotYW)
        nw = y * Math.sin(this.rotYW) + w * Math.cos(this.rotYW)
        y = ny; w = nw

        // ZW rotation
        let nz = z * Math.cos(this.rotZW) - w * Math.sin(this.rotZW)
        nw = z * Math.sin(this.rotZW) + w * Math.cos(this.rotZW)
        z = nz; w = nw

        // XY rotation
        nx = x * Math.cos(this.rotXY) - y * Math.sin(this.rotXY)
        ny = x * Math.sin(this.rotXY) + y * Math.cos(this.rotXY)
        x = nx; y = ny

        return [x, y, z, w]
      }

      // Project 4D -> 3D -> 2D
      project(v: number[]): { x: number; y: number; depth: number } {
        const fov4 = 400
        const fov3 = 500

        // 4D -> 3D (perspective projection from w)
        const scale4 = fov4 / (fov4 + v[3])
        const x3 = v[0] * scale4
        const y3 = v[1] * scale4
        const z3 = v[2] * scale4

        // 3D -> 2D (perspective projection from z)
        const scale3 = fov3 / (fov3 + z3)
        return {
          x: this.x + x3 * scale3,
          y: this.y + y3 * scale3,
          depth: v[3],
        }
      }

      draw(ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number }) {
        const vertices = this.getTesseractVertices()
        const rotated = vertices.map(v => this.rotate4D(v))
        const projected = rotated.map(v => this.project(v))

        // Tesseract edges: connect vertices that differ in exactly one coordinate
        const edges: [number, number][] = []
        for (let i = 0; i < 16; i++) {
          for (let j = i + 1; j < 16; j++) {
            const diff = (i ^ j)
            // Diff in exactly one bit = differ in one 4D coordinate
            if (diff && !(diff & (diff - 1))) {
              edges.push([i, j])
            }
          }
        }

        // Draw edges with depth-based opacity
        edges.forEach(([a, b]) => {
          const pA = projected[a]
          const pB = projected[b]
          const avgDepth = (rotated[a][3] + rotated[b][3]) / 2
          // Deeper w = further away in 4th dimension = dimmer
          const depthFade = Math.max(0.15, Math.min(1, 1 - avgDepth / (this.size * 4)))
          const edgeAlpha = this.alpha * depthFade

          ctx.beginPath()
          ctx.moveTo(pA.x, pA.y)
          ctx.lineTo(pB.x, pB.y)
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${edgeAlpha})`
          ctx.lineWidth = depthFade > 0.6 ? 1.2 : 0.6
          ctx.stroke()
        })

        // Draw vertices as dots
        projected.forEach((p, i) => {
          const depthFade = Math.max(0.2, Math.min(1, 1 - rotated[i][3] / (this.size * 4)))
          const dotAlpha = this.alpha * depthFade * 1.5
          const dotSize = depthFade > 0.6 ? 2 : 1

          ctx.beginPath()
          ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${dotAlpha})`
          ctx.fill()
        })
      }
    }

    // Create hypercubes
    const hypercubeCount = 8
    const hypercubes: Hypercube[] = []
    for (let i = 0; i < hypercubeCount; i++) {
      hypercubes.push(new Hypercube(canvas.width, canvas.height))
    }

    // Stars for the 4D space area
    const stars: { x: number; y: number; size: number; twinkleSpeed: number; twinklePhase: number }[] = []
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.6 + Math.random() * canvas.height * 0.4,
        size: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      })
    }

    const color = hexToRgb(neonColor)

    const animate = () => {
      time += 0.016
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Transition zone where matrix meets 4D space
      const transitionY = canvas.height * 0.58
      const matrixMaxY = canvas.height * 0.65

      // === Draw Matrix binary rain (full screen, but fading toward bottom) ===
      matrixColumns.forEach(col => {
        col.update()
        col.draw(ctx, color, matrixMaxY)
      })

      // Fade overlay at the transition zone - smooth gradient from transparent to dark
      const fadeGrad = ctx.createLinearGradient(0, transitionY - 40, 0, transitionY + 80)
      fadeGrad.addColorStop(0, 'rgba(10, 10, 20, 0)')
      fadeGrad.addColorStop(0.4, 'rgba(10, 10, 20, 0.3)')
      fadeGrad.addColorStop(1, 'rgba(10, 10, 20, 0.85)')
      ctx.fillStyle = fadeGrad
      ctx.fillRect(0, transitionY - 40, canvas.width, 120)

      // === Draw 4D Hypercube Space (bottom area) ===
      // Background glow for 4D zone
      const spaceGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height * 0.85, 0,
        canvas.width / 2, canvas.height * 0.85, canvas.width * 0.5
      )
      spaceGlow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.03)`)
      spaceGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = spaceGlow
      ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5)

      // Draw stars
      stars.forEach(star => {
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * star.twinkleSpeed + star.twinklePhase))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${twinkle * 0.5})`
        ctx.fill()
      })

      // Draw hypercubes
      hypercubes.forEach(cube => {
        cube.update()
        cube.draw(ctx, color)
      })

      // Wormhole/tunnel effect at the very bottom
      const tunnelY = canvas.height * 0.88
      const tunnelRings = 5
      for (let i = 0; i < tunnelRings; i++) {
        const ringY = tunnelY + i * 18
        const ringRadius = 40 + i * 25 + Math.sin(time * 0.8 + i) * 10
        const ringAlpha = 0.06 - i * 0.01

        ctx.beginPath()
        ctx.ellipse(canvas.width / 2, ringY, ringRadius, ringRadius * 0.3, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(0.01, ringAlpha)})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [neonColor, isQuanLy])

  if (isQuanLy) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.75 }}
    />
  )
}
