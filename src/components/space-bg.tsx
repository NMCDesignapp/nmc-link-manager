'use client'

import { usePathname } from 'next/navigation'

/**
 * SpaceBackground — nền graphite navy dùng chung cho toàn Main App.
 *
 * KPI có lớp nền riêng trong template để tránh compositing/repaint dư trên mobile,
 * nên hai route KPI tiếp tục được loại trừ hoàn toàn khỏi lớp nền này.
 * Nền dùng gradient + lưới CSS nhẹ để đồng bộ với soft UI mà không phụ thuộc ảnh.
 */
export function SpaceBackground() {
  const pathname = usePathname()

  if (pathname === '/kpi' || pathname === '/kpi-standalone' || pathname.startsWith('/kpi/')) {
    return null
  }

  return (
    <div
      key={pathname}
      className="nmc-shared-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundColor: '#04101b',
        backgroundImage:
          'radial-gradient(circle at 16% 8%, rgba(40,125,170,.22), transparent 34%), radial-gradient(circle at 88% 30%, rgba(50,214,194,.11), transparent 31%), radial-gradient(circle at 52% 108%, rgba(72,126,164,.16), transparent 42%), linear-gradient(155deg, #081b2b 0%, #06131f 48%, #030b13 100%)',
      }}
      aria-hidden="true"
    >
      {/* Lưới kỹ thuật rất nhẹ, đủ tạo chiều sâu nhưng không cạnh tranh với nội dung. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(125,188,224,.026) 1px, transparent 1px), linear-gradient(90deg, rgba(125,188,224,.026) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,.78) 56%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,.78) 56%, transparent 100%)',
        }}
      />
      {/* Ánh sáng giữa nền và vignette giữ điểm nhìn ở vùng nội dung. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 34%, rgba(103,180,218,.055), transparent 48%), radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,.30) 100%)',
        }}
      />
    </div>
  )
}
