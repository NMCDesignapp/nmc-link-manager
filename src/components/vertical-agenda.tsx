'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import useSWR, { mutate } from 'swr'

interface CalendarEvent {
  id: number
  title: string
  date: string
  color?: string
  owner?: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Không thể tải lịch')
  return response.json()
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const EVENT_COLORS = ['#35b779', '#32a5d2', '#d99a2b', '#c96378', '#8667d5', '#d45e4f']

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function VerticalAgenda() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [newColor, setNewColor] = useState(EVENT_COLORS[0])
  const listRef = useRef<HTMLDivElement | null>(null)
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const { data: rawEvents = [], error, isLoading } = useSWR<CalendarEvent[]>(`/api/calendar?month=${monthKey}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 15000,
  })

  const events = Array.isArray(rawEvents) ? rawEvents : []
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const showingCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const bucket = map.get(event.date) || []
      bucket.push(event)
      map.set(event.date, bucket)
    }
    return map
  }, [events])

  useEffect(() => {
    if (!showingCurrentMonth) return
    const timer = window.setTimeout(() => {
      dayRefs.current[todayKey]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [showingCurrentMonth, todayKey, events.length])

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((value) => value - 1)
    } else {
      setMonth((value) => value - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((value) => value + 1)
    } else {
      setMonth((value) => value + 1)
    }
  }

  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
    window.setTimeout(() => dayRefs.current[todayKey]?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120)
  }

  const addEvent = async () => {
    if (!editingDate || !newTitle.trim()) return
    const response = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), date: editingDate, color: newColor, owner: newOwner.trim() }),
    })
    if (!response.ok) return
    setNewTitle('')
    setNewOwner('')
    mutate(`/api/calendar?month=${monthKey}`)
  }

  const removeEvent = async (id: number) => {
    const response = await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' })
    if (response.ok) mutate(`/api/calendar?month=${monthKey}`)
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#35546a] bg-[#102432] shadow-[0_18px_45px_rgba(0,0,0,.34)]">
      <div className="flex items-center justify-between gap-2 border-b border-[#2e4b5e] bg-[#173344] px-3 py-3 sm:px-4">
        <button
          onClick={prevMonth}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#46677b] bg-[#213f51] text-[#d8e9f1] shadow-[0_5px_12px_rgba(0,0,0,.22)]"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={goToday} className="min-w-0 text-center">
          <div className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#75aeca]">Lịch công việc</div>
          <div className="mt-0.5 truncate text-sm font-black text-white sm:text-base">{MONTHS[month]} {year}</div>
        </button>
        <button
          onClick={nextMonth}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[#46677b] bg-[#213f51] text-[#d8e9f1] shadow-[0_5px_12px_rgba(0,0,0,.22)]"
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
        {isLoading && <div className="py-8 text-center text-sm text-[#91aebe]">Đang tải lịch…</div>}
        {error && <div className="py-8 text-center text-sm text-[#e4a1a1]">Không thể tải lịch.</div>}
        {!isLoading && !error && Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
          const dateKey = toDateKey(year, month, day)
          const date = new Date(year, month, day)
          const dayEvents = eventsByDate.get(dateKey) || []
          const isToday = dateKey === todayKey
          const isSunday = date.getDay() === 0

          return (
            <div
              key={dateKey}
              ref={(node) => { dayRefs.current[dateKey] = node }}
              data-day-tone={day % 2 === 0 ? 'silver' : 'gold'}
              data-today={isToday ? 'true' : undefined}
              className="mb-2 grid grid-cols-[54px_minmax(0,1fr)] overflow-hidden rounded-2xl border shadow-[0_7px_18px_rgba(0,0,0,.2)] sm:grid-cols-[68px_minmax(0,1fr)]"
              style={{
                background: isToday ? '#244a58' : '#1a3545',
                borderColor: isToday ? '#5fb8c2' : '#315365',
                boxShadow: isToday ? '0 9px 24px rgba(30,132,145,.22), inset 0 0 0 1px rgba(126,224,230,.08)' : undefined,
              }}
            >
              <div className="flex flex-col items-center justify-center border-r border-[#35586a] px-1 py-3 text-center">
                <div className={`text-[9px] font-black uppercase tracking-wide ${isSunday ? 'text-[#f0a1a1]' : 'text-[#8fb4c7]'}`}>
                  {WEEKDAYS[date.getDay()].replace('Thứ ', 'T')}
                </div>
                <div className={`mt-0.5 text-xl font-black ${isToday ? 'text-[#8ce7dd]' : isSunday ? 'text-[#ffb0aa]' : 'text-white'}`}>{day}</div>
                {isToday && <div className="mt-1 rounded-full bg-[#55bdb2] px-1.5 py-0.5 text-[8px] font-black uppercase text-[#08211e]">Hôm nay</div>}
              </div>

              <div className="min-w-0 p-2.5 sm:p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-[11px] font-bold text-[#a9c3d0]">
                    {WEEKDAYS[date.getDay()]}, {String(day).padStart(2, '0')}/{String(month + 1).padStart(2, '0')}
                  </div>
                  <button
                    onClick={() => { setEditingDate(dateKey); setNewTitle(''); setNewOwner(''); }}
                    className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-[#52758a] bg-[#24485c] text-[#bfe6f5]"
                    aria-label={`Thêm ghi chú ngày ${day}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {dayEvents.length === 0 ? (
                  <div className="text-[11px] italic text-[#6f91a2]">Chưa có ghi chú</div>
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="flex items-start gap-2 rounded-xl border border-[#3b5f70] bg-[#234456] px-2.5 py-2">
                        <span className="mt-1.5 h-2 w-2 flex-none rounded-full" style={{ background: event.color || '#35b779', boxShadow: `0 0 8px ${event.color || '#35b779'}` }} />
                        <div className="min-w-0 flex-1">
                          <div className="whitespace-pre-wrap break-words text-[12px] font-bold leading-5 text-[#f1f7fa]">{event.title}</div>
                          {event.owner && <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#89aabd]">{event.owner}</div>}
                        </div>
                        <button onClick={() => removeEvent(event.id)} className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md text-[#89a8b8] hover:bg-[#4a2f35] hover:text-[#ffb1b1]" aria-label="Xóa ghi chú">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editingDate && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/70 p-4" onClick={() => setEditingDate(null)}>
          <div className="w-full max-w-sm rounded-[22px] border border-[#4e7184] bg-[#162f3f] p-4 shadow-[0_25px_70px_rgba(0,0,0,.55)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#78aac3]">Thêm ghi chú</div>
                <div className="mt-0.5 text-sm font-black text-white">{editingDate}</div>
              </div>
              <button onClick={() => setEditingDate(null)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#24485a] text-[#bcd2dc]" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-none rounded-xl border border-[#44687a] bg-[#0e2230] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#68899a] focus:border-[#68b8c8]"
              placeholder="Nội dung công việc / ghi chú…"
            />
            <input
              value={newOwner}
              onChange={(event) => setNewOwner(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#44687a] bg-[#0e2230] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#68899a] focus:border-[#68b8c8]"
              placeholder="Phụ trách (không bắt buộc)"
            />
            <div className="mt-3 flex items-center gap-2">
              {EVENT_COLORS.map((color) => (
                <button key={color} onClick={() => setNewColor(color)} className="h-7 w-7 rounded-full border-2" style={{ background: color, borderColor: newColor === color ? '#ffffff' : 'transparent' }} aria-label={`Chọn màu ${color}`} />
              ))}
            </div>
            <button
              onClick={addEvent}
              disabled={!newTitle.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f9b91] px-4 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(47,155,145,.28)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CalendarDays className="h-4 w-4" /> Lưu ghi chú
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
