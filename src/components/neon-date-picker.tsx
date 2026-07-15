'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from '@/lib/animations'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

interface NeonDatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  label?: string
  neonColor?: string
  className?: string
  accentColor?: 'emerald' | 'sky'
}

export function NeonDatePicker({
  value,
  onChange,
  label,
  neonColor = '#00ff88',
  className = '',
  accentColor = 'emerald',
}: NeonDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) return new Date(value).getFullYear()
    return new Date().getFullYear()
  })
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return new Date(value).getMonth()
    return new Date().getMonth()
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isSky = accentColor === 'sky'

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        // Also check the portal popup
        !(e.target as Element).closest('[data-calendar-popup]')
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Sync month/year when value changes
  useEffect(() => {
    if (value && !isOpen) {
      const d = new Date(value)
      setCurrentYear(d.getFullYear())
      setCurrentMonth(d.getMonth())
    }
  }, [value, isOpen])

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }
  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  const handleDaySelect = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onChange(dateStr)
    setIsOpen(false)
  }

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const showAbove = spaceBelow < 320 && spaceAbove > spaceBelow
      // Center popup on screen — tránh lệch/tràn ra mép trên mobile
      const popupWidth = Math.max(rect.width + 40, 280)
      const centeredLeft = Math.max(8, Math.min((window.innerWidth - popupWidth) / 2, window.innerWidth - popupWidth - 8))
      setPopupPos({
        left: centeredLeft,
        width: rect.width,
        top: showAbove ? rect.top - 310 : rect.bottom + 4,
      })
    }
    setIsOpen(!isOpen)
  }

  const displayValue = value ? new Date(value).toLocaleDateString('vi-VN') : ''

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let day = 1; day <= daysInMonth; day++) calendarCells.push(day)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="text-xs text-white/50 mb-1 block">{label}</label>}

      {/* Trigger button - same size as old Input type="date" */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full h-8 text-xs rounded-md flex items-center justify-between px-2.5 cursor-pointer hover:bg-white/8 transition-colors"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: `1px solid ${isSky ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
          color: 'white',
        }}
      >
        <span className={value ? 'text-white' : 'text-white/30'}>
          {displayValue || 'Chọn ngày...'}
        </span>
        <Calendar className="w-3.5 h-3.5" style={{ color: isSky ? '#38bdf8' : neonColor }} />
      </button>

      {/* Calendar Popup - rendered via Portal to avoid overflow/transform issues */}
      {isOpen && popupPos && createPortal(
        <AnimatePresence>
          <motion.div
            data-calendar-popup
            className="fixed inset-0 z-[9999]"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="fixed rounded-xl p-3 shadow-2xl"
              style={{
                background: '#0f141e',
                border: `1px solid ${neonColor}30`,
                boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                left: popupPos.left,
                top: popupPos.top,
                width: Math.max(popupPos.width + 40, 280),
                maxWidth: 'calc(100vw - 16px)',
              }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close button */}
              <motion.button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 p-1 rounded-md"
                style={{ color: `${neonColor}80` }}
                whileHover={{ scale: 1.1, rotate: 90, background: `${neonColor}15` }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>

              {/* Calendar Header - same style as MonthlyCalendar */}
              <div className="flex items-center justify-between mb-2">
                <motion.button
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: `${neonColor}12`,
                    border: `1px solid ${neonColor}25`,
                    color: neonColor,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </motion.button>

                <motion.button
                  onClick={goToToday}
                  className="text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                  style={{
                    color: neonColor,
                    background: `${neonColor}10`,
                    border: `1px solid ${neonColor}20`,
                    textShadow: `0 0 8px ${neonColor}40`,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Calendar className="w-3 h-3" />
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </motion.button>

                <motion.button
                  onClick={nextMonth}
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: `${neonColor}12`,
                    border: `1px solid ${neonColor}25`,
                    color: neonColor,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {/* Neon divider - same as MonthlyCalendar */}
              <div
                className="w-full h-[1px] mb-2"
                style={{
                  background: `linear-gradient(90deg, transparent, ${neonColor}50, ${neonColor}, ${neonColor}50, transparent)`,
                  boxShadow: `0 0 6px ${neonColor}35`,
                }}
              />

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] font-bold py-0.5 uppercase tracking-wider"
                    style={{
                      color: i === 0 ? '#ff8888' : `${neonColor}80`,
                      textShadow: i === 0 ? '0 0 6px rgba(255,136,136,0.4)' : `0 0 6px ${neonColor}30`,
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid - same style as MonthlyCalendar compact mode */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((day, i) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="aspect-[1.1] rounded-md"
                        style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                      />
                    )
                  }

                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === value
                  const isSunday = (firstDay + day - 1) % 7 === 0

                  return (
                    <motion.button
                      key={dateStr}
                      onClick={() => handleDaySelect(day)}
                      className="aspect-[1.1] rounded-md flex flex-col items-center justify-center text-[12px] font-semibold cursor-pointer relative overflow-hidden"
                      style={{
                        background: isSelected
                          ? `${neonColor}40`
                          : isToday
                          ? `${neonColor}20`
                          : 'rgba(255, 255, 255, 0.08)',
                        border: isSelected
                          ? `2px solid ${neonColor}90`
                          : isToday
                          ? `1px solid ${neonColor}50`
                          : '1px solid rgba(255, 255, 255, 0.10)',
                        boxShadow: isSelected
                          ? `0 0 12px ${neonColor}40, inset 0 0 8px ${neonColor}20`
                          : isToday
                          ? `0 0 8px ${neonColor}20`
                          : `0 0 4px ${neonColor}06`,
                        color: isSelected
                          ? neonColor
                          : isSunday
                          ? '#ff8888'
                          : 'rgba(255, 255, 255, 0.90)',
                        textShadow: isSelected
                          ? `0 0 10px ${neonColor}80`
                          : isSunday
                          ? '0 0 6px rgba(255,136,136,0.4)'
                          : `0 0 4px ${neonColor}15`,
                      }}
                      whileHover={{
                        background: `${neonColor}28`,
                        borderColor: `${neonColor}50`,
                        scale: 1.05,
                        boxShadow: `0 0 16px ${neonColor}30`,
                      }}
                      whileTap={{ scale: 0.94 }}
                    >
                      {day}
                      {/* Today glow ring - same as MonthlyCalendar */}
                      {isToday && !isSelected && (
                        <motion.div
                          className="absolute inset-0 rounded-md pointer-events-none"
                          style={{
                            border: `1.5px solid ${neonColor}`,
                            boxShadow: `0 0 12px ${neonColor}50, inset 0 0 10px ${neonColor}20`,
                          }}
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      )}
                      {/* Selected indicator dot */}
                      {isSelected && (
                        <motion.div
                          className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{
                            background: neonColor,
                            boxShadow: `0 0 6px ${neonColor}80`,
                          }}
                        />
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* Quick actions */}
              <div
                className="mt-2 pt-2 flex items-center justify-between"
                style={{ borderTop: `1px solid ${neonColor}15` }}
              >
                <motion.button
                  onClick={() => {
                    goToToday()
                    handleDaySelect(today.getDate())
                  }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1"
                  style={{
                    color: neonColor,
                    background: `${neonColor}10`,
                    border: `1px solid ${neonColor}20`,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Calendar className="w-3 h-3" />
                  Hôm nay
                </motion.button>
                {value && (
                  <motion.button
                    onClick={() => { onChange(''); setIsOpen(false) }}
                    className="text-[10px] font-medium px-2 py-1 rounded-md text-red-400/70 hover:text-red-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Xóa ngày
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
