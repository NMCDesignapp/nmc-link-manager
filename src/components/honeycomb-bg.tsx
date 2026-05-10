'use client'

export function HoneycombBackground() {
  // SVG-based honeycomb pattern - lightweight, no canvas needed
  const hexSize = 30
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
              stroke="rgba(0, 255, 136, 0.06)"
              strokeWidth="0.5"
            />
            {/* Second hexagon for tiling offset */}
            <path
              d={`M ${hexSize + patternW} 0 L ${hexW * 0.75 + patternW} ${hexH * 0.25} L ${hexW * 0.75 + patternW} ${hexH * 0.75} L ${hexSize + patternW} ${hexH} L ${hexW * 0.25 + patternW} ${hexH * 0.75} L ${hexW * 0.25 + patternW} ${hexH * 0.25} Z`}
              fill="none"
              stroke="rgba(0, 255, 136, 0.06)"
              strokeWidth="0.5"
            />
            {/* Offset row hexagon */}
            <path
              d={`M ${hexSize + patternW / 2} ${hexH * 0.5} L ${hexW * 0.75 + patternW / 2} ${hexH * 0.75} L ${hexW * 0.75 + patternW / 2} ${hexH * 1.25} L ${hexSize + patternW / 2} ${hexH * 1.5} L ${hexW * 0.25 + patternW / 2} ${hexH * 1.25} L ${hexW * 0.25 + patternW / 2} ${hexH * 0.75} Z`}
              fill="none"
              stroke="rgba(0, 255, 136, 0.06)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb)" />
      </svg>

      {/* Animated flowing lines - CSS based */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[200%] h-px hex-line-flow-1"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.8) 20%, rgba(0,255,136,0.6) 50%, rgba(0,212,255,0.8) 80%, transparent 100%)',
            top: '25%',
            opacity: 0.04,
          }}
        />
        <div
          className="absolute w-[200%] h-px hex-line-flow-2"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.6) 30%, rgba(0,212,255,0.8) 60%, transparent 100%)',
            top: '55%',
            opacity: 0.03,
          }}
        />
        <div
          className="absolute w-[200%] h-px hex-line-flow-3"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.7) 40%, rgba(0,212,255,0.5) 70%, transparent 100%)',
            top: '80%',
            opacity: 0.035,
          }}
        />
        {/* Vertical lines */}
        <div
          className="absolute h-[200%] w-px hex-line-flow-v1"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,255,136,0.6) 30%, rgba(0,212,255,0.4) 60%, transparent 100%)',
            left: '30%',
            opacity: 0.03,
          }}
        />
        <div
          className="absolute h-[200%] w-px hex-line-flow-v2"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.5) 40%, rgba(0,255,136,0.6) 70%, transparent 100%)',
            left: '70%',
            opacity: 0.025,
          }}
        />
      </div>

      {/* Subtle radial glows */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,255,136,0.4) 0%, transparent 70%)',
          top: '20%',
          left: '10%',
          opacity: 0.03,
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%)',
          bottom: '10%',
          right: '5%',
          opacity: 0.025,
        }}
      />
    </div>
  )
}
