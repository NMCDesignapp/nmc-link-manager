'use client'

import { usePathname } from 'next/navigation'

/**
 * SpaceBackground — nền xám với vân tổ ong (hexagon pattern).
 *
 * Theo yêu cầu user: nền xám + pattern tổ ong, không phải hình Phật hay binary rain.
 * Áp dụng cho các trang Main App; KPI có nền công nghệ riêng nên không render
 * thêm lớp fixed background này để tránh compositing/repaint dư trên mobile.
 */
export function SpaceBackground() {
  const pathname = usePathname()

  if (pathname === '/kpi' || pathname === '/kpi-standalone' || pathname.startsWith('/kpi/')) {
    return null
  }

  // SVG hexagon tile — vân tổ ong (honeycomb)
  // Hexagon kích thước 40px, viền mảnh, lặp đều tạo vân tổ ong
  const hexPattern = `
<svg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'>
  <g fill='none' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.08'>
    <!-- Hexagon 1 -->
    <path d='M 15 1 L 29 9 L 29 25 L 15 33 L 1 25 L 1 9 Z'/>
    <!-- Hexagon 2 (offset to form honeycomb) -->
    <path d='M 45 1 L 59 9 L 59 25 L 45 33 L 31 25 L 31 9 Z'/>
    <!-- Hexagon 3 (row below) -->
    <path d='M 30 26 L 44 34 L 44 50 L 30 58 L 16 50 L 16 34 Z'/>
  </g>
</svg>`.trim()

  // Encode SVG → data URI (cho background-image CSS)
  const dataUri = `url("data:image/svg+xml,${hexPattern.replace(/\n/g, '')}")`

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
      {/* Pattern tổ ong overlay — opacity vừa phải, lặp đều */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: dataUri,
          backgroundRepeat: 'repeat',
          backgroundSize: '60px 52px',
          opacity: 1,
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
