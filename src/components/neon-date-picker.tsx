'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/animations'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

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
  accentColor?: 'emerald' | 'sky' // to match the thi đua sections
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
  const [currentYear, setCurrentYear] = useState(() => {
    if (value) return new Date(value).getFullYear()
    return new Date().getFullYear()
  })
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return new Date(value).getMonth()
    return new Date().getMonth()
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLButtonElement>(null)

  const isSky = accentColor === 'sky'
  const borderColor = isSky ? 'border-sky-500/20' : 'border-emerald-500/20'

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Sync month/year when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) {
        // Only update if user hasn't opened the picker
        if (!isOpen) {
          setCurrentYear(d.getFullYear())
          setCurrentMonth(d.getMonth())
        }
      }
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

  const displayValue = value ? new Date(value).toLocaleDateString('vi-VN') : ''

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) calendarCells.push(null)
  for (let day = 1; day <= daysInMonth; day++) calendarCells.push(day)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="text-xs text-white/50 mb-1 block">{label}</label>}

      {/* Trigger button styled like the date input */}
      <button
        ref={inputRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-8 text-xs ${borderColor} bg-white/5 text-white rounded-md flex items-center justify-between px-2.5 cursor-pointer hover:bg-white/8 transition-colors`}
        style={{
          border: `1px solid ${isSky ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
        }}
      >
        <span className={value ? 'text-white' : 'text-white/30'}>
          {displayValue || 'Chọn ngày...'}
        </span>
        <Calendar className="w-3.5 h-3.5" style={{ color: isSky ? '#38bdf8' : neonColor }} />
      </button>

      {/* Calendar Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute z-[60] left-0 right-0 mt-1"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div
              className="rounded-xl p-2.5 shadow-2xl"
              style={{
                background: 'rgba(15, 20, 30, 0.97)',
                border: `1px solid ${neonColor}25`,
                boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 20px ${neonColor}10`,
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-2">
                <motion.button
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: `${neonColor}15`,
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
                    background: `${neonColor}12`,
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
                    background: `${neonColor}15`,
                    border: `1px solid ${neonColor}25`,
                    color: neonColor,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {/* Neon divider */}
              <div
                className="w-full h-[1px] mb-2"
                style={{
                  background: `linear-gradient(90deg, transparent, ${neonColor}50, ${neonColor}, ${neonColor}50, transparent)`,
                  boxShadow: `0 0 6px ${neonColor}35`,
                }}
              />

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {WEEKDAYS.map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-[9px] font-bold py-0.5 uppercase tracking-wider"
                    style={{
                      color: i === 0 ? '#ff8888' : `${neonColor}80`,
                      textShadow: i === 0 ? '0 0 6px rgba(255,136,136,0.4)' : `0 0 6px ${neonColor}30`,
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((day, i) => {
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${i}`}
                        className="aspect-square rounded-sm"
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
                      className="aspect-square rounded-sm flex items-center justify-center text-[11px] font-semibold cursor-pointer relative"
                      style={{
                        background: isSelected
                          ? `${neonColor}35`
                          : isToday
                          ? `${neonColor}20`
                          : 'rgba(255, 255, 255, 0.06)',
                        border: isSelected
                          ? `1.5px solid ${neonColor}`
                          : isToday
                          ? `1px solid ${neonColor}50`
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        boxShadow: isSelected
                          ? `0 0 12px ${neonColor}40, inset 0 0 8px ${neonColor}15`
                          : isToday
                          ? `0 0 8px ${neonColor}20`
                          : 'none',
                        color: isSelected
                          ? neonColor
                          : isSunday
                          ? '#ff8888'
                          : 'rgba(255, 255, 255, 0.85)',
                        textShadow: isSelected
                          ? `0 0 10px ${neonColor}80`
                          : isSunday
                          ? '0 0 6px rgba(255,136,136,0.4)'
                          : 'none',
                      }}
                      whileHover={{
                        background: `${neonColor}20`,
                        borderColor: `${neonColor}40`,
                        scale: 1.08,
                      }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {day}
                      {/* Selected indicator dot */}
                      {isSelected && (
                        <motion.div
                          className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{
                            background: neonColor,
                            boxShadow: `0 0 6px ${neonColor}80`,
                          }}
                          layoutId="selected-dot"
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
                  className="text-[10px] font-semibold px-2 py-1 rounded-md"
                  style={{
                    color: neonColor,
                    background: `${neonColor}10`,
                    border: `1px solid ${neonColor}20`,
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Hôm nay
                </motion.button>
                {value && (
                  <motion.button
                    onClick={() => { onChange(''); setIsOpen(false) }}
                    className="text-[10px] font-medium px-2 py-1 rounded-md text-red-400/70 hover:text-red-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Xóa
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
