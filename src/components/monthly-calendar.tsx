'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/animations'
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from 'lucide-react'
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

export function MonthlyCalendar() {
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventColor, setNewEventColor] = useState('#00ff88')
  const [showEventModal, setShowEventModal] = useState(false)

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
    setSelectedDate(dateStr)
    setShowEventModal(true)
    setNewEventTitle('')
    setNewEventColor('#00ff88')
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
    'Thang 1', 'Thang 2', 'Thang 3', 'Thang 4',
    'Thang 5', 'Thang 6', 'Thang 7', 'Thang 8',
    'Thang 9', 'Thang 10', 'Thang 11', 'Thang 12',
  ]

  // Build calendar grid
  const calendarCells = []
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null)
  }
  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day)
  }

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <motion.button
          onClick={prevMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center smooth-transition"
          style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-primary" />
        </motion.button>

        <motion.button
          onClick={goToToday}
          className="text-sm font-semibold neon-text px-3 py-1 rounded-lg smooth-transition"
          style={{ background: 'rgba(0, 255, 136, 0.05)' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {monthNames[currentMonth]} {currentYear}
        </motion.button>

        <motion.button
          onClick={nextMonth}
          className="w-7 h-7 rounded-lg flex items-center justify-center smooth-transition"
          style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)' }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-3.5 h-3.5 text-primary" />
        </motion.button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium py-1"
            style={{ color: i === 0 ? '#ff6b6b' : 'rgba(255,255,255,0.4)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />
          }

          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = getEventsForDate(dateStr)
          const isToday = dateStr === todayStr
          const isSunday = (firstDay + day - 1) % 7 === 0

          return (
            <motion.button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              className="aspect-square rounded-md flex flex-col items-center justify-center relative smooth-transition cursor-pointer"
              style={{
                background: isToday
                  ? 'rgba(0, 255, 136, 0.15)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isToday
                  ? '1px solid rgba(0, 255, 136, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
              }}
              whileHover={{
                background: 'rgba(0, 255, 136, 0.1)',
                borderColor: 'rgba(0, 255, 136, 0.3)',
                scale: 1.05,
              }}
              whileTap={{ scale: 0.95 }}
            >
              <span
                className="text-[11px] font-medium leading-none"
                style={{
                  color: isToday
                    ? '#00ff88'
                    : isSunday
                    ? '#ff6b6b'
                    : 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {day}
              </span>

              {/* Event dots/labels */}
              {dayEvents.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-0.5 w-full px-0.5 items-center">
                  {dayEvents.slice(0, 2).map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className="w-full text-[6px] leading-tight text-center truncate rounded-sm px-0.5"
                      style={{
                        background: `${event.color}20`,
                        color: event.color,
                        textShadow: `0 0 4px ${event.color}40`,
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[6px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && selectedDate && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowEventModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-t-2xl p-4 pb-6"
              style={{
                background: '#141420',
                border: '1px solid rgba(0, 255, 136, 0.15)',
                borderBottom: 'none',
              }}
              onClick={e => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">{selectedDate}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {getEventsForDate(selectedDate).length} cong viec
                  </p>
                </div>
                <motion.button
                  onClick={() => setShowEventModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Existing Events */}
              {getEventsForDate(selectedDate).length > 0 && (
                <div className="space-y-1.5 mb-4">
                  {getEventsForDate(selectedDate).map((event: CalendarEvent) => (
                    <motion.div
                      key={event.id}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{
                        background: `${event.color}10`,
                        border: `1px solid ${event.color}30`,
                      }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: event.color, boxShadow: `0 0 6px ${event.color}` }}
                      />
                      <span className="text-xs flex-1 truncate" style={{ color: event.color }}>
                        {event.title}
                      </span>
                      <motion.button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="p-1 rounded hover:bg-white/10"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.8 }}
                      >
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Add Event Form */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                  placeholder="Them cong viec..."
                  className="flex-1 px-3 py-2 rounded-lg text-xs neon-input"
                  style={{ background: '#1a1a2e' }}
                />
                <motion.button
                  onClick={handleAddEvent}
                  className="px-3 py-2 rounded-lg text-xs font-medium neon-btn neon-press text-primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-3.5 h-3.5" />
                </motion.button>
              </div>

              {/* Color Picker */}
              <div className="flex gap-1.5">
                {EVENT_COLORS.map(color => (
                  <motion.button
                    key={color}
                    onClick={() => setNewEventColor(color)}
                    className="w-5 h-5 rounded-full"
                    style={{
                      background: color,
                      boxShadow: newEventColor === color ? `0 0 8px ${color}` : 'none',
                      border: newEventColor === color ? '2px solid white' : '2px solid transparent',
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
