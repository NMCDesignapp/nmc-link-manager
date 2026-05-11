'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/animations'
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Calendar } from 'lucide-react'
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

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const EVENT_COLORS = [
  '#00ff88', '#00d4ff', '#ff6600', '#ff0080',
  '#ffcc00', '#bf00ff', '#ff4444', '#44aaff',
]

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
  const [popupPosition, setPopupPosition] = useState<{ x: number; bottom: number } | null>(null)
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
  const { data: events = [] } = useSWR<CalendarEvent[]>(`/api/calendar?month=${monthStr}`, fetcher)

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
      setPopupPosition({
        x: dayRect.left + dayRect.width / 2,
        bottom: window.innerHeight - dayRect.top + 8,
      })
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

  const dayFontSize = desktopBright ? 'text-lg' : compact ? 'text-[11px]' : 'text-[12px]'
  const eventFontSize = desktopBright ? 'text-[10px]' : compact ? 'text-[6px]' : 'text-[7px]'
  const gapSize = desktopBright ? 'gap-3' : compact ? 'gap-1' : 'gap-1.5'
  const weekdayFontSize = desktopBright ? 'text-sm' : compact ? 'text-[9px]' : 'text-[10px]'
  const headerBtnSize = desktopBright ? 'w-11 h-11' : 'w-7 h-7'
  const headerMonthSize = desktopBright ? 'text-lg' : 'text-xs'
  const chevronIconSize = desktopBright ? 'w-5 h-5' : 'w-3.5 h-3.5'
  const calendarIconSize = desktopBright ? 'w-5 h-5' : 'w-3 h-3'

  return (
    <div className="w-full relative">
      {/* Calendar Header - Neon styled */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={prevMonth}
          className={`${headerBtnSize} rounded-lg flex items-center justify-center smooth-transition`}
          style={{
            background: `${neonColor}12`,
            border: `1px solid ${neonColor}25`,
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
            background: `${neonColor}10`,
            border: `1px solid ${neonColor}20`,
            textShadow: `0 0 8px ${neonColor}40`,
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
            background: `${neonColor}12`,
            border: `1px solid ${neonColor}25`,
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
        className="w-full h-[1px] mb-3"
        style={{
          background: `linear-gradient(90deg, transparent, ${neonColor}50, ${neonColor}, ${neonColor}50, transparent)`,
          boxShadow: `0 0 8px ${neonColor}35`,
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
              textShadow: i === 0 ? '0 0 8px rgba(255,107,107,0.5)' : `0 0 8px ${neonColor}30`,
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
            return <div key={`empty-${i}`} className={desktopBright ? 'aspect-[1.1]' : 'aspect-[1.1]'} />
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
              className="aspect-[1.1] rounded-xl flex flex-col items-center justify-center relative smooth-transition cursor-pointer overflow-hidden"
              style={{
                background: isToday
                  ? `${neonColor}35`
                  : desktopBright
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(255, 255, 255, 0.04)',
                border: isToday
                  ? `2px solid ${neonColor}80`
                  : desktopBright
                  ? `1px solid ${neonColor}20`
                  : `1px solid rgba(255, 255, 255, 0.06)`,
                boxShadow: isToday
                  ? `0 0 20px ${neonColor}35, inset 0 0 14px ${neonColor}18`
                  : 'none',
              }}
              whileHover={{
                background: `${neonColor}22`,
                borderColor: `${neonColor}40`,
                scale: 1.05,
                boxShadow: `0 0 14px ${neonColor}25`,
              }}
              whileTap={{ scale: 0.94 }}
            >
              {/* Today glow ring */}
              {isToday && (
                <motion.div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    border: `1px solid ${neonColor}`,
                    boxShadow: `0 0 10px ${neonColor}40, inset 0 0 8px ${neonColor}15`,
                  }}
                  animate={{
                    opacity: [0.5, 1, 0.5],
                    boxShadow: [
                      `0 0 10px ${neonColor}30, inset 0 0 8px ${neonColor}10`,
                      `0 0 18px ${neonColor}50, inset 0 0 12px ${neonColor}20`,
                      `0 0 10px ${neonColor}30, inset 0 0 8px ${neonColor}10`,
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
                    ? (desktopBright ? '#ff9999' : '#ff6b6b')
                    : (desktopBright ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)'),
                  textShadow: isToday
                    ? `0 0 12px ${neonColor}90`
                    : isSunday
                    ? '0 0 8px rgba(255,107,107,0.5)'
                    : desktopBright
                    ? `0 0 6px ${neonColor}25`
                    : 'none',
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
                        background: `${event.color}25`,
                        color: event.color,
                        textShadow: `0 0 4px ${event.color}50`,
                        border: `0.5px solid ${event.color}30`,
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

      {/* Event Popup - Neon themed */}
      <AnimatePresence>
        {showEventModal && selectedDate && popupPosition && (
          <motion.div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowEventModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute w-[280px] rounded-xl p-3"
              style={{
                background: 'rgba(20, 20, 40, 0.95)',
                border: `1px solid ${neonColor}25`,
                boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 15px ${neonColor}10`,
                backdropFilter: 'blur(12px)',
                left: Math.max(8, Math.min(popupPosition.x - 140, window.innerWidth - 296)),
                bottom: popupPosition.bottom,
              }}
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Arrow indicator pointing down */}
              <div
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                style={{
                  background: 'rgba(20, 20, 40, 0.95)',
                  borderRight: `1px solid ${neonColor}25`,
                  borderBottom: `1px solid ${neonColor}25`,
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
