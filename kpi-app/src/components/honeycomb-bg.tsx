'use client'

export function HoneycombBackground() {
  // SVG-based honeycomb pattern
  const hexSize = 32
  const hexW = hexSize * 2
  const hexH = hexSize * Math.sqrt(3)
  const patternW = hexW * 0.75
  const patternH = hexH

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Honeycomb pattern layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="honeycomb"
            width={patternW}
            height={patternH}
            patternUnits="userSpaceOnUse"
          >
            {/* Flat-top hexagon */}
            <path
              d={`M ${hexSize} 0 L ${hexW * 0.75} ${hexH * 0.25} L ${hexW * 0.75} ${hexH * 0.75} L ${hexSize} ${hexH} L ${hexW * 0.25} ${hexH * 0.75} L ${hexW * 0.25} ${hexH * 0.25} Z`}
              fill="none"
              stroke="rgba(0, 255, 136, 0.12)"
              strokeWidth="0.6"
            />
            {/* Second hexagon for tiling offset */}
            <path
              d={`M ${hexSize + patternW} 0 L ${hexW * 0.75 + patternW} ${hexH * 0.25} L ${hexW * 0.75 + patternW} ${hexH * 0.75} L ${hexSize + patternW} ${hexH} L ${hexW * 0.25 + patternW} ${hexH * 0.75} L ${hexW * 0.25 + patternW} ${hexH * 0.25} Z`}
              fill="none"
              stroke="rgba(0, 255, 136, 0.12)"
              strokeWidth="0.6"
            />
            {/* Offset row hexagon */}
            <path
              d={`M ${hexSize + patternW / 2} ${hexH * 0.5} L ${hexW * 0.75 + patternW / 2} ${hexH * 0.75} L ${hexW * 0.75 + patternW / 2} ${hexH * 1.25} L ${hexSize + patternW / 2} ${hexH * 1.5} L ${hexW * 0.25 + patternW / 2} ${hexH * 1.25} L ${hexW * 0.25 + patternW / 2} ${hexH * 0.75} Z`}
              fill="none"
              stroke="rgba(0, 255, 136, 0.12)"
              strokeWidth="0.6"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb)" />
      </svg>

      {/* Animated flowing lines - CSS based */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Horizontal line 1 */}
        <div
          className="absolute w-[200%] h-[1px] hex-line-flow-1"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.9) 15%, rgba(0,255,136,0.7) 50%, rgba(0,212,255,0.9) 85%, transparent 100%)',
            top: '22%',
            opacity: 0.15,
          }}
        />
        {/* Horizontal line 2 */}
        <div
          className="absolute w-[200%] h-[1px] hex-line-flow-2"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.8) 25%, rgba(0,212,255,0.9) 55%, transparent 100%)',
            top: '52%',
            opacity: 0.12,
          }}
        />
        {/* Horizontal line 3 */}
        <div
          className="absolute w-[200%] h-[1px] hex-line-flow-3"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.8) 35%, rgba(0,212,255,0.6) 65%, transparent 100%)',
            top: '78%',
            opacity: 0.1,
          }}
        />
        {/* Horizontal line 4 */}
        <div
          className="absolute w-[200%] h-[1px] hex-line-flow-1"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.7) 30%, rgba(0,255,136,0.5) 60%, transparent 100%)',
            top: '38%',
            opacity: 0.08,
          }}
        />
        {/* Horizontal line 5 */}
        <div
          className="absolute w-[200%] h-[1px] hex-line-flow-2"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.6) 40%, rgba(0,212,255,0.7) 70%, transparent 100%)',
            top: '65%',
            opacity: 0.09,
          }}
        />
        {/* Horizontal line 6 */}
        <div
          className="absolute w-[200%] h-[1px] hex-line-flow-3"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.6) 20%, rgba(0,255,136,0.8) 50%, rgba(0,212,255,0.6) 80%, transparent 100%)',
            top: '90%',
            opacity: 0.07,
          }}
        />

        {/* Vertical lines */}
        <div
          className="absolute h-[200%] w-[1px] hex-line-flow-v1"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,136,0.7) 25%, rgba(0,212,255,0.5) 60%, transparent 100%)',
            left: '18%',
            opacity: 0.1,
          }}
        />
        <div
          className="absolute h-[200%] w-[1px] hex-line-flow-v2"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.6) 35%, rgba(0,255,136,0.7) 65%, transparent 100%)',
            left: '50%',
            opacity: 0.09,
          }}
        />
        <div
          className="absolute h-[200%] w-[1px] hex-line-flow-v1"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,136,0.5) 30%, rgba(0,212,255,0.6) 55%, transparent 100%)',
            left: '82%',
            opacity: 0.08,
          }}
        />
      </div>

      {/* Radial glows */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,136,0.5) 0%, transparent 70%)',
          top: '15%',
          left: '5%',
          opacity: 0.06,
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.4) 0%, transparent 70%)',
          bottom: '5%',
          right: '0%',
          opacity: 0.05,
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,136,0.3) 0%, transparent 70%)',
          top: '50%',
          left: '60%',
          opacity: 0.04,
        }}
      />
    </div>
  )
}
