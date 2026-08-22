'use client'

import { usePathname } from 'next/navigation'

/**
 * SpaceBackground — nền công nghệ xanh đen dùng chung cho toàn Main App.
 *
 * KPI có lớp nền riêng trong template để tránh compositing/repaint dư trên mobile,
 * nhưng dùng cùng một asset /nmc-tech-bg-v2.webp để toàn hệ thống đồng nhất.
 * Các card/bảng nội dung phía trên giữ nguyên style hiện tại.
 */
export function SpaceBackground() {
  const pathname = usePathname()

  if (pathname === '/kpi' || pathname === '/kpi-standalone' || pathname.startsWith('/kpi/')) {
    return null
  }

  return (
    <div
      key={pathname}
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundColor: '#050a12',
        backgroundImage: "url('/nmc-tech-bg-v2.webp')",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: 'cover',
      }}
      aria-hidden="true"
    >
      {/* Lớp tối rất nhẹ để chữ/card hiện tại luôn đủ tương phản, không đổi màu surface. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(2,7,15,.10) 0%, rgba(2,7,15,.04) 42%, rgba(2,7,15,.16) 100%)',
        }}
      />
      {/* Vignette nhẹ giữ điểm nhìn ở vùng nội dung trung tâm. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,.22) 100%)',
        }}
      />
    </div>
  )
}
