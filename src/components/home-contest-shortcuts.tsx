'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Archive,
  CalendarDays,
  ChevronRight,
  FolderOpen,
  Loader2,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react'
import { useAppData } from '@/lib/app-data-context'
import { groupChotContestsByMonth } from '@/lib/contest-archive'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ContestSummary = {
  id: string
  title: string
  startDate: string | Date
  endDate?: string | Date
}

type ShortcutFolder = 'month' | 'year'

const formatContestDate = (value?: string | Date | null) => {
  if (!value) return '--/--/----'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--/--/----'
  return date.toLocaleDateString('vi-VN')
}

const contestTime = (value?: string | Date | null) => {
  if (!value) return Number.NEGATIVE_INFINITY
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY
}

function ContestRow({ contest, onOpen }: { contest: ContestSummary; onOpen: (contest: ContestSummary) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(contest)}
      className="group flex w-full items-center gap-3 rounded-xl border border-[#426174] bg-[#173545] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.05)] transition hover:border-[#66c9b4] hover:bg-[#1d4253] active:translate-y-px"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#567b8d] bg-[#244b5d] text-[#75ead0]">
        <Trophy className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-black text-white sm:text-sm">{contest.title}</span>
        <span className="mt-0.5 block text-[10px] font-semibold text-[#a8c1cd] sm:text-[11px]">
          {formatContestDate(contest.startDate)} – {formatContestDate(contest.endDate)}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#7fa4b5] transition-transform group-hover:translate-x-0.5 group-hover:text-[#75ead0]" />
    </button>
  )
}

function ShortcutButton({
  label,
  count,
  icon,
  tone,
  onClick,
}: {
  label: string
  count?: number
  icon: ReactNode
  tone: 'month' | 'year'
  onClick: () => void
}) {
  const palette = tone === 'month'
    ? { background: '#704c20', border: '#c18b3a', folder: '#ffd36c', shadow: '#39250e' }
    : { background: '#244d65', border: '#4a87a8', folder: '#8ed8f2', shadow: '#112b3a' }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex min-h-[64px] min-w-0 items-center gap-2.5 overflow-hidden rounded-[15px] border px-3 py-2 text-left text-white transition-transform active:translate-y-[2px] sm:min-h-[70px] sm:px-4"
      style={{
        background: `linear-gradient(145deg, ${palette.background}, #142d3a)`,
        borderColor: palette.border,
        boxShadow: `0 6px 0 ${palette.shadow}, 0 11px 20px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.16)`,
      }}
      aria-label={`Mở ${label}`}
    >
      <span className="nmc-home-tilebolt b1" aria-hidden="true" />
      <span className="nmc-home-tilebolt b2" aria-hidden="true" />
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-black/15" style={{ color: palette.folder }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-black uppercase leading-[1.2] tracking-[.02em] sm:text-[13px]">{label}</span>
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.12em] text-white/60">
          {typeof count === 'number' ? `${count} chương trình` : 'Mở danh sách'}
        </span>
      </span>
      <FolderOpen className="h-4 w-4 shrink-0 text-white/55 transition-transform group-hover:scale-110 group-hover:text-white" />
    </button>
  )
}

export function HomeContestShortcuts() {
  const { data, isLoading: appDataLoading } = useAppData()
  const [openFolder, setOpenFolder] = useState<ShortcutFolder | null>(null)
  const [selectedContest, setSelectedContest] = useState<ContestSummary | null>(null)
  const [archiveContests, setArchiveContests] = useState<ContestSummary[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [archiveError, setArchiveError] = useState('')
  const [archiveLoaded, setArchiveLoaded] = useState(false)
  const [resultLoading, setResultLoading] = useState(false)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const monthlyContests = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth, 1).getTime()
    const nextMonthStart = new Date(currentYear, currentMonth + 1, 1).getTime()

    return (Array.isArray(data.contests) ? data.contests : [])
      .filter((contest): contest is ContestSummary => Boolean(contest?.id && contest?.title && contest?.startDate))
      .filter((contest) => {
        const start = contestTime(contest.startDate)
        const end = contestTime(contest.endDate ?? contest.startDate)
        return start < nextMonthStart && end >= monthStart
      })
      .sort((a, b) => contestTime(b.startDate) - contestTime(a.startDate))
  }, [currentMonth, currentYear, data.contests])

  const archiveGroups = useMemo(
    () => groupChotContestsByMonth(archiveContests, currentYear),
    [archiveContests, currentYear],
  )

  const loadArchive = async (force = false) => {
    if ((archiveLoaded && !force) || archiveLoading) return
    setArchiveLoading(true)
    setArchiveError('')
    try {
      const response = await fetch(`/api/contests?summary=1&scope=archive&year=${currentYear}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Không thể tải danh sách chương trình đã chốt')
      const payload = await response.json()
      setArchiveContests(Array.isArray(payload) ? payload : [])
      setArchiveLoaded(true)
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'Không thể tải danh sách chương trình đã chốt')
    } finally {
      setArchiveLoading(false)
    }
  }

  useEffect(() => {
    if (openFolder === 'year') void loadArchive()
    // Archive is intentionally fetched only when its folder is opened.
  }, [openFolder, currentYear])

  const openContest = (contest: ContestSummary) => {
    setOpenFolder(null)
    setResultLoading(true)
    setSelectedContest(contest)
  }

  const folderTitle = openFolder === 'month'
    ? `CT thi đua trong tháng ${currentMonth + 1}`
    : `CT thi đua năm ${currentYear}`

  return (
    <>
      <section className="mx-auto mt-4 grid max-w-3xl grid-cols-2 gap-2 sm:gap-3" aria-label="Lối tắt chương trình thi đua đã lưu">
        <ShortcutButton
          label="CT thi đua trong tháng"
          count={appDataLoading ? undefined : monthlyContests.length}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="month"
          onClick={() => setOpenFolder('month')}
        />
        <ShortcutButton
          label={`CT thi đua năm ${currentYear}`}
          count={archiveLoaded ? archiveContests.length : undefined}
          icon={<Archive className="h-5 w-5" />}
          tone="year"
          onClick={() => setOpenFolder('year')}
        />
      </section>

      <Dialog open={openFolder !== null} onOpenChange={(open) => { if (!open) setOpenFolder(null) }}>
        <DialogContent className="max-h-[86dvh] gap-0 overflow-hidden border-[#496d80] bg-[#0f2836] p-0 text-white shadow-[0_26px_80px_rgba(0,0,0,.55)] sm:max-w-2xl">
          <DialogHeader className="border-b border-[#345365] bg-[#173746] px-4 py-3 pr-12 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-black text-white sm:text-lg">
              {openFolder === 'month' ? <CalendarDays className="h-5 w-5 text-[#ffd36c]" /> : <Archive className="h-5 w-5 text-[#8ed8f2]" />}
              {folderTitle}
            </DialogTitle>
            <DialogDescription className="text-[11px] font-semibold text-[#a9c3cf]">
              Bấm vào tên chương trình để mở kết quả chi tiết.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(86dvh-82px)] overflow-y-auto p-3 sm:p-4">
            {openFolder === 'month' && (
              appDataLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#b7ced8]"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải chương trình...</div>
              ) : monthlyContests.length ? (
                <div className="grid gap-2">
                  {monthlyContests.map((contest) => <ContestRow key={contest.id} contest={contest} onOpen={openContest} />)}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#46687a] bg-[#142f3d] px-4 py-10 text-center text-sm font-semibold text-[#9eb8c5]">
                  Chưa có chương trình thi đua trong tháng {currentMonth + 1}.
                </div>
              )
            )}

            {openFolder === 'year' && (
              archiveLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#b7ced8]"><Loader2 className="h-4 w-4 animate-spin" /> Đang tải chương trình đã chốt...</div>
              ) : archiveError ? (
                <div className="rounded-xl border border-[#7f4c50] bg-[#402a30] px-4 py-7 text-center">
                  <p className="text-sm font-semibold text-[#ffc2c2]">{archiveError}</p>
                  <button type="button" onClick={() => void loadArchive(true)} className="mx-auto mt-3 flex items-center gap-1.5 rounded-lg border border-[#9a6365] bg-[#5b363b] px-3 py-1.5 text-xs font-bold text-white">
                    <RefreshCw className="h-3.5 w-3.5" /> Tải lại
                  </button>
                </div>
              ) : archiveGroups.length ? (
                <div className="space-y-4">
                  {archiveGroups.map((group) => (
                    <section key={group.key}>
                      <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#8ed8f2]">
                        <span className="h-px flex-1 bg-[#31566a]" />
                        {group.label}
                        <span className="h-px flex-1 bg-[#31566a]" />
                      </div>
                      <div className="grid gap-2">
                        {group.contests.map((contest) => <ContestRow key={contest.id} contest={contest} onOpen={openContest} />)}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#46687a] bg-[#142f3d] px-4 py-10 text-center text-sm font-semibold text-[#9eb8c5]">
                  Chưa có chương trình CHỐT trong năm {currentYear}.
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedContest !== null} onOpenChange={(open) => { if (!open) setSelectedContest(null) }}>
        <DialogContent showCloseButton={false} className="h-[96dvh] w-[98vw] max-w-[1400px] gap-0 overflow-hidden border-[#527589] bg-[#0a1d28] p-0 shadow-[0_30px_100px_rgba(0,0,0,.7)] sm:h-[94dvh] sm:w-[96vw] sm:max-w-[1400px]">
          <DialogHeader className="flex h-11 shrink-0 flex-row items-center justify-between gap-2 border-b border-[#345365] bg-[#153342] px-3 py-0 text-left sm:px-4">
            <DialogTitle className="min-w-0 truncate text-[12px] font-black text-white sm:text-sm">
              {selectedContest?.title || 'Kết quả chi tiết'}
            </DialogTitle>
            <DialogDescription className="sr-only">Kết quả chi tiết chương trình thi đua</DialogDescription>
            <button
              type="button"
              onClick={() => setSelectedContest(null)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#526f80] bg-[#203f50] text-white transition hover:bg-[#2b5266]"
              aria-label="Đóng kết quả chi tiết"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <div className="relative min-h-0 flex-1 bg-white">
            {resultLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#edf2f4] text-sm font-bold text-[#315164]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-600" /> Đang tính kết quả...
              </div>
            )}
            {selectedContest && (
              <iframe
                key={selectedContest.id}
                src={`/thi-dua-chau?embed=1&contest=${encodeURIComponent(selectedContest.id)}&autocalc=1&actions=1`}
                title={`Kết quả ${selectedContest.title}`}
                className="h-full w-full border-0"
                onLoad={() => setResultLoading(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
