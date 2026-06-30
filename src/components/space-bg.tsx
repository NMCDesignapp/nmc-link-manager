'use client'

import { usePathname } from 'next/navigation'
import { useSettings } from '@/hooks/use-settings'

/**
 * SpaceBackground — nền tĩnh xám với pattern hình Phật (Buddha silhouette) thấp sắc.
 *
 * Trước đây là Matrix binary rain (0/1 rơi). Đã thay theo yêu cầu user:
 *   - Nền gradient xám tối (không còn binary rain)
 *   - PatternSVG hình Phật lặp lại, opacity thấp (5-8%) — nhẹ nhàng, không gây nhiễu
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
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
  <g fill='none' stroke='${encodeURIComponent(neonColor)}' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round' opacity='0.55'>
    <!-- Halo (đầu Phật) -->
    <circle cx='80' cy='50' r='22'/>
    <circle cx='80' cy='50' r='16'/>
    <!-- Đầu -->
    <path d='M 70 50 Q 80 38 90 50 Q 88 60 80 62 Q 72 60 70 50 Z'/>
    <!-- Thân (áo cà sa) — hình tam giác mở rộng xuống -->
    <path d='M 60 70 Q 80 64 100 70 L 110 120 Q 80 130 50 120 Z'/>
    <!-- Hai tay chắp trước ngực -->
    <path d='M 70 90 Q 80 86 90 90 Q 88 100 80 102 Q 72 100 70 90 Z'/>
    <!-- Hoa sen dưới chân -->
    <path d='M 50 130 Q 60 122 70 130 Q 80 122 90 130 Q 100 122 110 130'/>
    <path d='M 55 138 Q 80 130 105 138'/>
    <!-- Cánh sen hai bên -->
    <path d='M 45 132 Q 38 128 36 134 Q 40 138 45 136'/>
    <path d='M 115 132 Q 122 128 124 134 Q 120 138 115 136'/>
  </g>
</svg>`.trim()

  // Encode SVG → data URI (cho background-image CSS)
  const dataUri = `url("data:image/svg+xml,${buddhaPattern.replace(/#/g, '%23').replace(/\n/g, '')}")`

  return (
    <div
      key={pathname}
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        // Nền gradient xám tối — không còn binary rain
        background: `
          radial-gradient(ellipse at top, #2a2e36 0%, #1a1d24 60%, #0f1116 100%)
        `,
      }}
    >
      {/* Pattern Phật overlay — opacity thấp, lặp đều */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: dataUri,
          backgroundRepeat: 'repeat',
          backgroundSize: '160px 160px',
          opacity: 0.08,
        }}
      />
      {/* Vignette nhẹ ở 4 góc để tập trung vào content giữa */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </div>
  )
}
