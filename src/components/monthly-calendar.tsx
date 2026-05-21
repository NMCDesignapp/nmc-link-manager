'use client'

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from '@/lib/animations'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Calendar, Clock, Zap, TrendingUp } from 'lucide-react'
import useSWR, { mutate } from 'swr'

interface CalendarEvent {
  id: number
  title: string
  date: string
  color: string
  created_at: string
  updated_at: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Fetch error')
  return res.json()
}

// Helper: convert hex color to solid dark version (opaque, no RGBA)
function solidDark(hex: string, factor: number = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

function solidMid(hex: string, factor: number = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const EVENT_COLORS = [
  '#00ff88', '#00d4ff', '#ff6600', '#ff0080',
  '#ffcc00', '#bf00ff', '#ff4444', '#44aaff',
]

// Real-time clock component
function LiveClock({ neonColor }: { neonColor: string }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const dayName = dayNames[time.getDay()]

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4" style={{ color: neonColor, filter: `drop-shadow(0 0 4px ${neonColor}60)` }} />
        <span
          className="text-2xl font-bold tracking-wider"
          style={{
            color: neonColor,
            textShadow: `0 0 12px ${neonColor}80, 0 0 30px ${neonColor}30`,
            fontFamily: '"Outfit", monospace',
          }}
        >
          {hours}<span className="animate-pulse mx-0.5 opacity-60">:</span>{minutes}<span className="text-base opacity-50 ml-0.5">:{seconds}</span>
        </span>
      </div>
      <span className="text-sm font-medium" style={{ color: `${neonColor}90` }}>
        {dayName}
      </span>
    </div>
  )
}

interface MonthlyCalendarProps {
  neonColor?: string
  compact?: boolean
  desktopBright?: boolean
}

export function MonthlyCalendar({ neonColor = '#00ff88', compact = false, desktopBright = false }: MonthlyCalendarProps) {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventColor, setNewEventColor] = useState(neonColor)
  const [showEventModal, setShowEventModal] = useState(false)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number; cellCenterX: number; cellTop: number; cellBottom: number } | null>(null)
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const { data: events = [] } = useSWR<CalendarEvent[]>(`/api/calendar?month=${monthStr}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
  })

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  const getEventsForDate = (dateStr: string) => {
    return events.filter((e: CalendarEvent) => e.date === dateStr)
  }

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const ref = dayRefs.current[dateStr]
    if (ref) {
      const dayRect = ref.getBoundingClientRect()
      const cellCenterX = dayRect.left + dayRect.width / 2
      const cellTop = dayRect.top
      const cellBottom = dayRect.bottom
      setPopupPosition({ x: cellCenterX, y: cellTop, cellCenterX, cellTop, cellBottom })
    }
    setSelectedDate(dateStr)
    setShowEventModal(true)
    setNewEventTitle('')
    setNewEventColor(neonColor)
  }

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !selectedDate) return
    try {
      await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newEventTitle.trim(), date: selectedDate, color: newEventColor }),
      })
      mutate(`/api/calendar?month=${monthStr}`)
      setNewEventTitle('')
    } catch (err) {
      console.error('Failed to add event:', err)
    }
  }

  const handleDeleteEvent = async (id: number) => {
    try {
      await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' })
      mutate(`/api/calendar?month=${monthStr}`)
    } catch (err) {
      console.error('Failed to delete event:', err)
    }
  }

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ]

  const calendarCells = []
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day)
  }

  // Calculate month stats
  const totalEvents = events.length
  const todayEvents = getEventsForDate(todayStr).length
  const daysWithEvents = new Set(events.map((e: CalendarEvent) => e.date)).size
  const remainingDays = daysInMonth - today.getDate()

  // Find upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const result: CalendarEvent[] = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayEvs = events.filter((e: CalendarEvent) => e.date === dateStr)
      result.push(...dayEvs)
    }
    return result.slice(0, 5)
  }, [events, today])

  const dayFontSize = desktopBright ? 'text-sm' : compact ? 'text-[11px]' : 'text-[13px]'
  const eventFontSize = desktopBright ? 'text-[9px]' : compact ? 'text-[6px]' : 'text-[7px]'
  const gapSize = desktopBright ? 'gap-1' : compact ? 'gap-1.5' : 'gap-2'
  const weekdayFontSize = desktopBright ? 'text-xs' : compact ? 'text-[9px]' : 'text-[11px]'
  const headerBtnSize = desktopBright ? 'w-9 h-9' : 'w-8 h-8'
  const headerMonthSize = desktopBright ? 'text-base' : 'text-sm'
  const chevronIconSize = desktopBright ? 'w-4 h-4' : 'w-4 h-4'
  const calendarIconSize = desktopBright ? 'w-4 h-4' : 'w-3.5 h-3.5'

  return (
    <div className="w-full relative">
      {/* === DESKTOP BRIGHT: Top info bar with month stats (clock moved to left panel) === */}
      {desktopBright && (
        <motion.div
          className="mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {/* Stats cards row */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <motion.div
              className="rounded-xl p-2 text-center"
              style={{
                background: `${neonColor}10`,
                border: `1px solid ${neonColor}20`,
                boxShadow: `0 0 15px ${neonColor}08, inset 0 0 12px ${neonColor}05`,
              }}
              whileHover={{ scale: 1.03, boxShadow: `0 0 20px ${neonColor}15` }}
            >
              <Zap className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: neonColor, filter: `drop-shadow(0 0 4px ${neonColor}60)` }} />
              <div className="text-lg font-bold" style={{ color: neonColor, textShadow: `0 0 10px ${neonColor}50` }}>
                {totalEvents}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: `${neonColor}80` }}>
                Công việc
              </div>
            </motion.div>

            <motion.div
              className="rounded-xl p-2 text-center"
              style={{
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.18)',
                boxShadow: '0 0 15px rgba(0, 212, 255, 0.06), inset 0 0 12px rgba(0, 212, 255, 0.03)',
              }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(0, 212, 255, 0.12)' }}
            >
              <TrendingUp className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: '#00d4ff', filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.6))' }} />
              <div className="text-lg font-bold" style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0,212,255,0.5)' }}>
                {daysWithEvents}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: 'rgba(0, 212, 255, 0.7)' }}>
                Ngày có CV
              </div>
            </motion.div>

            <motion.div
              className="rounded-xl p-2 text-center"
              style={{
                background: 'rgba(255, 204, 0, 0.08)',
                border: '1px solid rgba(255, 204, 0, 0.18)',
                boxShadow: '0 0 15px rgba(255, 204, 0, 0.06), inset 0 0 12px rgba(255, 204, 0, 0.03)',
              }}
              whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(255, 204, 0, 0.12)' }}
            >
              <Calendar className="w-3.5 h-3.5 mx-auto mb-0.5" style={{ color: '#ffcc00', filter: 'drop-shadow(0 0 4px rgba(255,204,0,0.6))' }} />
              <div className="text-lg font-bold" style={{ color: '#ffcc00', textShadow: '0 0 10px rgba(255,204,0,0.5)' }}>
                {remainingDays > 0 ? remainingDays : 0}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: 'rgba(255, 204, 0, 0.7)' }}>
                Ngày còn lại
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Calendar Header - Neon styled */}
      <div className={`flex items-center justify-between ${desktopBright ? 'mb-2' : 'mb-3'}`}>
        <motion.button
          onClick={prevMonth}
          className={`${headerBtnSize} rounded-lg flex items-center justify-center smooth-transition`}
          style={{
            background: desktopBright ? `${neonColor}18` : `${neonColor}12`,
            border: `1px solid ${neonColor}${desktopBright ? '35' : '25'}`,
            color: neonColor,
          }}
          whileHover={{ scale: 1.1, boxShadow: `0 0 12px ${neonColor}25` }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className={chevronIconSize} />
        </motion.button>

        <motion.button
          onClick={goToToday}
          className={`${headerMonthSize} font-semibold px-3 py-1.5 rounded-lg smooth-transition flex items-center gap-1.5`}
          style={{
            color: neonColor,
            background: desktopBright ? `${neonColor}18` : `${neonColor}10`,
            border: `1px solid ${neonColor}${desktopBright ? '35' : '20'}`,
            textShadow: `0 0 ${desktopBright ? '12' : '8'}px ${neonColor}${desktopBright ? '60' : '40'}`,
          }}
          whileHover={{ scale: 1.05, boxShadow: `0 0 15px ${neonColor}20` }}
          whileTap={{ scale: 0.95 }}
        >
          <Calendar className={calendarIconSize} />
          {monthNames[currentMonth]} {currentYear}
        </motion.button>

        <motion.button
          onClick={nextMonth}
          className={`${headerBtnSize} rounded-lg flex items-center justify-center smooth-transition`}
          style={{
            background: desktopBright ? `${neonColor}18` : `${neonColor}12`,
            border: `1px solid ${neonColor}${desktopBright ? '35' : '25'}`,
            color: neonColor,
          }}
          whileHover={{ scale: 1.1, boxShadow: `0 0 12px ${neonColor}25` }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className={chevronIconSize} />
        </motion.button>
      </div>

      {/* Neon line under header */}
      <div
        className={`w-full h-[1px] ${desktopBright ? 'mb-2' : 'mb-3'}`}
        style={{
          background: `linear-gradient(90deg, transparent, ${neonColor}${desktopBright ? '70' : '50'}, ${neonColor}, ${neonColor}${desktopBright ? '70' : '50'}, transparent)`,
          boxShadow: `0 0 ${desktopBright ? '12' : '8'}px ${neonColor}${desktopBright ? '50' : '35'}`,
        }}
      />

      {/* Weekday Headers */}
      <div className={`grid grid-cols-7 ${gapSize} mb-2`}>
        {WEEKDAYS.map((day, i) => (
          <div
            key={i}
            className={`text-center ${weekdayFontSize} font-bold py-1 uppercase tracking-wider`}
            style={{
              color: i === 0 ? (desktopBright ? '#ff9999' : '#ff6b6b') : (desktopBright ? neonColor : `${neonColor}80`),
              textShadow: i === 0 ? '0 0 8px rgba(255,107,107,0.5)' : `0 0 ${desktopBright ? '10' : '8'}px ${neonColor}${desktopBright ? '50' : '30'}`,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={`grid grid-cols-7 ${gapSize}`}>
        {calendarCells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`empty-${i}`}
                className="rounded-md"
                style={desktopBright ? {
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  height: '34px',
                } : undefined}
              />
            )
          }

          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = getEventsForDate(dateStr)
          const isToday = dateStr === todayStr
          const isSunday = (firstDay + day - 1) % 7 === 0

          return (
            <motion.button
              key={dateStr}
              ref={(el) => { dayRefs.current[dateStr] = el }}
              onClick={() => handleDayClick(day)}
              className="rounded-md flex flex-col items-center justify-center relative smooth-transition cursor-pointer overflow-hidden"
              style={{
                ...(desktopBright ? { height: '34px' } : {}),
                background: isToday
                  ? `${neonColor}40`
                  : desktopBright
                  ? 'rgba(255, 255, 255, 0.13)'
                  : 'rgba(255, 255, 255, 0.08)',
                border: isToday
                  ? `2px solid ${neonColor}90`
                  : desktopBright
                  ? `1px solid ${neonColor}30`
                  : `1px solid rgba(255, 255, 255, 0.10)`,
                boxShadow: isToday
                  ? `0 0 24px ${neonColor}40, inset 0 0 16px ${neonColor}20`
                  : desktopBright
                  ? `0 0 8px ${neonColor}10`
                  : `0 0 4px ${neonColor}06`,
              }}
              whileHover={{
                background: `${neonColor}28`,
                borderColor: `${neonColor}50`,
                scale: 1.05,
                boxShadow: `0 0 16px ${neonColor}30`,
              }}
              whileTap={{ scale: 0.94 }}
            >
              {/* Today glow ring */}
              {isToday && (
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    border: `1.5px solid ${neonColor}`,
                    boxShadow: `0 0 12px ${neonColor}50, inset 0 0 10px ${neonColor}20`,
                  }}
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    boxShadow: [
                      `0 0 12px ${neonColor}35, inset 0 0 10px ${neonColor}12`,
                      `0 0 22px ${neonColor}60, inset 0 0 16px ${neonColor}25`,
                      `0 0 12px ${neonColor}35, inset 0 0 10px ${neonColor}12`,
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <span
                className={`${dayFontSize} font-semibold leading-none relative z-10`}
                style={{
                  color: isToday
                    ? neonColor
                    : isSunday
                    ? (desktopBright ? '#ff9999' : '#ff8888')
                    : (desktopBright ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.90)'),
                  textShadow: isToday
                    ? `0 0 14px ${neonColor}90`
                    : isSunday
                    ? '0 0 8px rgba(255,107,107,0.5)'
                    : desktopBright
                    ? `0 0 8px ${neonColor}30`
                    : `0 0 4px ${neonColor}15`,
                }}
              >
                {day}
              </span>

              {/* Event dots/labels */}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-[1px] mt-0.5 w-full px-[2px] items-center relative z-10">
                  {dayEvents.slice(0, compact ? 1 : 2).map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className={`w-full ${eventFontSize} leading-tight text-center truncate rounded px-0.5 font-medium`}
                      style={{
                        background: `${event.color}30`,
                        color: event.color,
                        textShadow: `0 0 4px ${event.color}50`,
                        border: `0.5px solid ${event.color}40`,
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > (compact ? 1 : 2) && (
                    <span className={`${eventFontSize} font-medium`} style={{ color: `${neonColor}90` }}>
                      +{dayEvents.length - (compact ? 1 : 2)}
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* === DESKTOP BRIGHT: Bottom section - Upcoming events + decorative === */}
      {desktopBright && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {/* Neon divider */}
          <div
            className="w-full h-[1px] my-2"
            style={{
              background: `linear-gradient(90deg, transparent, ${neonColor}50, ${neonColor}, ${neonColor}50, transparent)`,
              boxShadow: `0 0 10px ${neonColor}40`,
            }}
          />

          {/* Upcoming events section */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4" style={{ color: neonColor, filter: `drop-shadow(0 0 6px ${neonColor}80)` }} />
              <span className="text-sm font-extrabold uppercase tracking-widest" style={{ color: neonColor, textShadow: `0 0 12px ${neonColor}60` }}>
                Sắp tới
              </span>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-1.5">
                {upcomingEvents.map((event, i) => {
                  const eventDate = new Date(event.date)
                  const dayLabel = eventDate.getDate()
                  const monthLabel = `T${eventDate.getMonth() + 1}`
                  return (
                    <motion.div
                      key={event.id}
                      className="flex items-center gap-3 p-2 rounded-xl"
                      style={{
                        background: solidDark(event.color, 0.18),
                        border: `1.5px solid ${solidMid(event.color, 0.5)}`,
                        boxShadow: `0 0 12px ${solidMid(event.color, 0.2)}`,
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + i * 0.08 }}
                      whileHover={{ background: solidDark(event.color, 0.25), scale: 1.02, boxShadow: `0 0 20px ${solidMid(event.color, 0.3)}` }}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                        style={{
                          background: solidDark(event.color, 0.25),
                          border: `1.5px solid ${solidMid(event.color, 0.55)}`,
                          boxShadow: `0 0 8px ${solidMid(event.color, 0.25)}`,
                        }}
                      >
                        <span className="text-[11px] font-extrabold leading-none" style={{ color: event.color, textShadow: `0 0 6px ${event.color}50` }}>{dayLabel}</span>
                        <span className="text-[8px] font-bold leading-none mt-0.5" style={{ color: event.color, opacity: 0.85 }}>{monthLabel}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-bold truncate block" style={{ color: event.color, textShadow: `0 0 8px ${event.color}40` }}>
                          {event.title}
                        </span>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: event.color, boxShadow: `0 0 8px ${event.color}80` }}
                      />
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-[11px] font-medium" style={{ color: `${neonColor}60` }}>
                  Không có công việc sắp tới
                </p>
              </div>
            )}
          </div>

          {/* Decorative bottom glow bar */}
          <div className="relative h-1 rounded-full overflow-hidden mt-2">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${neonColor}40, #00d4ff40, ${neonColor}40, transparent)`,
              }}
            />
            <motion.div
              className="absolute h-full rounded-full"
              style={{
                width: '40%',
                background: `linear-gradient(90deg, transparent, ${neonColor}, #00d4ff, transparent)`,
                filter: `drop-shadow(0 0 6px ${neonColor}60)`,
              }}
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}

      {/* Event Popup - Neon themed, rendered via Portal for accurate positioning */}
      {showEventModal && selectedDate && popupPosition && createPortal(
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 z-[9999]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowEventModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {(() => {
              const POPUP_W = 280
              const POPUP_EST_HEIGHT = 240
              const GAP = 10
              const { cellCenterX, cellTop, cellBottom } = popupPosition
              const showAbove = cellTop > POPUP_EST_HEIGHT + GAP
              const rawLeft = cellCenterX - POPUP_W / 2
              const clampedLeft = Math.max(8, Math.min(rawLeft, window.innerWidth - POPUP_W - 8))
              const arrowLeft = cellCenterX - clampedLeft
              const popupTop = showAbove
                ? cellTop - POPUP_EST_HEIGHT - GAP
                : cellBottom + GAP

              return (
                <motion.div
                  className="fixed w-[280px] rounded-xl p-3"
                  style={{
                    background: 'rgba(20, 20, 40, 0.95)',
                    border: `1px solid ${neonColor}25`,
                    boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 15px ${neonColor}10`,
                    backdropFilter: 'blur(12px)',
                    left: clampedLeft,
                    top: popupTop,
                    zIndex: 10000,
                  }}
                  onClick={e => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.9, y: showAbove ? 10 : -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: showAbove ? 10 : -10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                  {/* Arrow indicator - points toward the cell */}
                  <div
                    className="absolute w-3 h-3 rotate-45"
                    style={{
                      left: Math.max(12, Math.min(arrowLeft - 6, POPUP_W - 18)),
                      ...(showAbove
                        ? { bottom: -5, background: 'rgba(20, 20, 40, 0.95)', borderRight: `1px solid ${neonColor}25`, borderBottom: `1px solid ${neonColor}25` }
                        : { top: -5, background: 'rgba(20, 20, 40, 0.95)', borderLeft: `1px solid ${neonColor}25`, borderTop: `1px solid ${neonColor}25` }),
                    }}
                  />

                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <h3 className="text-xs font-semibold" style={{ color: neonColor, textShadow: `0 0 8px ${neonColor}40` }}>
                        {selectedDate}
                      </h3>
                      <p className="text-[9px]" style={{ color: `${neonColor}70` }}>
                        {getEventsForDate(selectedDate).length} công việc
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setShowEventModal(false)}
                      className="p-1 rounded-lg"
                      style={{ color: `${neonColor}80` }}
                      whileHover={{ scale: 1.1, rotate: 90, background: `${neonColor}15` }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>

                  {/* Existing Events */}
                  {getEventsForDate(selectedDate).length > 0 && (
                    <div className="space-y-1 mb-2.5">
                      {getEventsForDate(selectedDate).map((event: CalendarEvent) => (
                        <motion.div
                          key={event.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg"
                          style={{
                            background: `${event.color}12`,
                            border: `1px solid ${event.color}30`,
                          }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: event.color, boxShadow: `0 0 8px ${event.color}60` }}
                          />
                          <span className="text-[11px] flex-1 truncate font-medium" style={{ color: event.color }}>
                            {event.title}
                          </span>
                          <motion.button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-0.5 rounded"
                            whileHover={{ scale: 1.2, background: 'rgba(255,68,68,0.15)' }}
                            whileTap={{ scale: 0.8 }}
                          >
                            <Trash2 className="w-2.5 h-2.5 text-red-400" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Add Event Form */}
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={e => setNewEventTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                      placeholder="Thêm công việc..."
                      className="flex-1 px-2.5 py-2 rounded-lg text-[11px] neon-input"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: 'white',
                        border: `1px solid ${neonColor}20`,
                      }}
                    />
                    <motion.button
                      onClick={handleAddEvent}
                      className="px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center"
                      style={{
                        color: 'white',
                        background: `${neonColor}25`,
                        border: `1px solid ${neonColor}40`,
                        boxShadow: `0 0 10px ${neonColor}15`,
                      }}
                      whileHover={{ scale: 1.05, boxShadow: `0 0 15px ${neonColor}30` }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus className="w-3.5 h-3.5" style={{ color: neonColor }} />
                    </motion.button>
                  </div>

                  {/* Color Picker */}
                  <div className="flex gap-1.5 flex-wrap">
                    {EVENT_COLORS.map(color => (
                      <motion.button
                        key={color}
                        onClick={() => setNewEventColor(color)}
                        className="w-5 h-5 rounded-full"
                        style={{
                          background: color,
                          boxShadow: newEventColor === color ? `0 0 10px ${color}60` : `0 0 4px ${color}20`,
                          border: newEventColor === color ? '2px solid white' : '1.5px solid rgba(255,255,255,0.15)',
                        }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.8 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )
            })()}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
