'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from '@/lib/animations'

export function DesktopBigClock({ neonColor = '#00ff88' }: { neonColor?: string }) {
  const [time, setTime] = useState(new Date())
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(4) // rem

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Dynamic sizing based on container height
  const updateSize = useCallback(() => {
    if (!containerRef.current) return
    const h = containerRef.current.clientHeight
    if (h <= 0) return
    // Calculate font size: fit clock comfortably in available height
    // Clock takes roughly 1.1x the main font size in height + some padding for date info
    const calculated = (h - 80) / 1.1
    const clamped = Math.min(5.5, Math.max(2.5, calculated))
    setFontSize(clamped)
  }, [])

  useEffect(() => {
    updateSize()
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => updateSize())
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateSize])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const dayName = dayNames[time.getDay()]
  const dayNum = time.getDate()
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
  const monthName = monthNames[time.getMonth()]

  const colonSize = fontSize * 0.78
  const secondsSize = fontSize * 0.33

  return (
    <motion.div
      ref={containerRef}
      className="relative z-10 flex flex-col items-center justify-center w-full h-full py-2 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      {/* Main time */}
      <div
        className="flex items-baseline tracking-wider leading-none"
        style={{
          fontFamily: '"Outfit", monospace',
        }}
      >
        <span
          className="font-black"
          style={{
            fontSize: `${fontSize}rem`,
            color: neonColor,
            textShadow: `0 0 30px ${neonColor}80, 0 0 80px ${neonColor}40, 0 0 140px ${neonColor}20, 0 0 200px ${neonColor}10`,
            lineHeight: 1,
          }}
        >
          {hours}
        </span>
        <span
          className="animate-pulse mx-1 opacity-60"
          style={{
            fontSize: `${colonSize}rem`,
            color: neonColor,
            textShadow: `0 0 20px ${neonColor}60`,
            lineHeight: 1,
          }}
        >
          :
        </span>
        <span
          className="font-black"
          style={{
            fontSize: `${fontSize}rem`,
            color: neonColor,
            textShadow: `0 0 30px ${neonColor}80, 0 0 80px ${neonColor}40, 0 0 140px ${neonColor}20, 0 0 200px ${neonColor}10`,
            lineHeight: 1,
          }}
        >
          {minutes}
        </span>
        <span
          className="ml-2 opacity-40 self-end mb-4"
          style={{
            fontSize: `${secondsSize}rem`,
            color: neonColor,
            textShadow: `0 0 12px ${neonColor}30`,
            fontFamily: '"Outfit", monospace',
            lineHeight: 1,
          }}
        >
          :{seconds}
        </span>
      </div>

      {/* Day & Date info */}
      <div className="flex items-center gap-3 mt-1">
        <span
          className="text-sm font-semibold"
          style={{
            color: `${neonColor}90`,
            textShadow: `0 0 8px ${neonColor}30`,
          }}
        >
          {dayName}
        </span>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            color: neonColor,
            background: `${neonColor}12`,
            border: `1px solid ${neonColor}25`,
            textShadow: `0 0 6px ${neonColor}30`,
          }}
        >
          {dayNum} {monthName}
        </span>
      </div>

      {/* Decorative glow line */}
      <div className="w-3/4 mt-2 relative h-[2px] rounded-full overflow-hidden">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${neonColor}30, ${neonColor}60, ${neonColor}30, transparent)`,
          }}
        />
        <motion.div
          className="absolute h-full rounded-full"
          style={{
            width: '30%',
            background: `linear-gradient(90deg, transparent, ${neonColor}, transparent)`,
            filter: `drop-shadow(0 0 6px ${neonColor}80)`,
          }}
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  )
}
