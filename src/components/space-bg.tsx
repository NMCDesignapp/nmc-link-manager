'use client'

import { usePathname } from 'next/navigation'
import { useSettings } from '@/hooks/use-settings'

/**
 * SpaceBackground — nền tĩnh xám với pattern hình Phật (Buddha silhouette) thấp sắc.
 *
 * Trước đây là Matrix binary rain (0/1 rơi). Đã thay theo yêu cầu user:
 *   - Nền gradient xám tối (không còn binary rain)
 *   - PatternSVG hình Phật lặp lại, opacity vừa phải (12%) — thấy rõ但不 nhiễu
 *   - Áp dụng cho tất cả trang (render ở layout.tsx)
 *
 * PatternSVG: một Phật tổ ngồi thiền trên hoa sen, vẽ tay (SVG path đơn giản).
 */
export function SpaceBackground() {
  const { settings } = useSettings()
  const neonColor = settings.neon_color || '#00ff88'
  const pathname = usePathname()

  // SVG Buddha silhouette — seated Buddha on lotus, simple flat design
  // Dùng data URI để nhúng trực tiếp vào CSS background-image
  const buddhaPattern = `
<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'>
  <g fill='none' stroke='${encodeURIComponent(neonColor)}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' opacity='0.7'>
    <!-- Halo (đầu Phật) -->
    <circle cx='90' cy='58' r='26'/>
    <circle cx='90' cy='58' r='19'/>
    <!-- Đầu -->
    <path d='M 78 58 Q 90 44 102 58 Q 99 70 90 72 Q 81 70 78 58 Z'/>
    <!-- Thân (áo cà sa) — hình tam giác mở rộng xuống -->
    <path d='M 66 80 Q 90 72 114 80 L 126 138 Q 90 150 54 138 Z'/>
    <!-- Hai tay chập trước ngực -->
    <path d='M 78 104 Q 90 100 102 104 Q 99 116 90 118 Q 81 116 78 104 Z'/>
    <!-- Hoa sen dưới chân -->
    <path d='M 54 148 Q 66 138 78 148 Q 90 138 102 148 Q 114 138 126 148'/>
    <path d='M 60 156 Q 90 146 120 156'/>
    <!-- Cánh sen hai bên -->
    <path d='M 48 150 Q 40 144 36 152 Q 42 158 48 154'/>
    <path d='M 132 150 Q 140 144 144 152 Q 138 158 132 154'/>
  </g>
</svg>`.trim()

  // Encode SVG → data URI (cho background-image CSS)
  const dataUri = `url("data:image/svg+xml,${buddhaPattern.replace(/#/g, '%23').replace(/\n/g, '')}")`

  return (
    <div
      key={pathname}
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        // Nền gradient xám tối — xám rõ ràng, không quá đen
        background: `
          radial-gradient(ellipse at top, #3a3f48 0%, #2a2e36 50%, #1f2329 100%)
        `,
      }}
    >
      {/* Pattern Phật overlay — opacity vừa phải, lặp đều */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: dataUri,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
          opacity: 0.14,
        }}
      />
      {/* Vignette nhẹ ở 4 góc để tập trung vào content giữa */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)',
        }}
      />
    </div>
  )
}
