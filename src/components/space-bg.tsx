'use client'

import { useEffect, useRef } from 'react'
import { useSettings } from '@/hooks/use-settings'

export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { settings } = useSettings()
  const neonColor = settings.neon_color || '#00ff88'

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

    // Cube class - concave/inward rotating cubes
    class Cube {
      x: number
      y: number
      z: number
      size: number
      rotX: number
      rotY: number
      rotZ: number
      rotSpeedX: number
      rotSpeedY: number
      rotSpeedZ: number
      driftX: number
      driftY: number
      driftZ: number
      alpha: number
      concave: number // 0-1 how concave

      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.z = Math.random() * 600 - 300
        this.size = 20 + Math.random() * 50
        this.rotX = Math.random() * Math.PI * 2
        this.rotY = Math.random() * Math.PI * 2
        this.rotZ = Math.random() * Math.PI * 2
        this.rotSpeedX = (Math.random() - 0.5) * 0.015
        this.rotSpeedY = (Math.random() - 0.5) * 0.015
        this.rotSpeedZ = (Math.random() - 0.5) * 0.008
        this.driftX = (Math.random() - 0.5) * 0.3
        this.driftY = (Math.random() - 0.5) * 0.2
        this.driftZ = (Math.random() - 0.5) * 0.3
        this.alpha = 0.08 + Math.random() * 0.18
        this.concave = 0.15 + Math.random() * 0.25 // how much the faces push inward
      }

      update() {
        this.rotX += this.rotSpeedX
        this.rotY += this.rotSpeedY
        this.rotZ += this.rotSpeedZ
        this.x += this.driftX
        this.y += this.driftY
        this.z += this.driftZ

        // Wrap around
        if (this.x < -100) this.x = canvas.width + 100
        if (this.x > canvas.width + 100) this.x = -100
        if (this.y < -100) this.y = canvas.height + 100
        if (this.y > canvas.height + 100) this.y = -100
        if (this.z < -400) this.z = 400
        if (this.z > 400) this.z = -400
      }

      project(px: number, py: number, pz: number) {
        const fov = 500
        const scale = fov / (fov + pz + this.z)
        return {
          x: this.x + px * scale,
          y: this.y + py * scale,
          scale
        }
      }

      draw(ctx: CanvasRenderingContext2D, color: { r: number; g: number; b: number }) {
        const s = this.size
        const c = this.concave * s // concave offset - faces push inward

        // 8 vertices of a cube, with concave offset on inner faces
        const vertices = [
          [-s, -s, -s], // 0: back-top-left
          [ s, -s, -s], // 1: back-top-right
          [ s,  s, -s], // 2: back-bottom-right
          [-s,  s, -s], // 3: back-bottom-left
          [-s, -s,  s], // 4: front-top-left
          [ s, -s,  s], // 5: front-top-right
          [ s,  s,  s], // 6: front-bottom-right
          [-s,  s,  s], // 7: front-bottom-left
        ]

        // Apply concave deformation - push face centers inward
        const concaveVertices = vertices.map(v => {
          // Push each face toward center by concave amount
          const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2])
          const factor = 1 - this.concave * 0.5
          return [v[0] * factor, v[1] * factor, v[2] * factor]
        })

        // Rotate vertices
        const rotated = concaveVertices.map(([vx, vy, vz]) => {
          // Rotate X
          let y1 = vy * Math.cos(this.rotX) - vz * Math.sin(this.rotX)
          let z1 = vy * Math.sin(this.rotX) + vz * Math.cos(this.rotX)
          // Rotate Y
          let x2 = vx * Math.cos(this.rotY) + z1 * Math.sin(this.rotY)
          let z2 = -vx * Math.sin(this.rotY) + z1 * Math.cos(this.rotY)
          // Rotate Z
          let x3 = x2 * Math.cos(this.rotZ) - y1 * Math.sin(this.rotZ)
          let y3 = x2 * Math.sin(this.rotZ) + y1 * Math.cos(this.rotZ)
          return [x3, y3, z2]
        })

        // Project to 2D
        const projected = rotated.map(([vx, vy, vz]) => this.project(vx, vy, vz))

        // 6 faces (each defined by 4 vertex indices)
        const faces = [
          [0, 1, 2, 3], // back
          [4, 5, 6, 7], // front
          [0, 4, 7, 3], // left
          [1, 5, 6, 2], // right
          [0, 1, 5, 4], // top
          [3, 2, 6, 7], // bottom
        ]

        // Calculate face depths and normals for painter's algorithm
        const faceData = faces.map((face, fi) => {
          const avgZ = face.reduce((sum, vi) => sum + rotated[vi][2], 0) / 4
          // Normal (cross product of two edges)
          const e1 = [rotated[face[1]][0] - rotated[face[0]][0], rotated[face[1]][1] - rotated[face[0]][1], rotated[face[1]][2] - rotated[face[0]][2]]
          const e2 = [rotated[face[3]][0] - rotated[face[0]][0], rotated[face[3]][1] - rotated[face[0]][1], rotated[face[3]][2] - rotated[face[0]][2]]
          const nx = e1[1]*e2[2] - e1[2]*e2[1]
          const ny = e1[2]*e2[0] - e1[0]*e2[2]
          const nz = e1[0]*e2[1] - e1[1]*e2[0]
          // Facing camera? (positive Z = toward viewer)
          const facing = nz > 0
          return { face, avgZ, facing, fi, nx, ny, nz }
        })

        // Sort by depth (far to near)
        faceData.sort((a, b) => a.avgZ - b.avgZ)

        // Draw faces
        faceData.forEach(({ face, facing, fi }) => {
          const points = face.map(vi => projected[vi])
          
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y)
          }
          ctx.closePath()

          // Fill with semi-transparent color based on facing
          const faceAlpha = facing ? this.alpha * 1.2 : this.alpha * 0.5
          const fillAlpha = facing ? this.alpha * 0.3 : this.alpha * 0.1
          
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${fillAlpha})`
          ctx.fill()

          // Edges with glow
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${faceAlpha})`
          ctx.lineWidth = facing ? 1.2 : 0.6
          ctx.stroke()
        })

        // Draw inner concave lines (wireframe connecting face centers to vertices)
        // This creates the "concave/inward" visual effect
        const center = projected.reduce((acc, p) => ({ x: acc.x + p.x / 8, y: acc.y + p.y / 8 }), { x: 0, y: 0 })
        
        // Draw lines from vertices toward center (concave effect)
        projected.forEach((p, i) => {
          const concaveFactor = 0.6 + this.concave * 0.8
          const ix = p.x + (center.x - p.x) * this.concave * 0.3
          const iy = p.y + (center.y - p.y) * this.concave * 0.3
          
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(ix, iy)
          ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${this.alpha * 0.15})`
          ctx.lineWidth = 0.3
          ctx.stroke()
        })
      }
    }

    // Create cubes
    const cubeCount = 15
    const cubes: Cube[] = []
    for (let i = 0; i < cubeCount; i++) {
      cubes.push(new Cube())
    }

    // Stars
    const stars: { x: number; y: number; size: number; twinkleSpeed: number; twinklePhase: number }[] = []
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.5 + Math.random() * 1.5,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      })
    }

    const color = hexToRgb(neonColor)

    const animate = () => {
      time += 0.016
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw stars
      stars.forEach(star => {
        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * star.twinkleSpeed + star.twinklePhase))
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${twinkle * 0.4})`
        ctx.fill()
      })

      // Draw cubes
      cubes.forEach(cube => {
        cube.update()
        cube.draw(ctx, color)
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
      style={{ opacity: 0.7 }}
    />
  )
}
