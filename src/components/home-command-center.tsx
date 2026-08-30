'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  BarChart3,
  Bell,
  Database,
  Link2,
  Lock,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
  Trophy,
  Unlock,
  Wrench,
  X,
} from 'lucide-react'
import type { Category, Link } from '@/lib/types'
import { useSettings } from '@/hooks/use-settings'
import { useAppData } from '@/lib/app-data-context'
import { IframeModal } from '@/components/iframe-modal'
import { AddLinkModal } from '@/components/add-link-modal'
import { SettingsPanel } from '@/components/settings-panel'
import { StatsPanel } from '@/components/stats-panel'
import { VerticalAgenda } from '@/components/vertical-agenda'

const MAINTENANCE_KEY = 'nmc-maintenance-mode'
const ADMIN_PWD = '123456'

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Không thể tải dữ liệu')
  return response.json()
}

function NmcSolidLogo({ bio }: { bio: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const time = now?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) || '--:--'
  const date = now?.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) || 'Đang đồng bộ thời gian'

  return (
    <div className="nmc-home-brandbar" aria-label="Nhận diện NMC và thời gian hiện tại">
      <span className="nmc-home-brandbolt b1" aria-hidden="true" />
      <span className="nmc-home-brandbolt b2" aria-hidden="true" />
      <span className="nmc-home-brandbolt b3" aria-hidden="true" />
      <span className="nmc-home-brandbolt b4" aria-hidden="true" />
      <div className="nmc-home-brandblock">
        <div className="nmc-home-logo" aria-label="Logo NMC">
          <svg className="nmc-home-logo-mark" viewBox="0 0 220 76" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="nmc-logo-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset=".48" stopColor="#dceaf1" />
              <stop offset="1" stopColor="#91a8b5" />
            </linearGradient>
            <linearGradient id="nmc-logo-mint" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#75f1d4" />
              <stop offset="1" stopColor="#26b9ae" />
            </linearGradient>
            <filter id="nmc-logo-shadow" x="-30%" y="-30%" width="160%" height="170%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#000000" floodOpacity=".52" />
            </filter>
          </defs>
          <g fill="none" stroke="url(#nmc-logo-metal)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" filter="url(#nmc-logo-shadow)">
            <path d="M24 56V20l35 36V20" />
            <path d="M82 56V20l22 26 22-26v36" />
            <path d="M194 28c-6-7-14-10-24-10-19 0-31 12-31 20s12 20 31 20c10 0 18-3 24-10" />
          </g>
          <circle cx="70.5" cy="38" r="4.5" fill="url(#nmc-logo-mint)" />
          <circle cx="135" cy="38" r="4.5" fill="url(#nmc-logo-mint)" />
          </svg>
          <p className="nmc-home-designer">Design by Châu</p>
        </div>
        {bio && <p className="nmc-home-bio">{bio}</p>}
      </div>
      <div className="nmc-home-clock" aria-live="off">
        <time dateTime={now?.toISOString()}>{time}</time>
        <span>{date}</span>
      </div>
    </div>
  )
}

type FunctionButtonProps = {
  label: string
  shortLabel?: string
  icon: React.ReactNode
  background: string
  border: string
  shadow: string
  onClick: () => void
}

function FunctionButton({ label, shortLabel, icon, background, border, shadow, onClick }: FunctionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="nmc-home-function group relative flex min-h-[66px] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[16px] border px-2 py-2 text-white transition-transform active:translate-y-[2px] sm:min-h-[74px]"
      style={{ background, borderColor: border, boxShadow: `0 8px 0 ${shadow}, 0 13px 22px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.18)` }}
    >
      <span className="nmc-home-tilebolt b1" aria-hidden="true" />
      <span className="nmc-home-tilebolt b2" aria-hidden="true" />
      <span className="nmc-home-tilebolt b3" aria-hidden="true" />
      <span className="nmc-home-tilebolt b4" aria-hidden="true" />
      <span className="drop-shadow-[0_2px_1px_rgba(0,0,0,.35)]">{icon}</span>
      <span className="max-w-full truncate text-[10px] font-black uppercase tracking-wide sm:text-xs">
        <span className="sm:hidden">{shortLabel || label}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
    </button>
  )
}

function LinkTile({ link, onOpen }: { link: Link; onOpen: (link: Link) => void }) {
  const accent = link.color || '#4e9abb'
  return (
    <button
      onClick={() => onOpen(link)}
      className="nmc-home-linktile relative min-h-[88px] overflow-hidden rounded-[18px] border border-[#426174] bg-[#1b394a] p-3 text-left shadow-[0_10px_24px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.06)] transition-transform active:scale-[.985]"
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-start gap-2.5">
        <div className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-[#507184] bg-[#274b5e] text-[#d9edf4]">
          <Link2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[13px] font-black leading-5 text-white">{link.title}</div>
          <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-[.12em] text-[#86a9bb]">{link.category || 'Liên kết'}</div>
        </div>
      </div>
      {link.description && <div className="mt-2 line-clamp-2 text-[10px] leading-4 text-[#bfd0d8]">{link.description}</div>}
    </button>
  )
}

export default function HomeCommandCenter() {
  const router = useRouter()
  const { settings } = useSettings()
  const { reload: reloadAppData, isReloading, lastSync } = useAppData()
  const { data: linksData, isLoading: linksLoading, error: linksError } = useSWR<Link[]>('/api/links', fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })
  const { data: categoriesData } = useSWR<Category[]>('/api/categories', fetcher, { fallbackData: [], revalidateOnFocus: false, dedupingInterval: 30000 })
  const { data: stats } = useSWR('/api/stats', fetcher, { revalidateOnFocus: false, dedupingInterval: 30000 })

  const links = useMemo(() => Array.isArray(linksData) ? linksData : [], [linksData])
  const categories = useMemo(() => Array.isArray(categoriesData) ? categoriesData : [], [categoriesData])
  const settingsMap = settings as unknown as Record<string, string>
  const maintenanceEnabled = settingsMap[MAINTENANCE_KEY] === '1'
  const targetRegistrationOpen = settingsMap['kpi-target-registration-open'] !== '0'
  const noticeEnabled = settingsMap['kpi-notice-enabled'] !== '0'

  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [adminAuthed, setAdminAuthed] = useState(false)
  const [adminPwdOpen, setAdminPwdOpen] = useState(false)
  const [adminPwdInput, setAdminPwdInput] = useState('')
  const [adminPwdError, setAdminPwdError] = useState(false)
  const [pendingMaintenanceToggle, setPendingMaintenanceToggle] = useState(false)
  const [maintenanceSaving, setMaintenanceSaving] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [noticeContent, setNoticeContent] = useState(settingsMap['kpi-notice-content'] || '')
  const [noticeSaving, setNoticeSaving] = useState(false)

  useEffect(() => {
    try { setAdminAuthed(sessionStorage.getItem('kpi_admin_authed') === '1') } catch {}
  }, [])

  useEffect(() => {
    setNoticeContent(settingsMap['kpi-notice-content'] || '')
  }, [settingsMap['kpi-notice-content']])

  const handleReloadAll = useCallback(async () => {
    await reloadAppData()
    mutate('/api/links')
    mutate('/api/categories')
    mutate('/api/stats')
    mutate('/api/settings')
  }, [reloadAppData])

  const broadcastMaintenance = (value: boolean) => {
    try {
      const channel = new BroadcastChannel('nmc-maintenance')
      channel.postMessage({ key: MAINTENANCE_KEY, value: value ? '1' : '0' })
      channel.close()
    } catch {}
    try { localStorage.setItem('nmc-maintenance-changed', String(Date.now())) } catch {}
  }

  const saveMaintenance = useCallback(async (next: boolean) => {
    setMaintenanceSaving(true)
    mutate('/api/settings', (current: Record<string, string> | undefined) => ({ ...(current || {}), [MAINTENANCE_KEY]: next ? '1' : '0' }), false)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [MAINTENANCE_KEY]: next ? '1' : '0' }),
      })
      if (!response.ok) throw new Error('save failed')
      broadcastMaintenance(next)
    } catch {
      mutate('/api/settings')
      alert('Không thể cập nhật chế độ bảo trì. Vui lòng thử lại.')
    } finally {
      setMaintenanceSaving(false)
    }
  }, [])

  const requestMaintenanceToggle = () => {
    if (!adminAuthed) {
      setPendingMaintenanceToggle(true)
      setAdminPwdInput('')
      setAdminPwdError(false)
      setAdminPwdOpen(true)
      return
    }
    saveMaintenance(!maintenanceEnabled)
  }

  const submitAdminPwd = async () => {
    if (adminPwdInput !== ADMIN_PWD) {
      setAdminPwdError(true)
      return
    }
    setAdminAuthed(true)
    try { sessionStorage.setItem('kpi_admin_authed', '1') } catch {}
    setAdminPwdOpen(false)
    setAdminPwdInput('')
    setAdminPwdError(false)
    if (pendingMaintenanceToggle) {
      setPendingMaintenanceToggle(false)
      await saveMaintenance(!maintenanceEnabled)
    }
  }

  const logoutAdmin = () => {
    setAdminAuthed(false)
    try { sessionStorage.removeItem('kpi_admin_authed') } catch {}
  }

  const toggleTargetRegistration = async () => {
    const next = !targetRegistrationOpen
    mutate('/api/settings', (current: Record<string, string> | undefined) => ({ ...(current || {}), 'kpi-target-registration-open': next ? '1' : '0' }), false)
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'kpi-target-registration-open': next ? '1' : '0' }),
    })
    if (!response.ok) mutate('/api/settings')
    try {
      const channel = new BroadcastChannel('nmc-kpi-settings')
      channel.postMessage({ key: 'kpi-target-registration-open', value: next ? '1' : '0' })
      channel.close()
    } catch {}
  }

  const saveNotice = async () => {
    setNoticeSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'kpi-notice-content': noticeContent, 'kpi-notice-enabled': noticeEnabled ? '1' : '0' }),
      })
      mutate('/api/settings')
      setNoticeOpen(false)
    } finally {
      setNoticeSaving(false)
    }
  }

  const toggleNoticeEnabled = async () => {
    const next = !noticeEnabled
    mutate('/api/settings', (current: Record<string, string> | undefined) => ({ ...(current || {}), 'kpi-notice-enabled': next ? '1' : '0' }), false)
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'kpi-notice-enabled': next ? '1' : '0' }),
    })
    mutate('/api/settings')
  }

  const handleAddOrUpdateLink = async (data: Partial<Link>) => {
    const response = await fetch(data.id ? `/api/links/${data.id}` : '/api/links', {
      method: data.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Không thể lưu liên kết')
    mutate('/api/links')
    mutate('/api/stats')
    setEditingLink(null)
  }

  const maintenanceSwitch = (
    <button
      onClick={requestMaintenanceToggle}
      disabled={maintenanceSaving}
      className="nmc-maintenance-switch flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 shadow-[0_6px_16px_rgba(0,0,0,.22)] disabled:opacity-60"
      style={{
        background: maintenanceEnabled ? '#7c3d2a' : '#1c3c4d',
        borderColor: maintenanceEnabled ? '#b66c4a' : '#44677a',
        color: maintenanceEnabled ? '#ffe7d8' : '#c6dbe5',
      }}
      aria-label="Bật hoặc tắt chế độ bảo trì"
    >
      <Wrench className="h-3.5 w-3.5" />
      <span className="text-[10px] font-black uppercase tracking-[.12em]">Bảo trì</span>
      <span className={`relative h-5 w-9 rounded-full ${maintenanceEnabled ? 'bg-[#d97a45]' : 'bg-[#0c202b]'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${maintenanceEnabled ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      {!adminAuthed && <Lock className="h-3 w-3 opacity-70" />}
    </button>
  )

  return (
    <div className="nmc-home-shell relative z-[1] min-h-screen bg-transparent px-3 pb-5 pt-[max(6px,env(safe-area-inset-top))] sm:px-5 sm:pt-[max(10px,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="flex flex-col items-center">
          <NmcSolidLogo bio={settings.profile_bio} />

          <div className="nmc-home-control-rail mt-2">
            <span className="nmc-home-control-cut" aria-hidden="true" />
            <div className="nmc-home-control-cluster flex flex-nowrap items-center justify-center gap-1.5">
              {maintenanceSwitch}
              {!adminAuthed ? (
                <button onClick={() => { setPendingMaintenanceToggle(false); setAdminPwdOpen(true); setAdminPwdInput(''); setAdminPwdError(false) }} className="grid h-8 w-8 place-items-center rounded-full border border-[#44677a] bg-[#1c3a4b] text-[#b9d1dc]" aria-label="Đăng nhập quản trị" title="Đăng nhập quản trị"><Lock className="h-3.5 w-3.5" /></button>
              ) : (
                <>
                  <button onClick={() => setIsSettingsOpen(true)} className="grid h-8 w-8 place-items-center rounded-full border border-[#4b6e82] bg-[#214355] text-[#d2e6ee]" aria-label="Cài đặt" title="Cài đặt"><Settings className="h-3.5 w-3.5" /></button>
                  <button onClick={toggleTargetRegistration} className="grid h-8 w-8 place-items-center rounded-full border border-[#4b6e82] bg-[#214355] text-[#d2e6ee]" aria-label="Khóa hoặc mở đăng ký mục tiêu" title={targetRegistrationOpen ? 'Đăng ký mục tiêu đang mở' : 'Đăng ký mục tiêu đang khóa'}>{targetRegistrationOpen ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}</button>
                  <button onClick={() => setNoticeOpen(true)} className="relative grid h-8 w-8 place-items-center rounded-full border border-[#4b6e82] bg-[#214355] text-[#d2e6ee]" aria-label="Thông báo KPI" title="Thông báo KPI"><Bell className="h-3.5 w-3.5" />{noticeEnabled && noticeContent && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#e0a52f]" />}</button>
                </>
              )}
              <button onClick={handleReloadAll} className="grid h-8 w-8 place-items-center rounded-full border border-[#44677a] bg-[#1c3a4b] text-[#b9d1dc]" aria-label="Đồng bộ dữ liệu" title={lastSync ? `Đồng bộ lần cuối ${lastSync.toLocaleTimeString('vi-VN')}` : 'Đồng bộ dữ liệu'}><RefreshCw className={`h-3.5 w-3.5 ${isReloading ? 'animate-spin' : ''}`} /></button>
            </div>
            <span className="nmc-home-control-cut" aria-hidden="true" />
          </div>
        </header>

        <nav className="nmc-home-functions mx-auto mt-3 grid max-w-3xl grid-cols-4 gap-2 sm:gap-3">
          <FunctionButton label="Thi Đua" icon={<Trophy className="h-5 w-5" />} background="#c97b22" border="#e4a14f" shadow="#7d4814" onClick={() => router.push('/thi-dua-chau')} />
          <FunctionButton label="Quản Lý" icon={<Database className="h-5 w-5" />} background="#27805f" border="#43a77f" shadow="#15523c" onClick={() => router.push('/quan-ly')} />
          <FunctionButton label="KPI" icon={<BarChart3 className="h-5 w-5" />} background="#2777a7" border="#4b9bc5" shadow="#184b68" onClick={() => router.push('/kpi')} />
          <FunctionButton label="CLB Sao Việt" shortLabel="CLB SV" icon={<Star className="h-5 w-5" />} background="#9b7827" border="#c7a94d" shadow="#5d4818" onClick={() => router.push('/clb-sao-viet')} />
        </nav>

        <main className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,.92fr)_minmax(420px,1.08fr)] lg:items-stretch">
          <section className="nmc-home-links-panel rounded-[22px] border border-[#35566a] bg-[#122a38] p-3 shadow-[0_18px_45px_rgba(0,0,0,.32),inset_0_1px_0_rgba(255,255,255,.05)] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-[#79a8bf]">Liên kết nhanh</div>
                <div className="mt-0.5 text-sm font-black text-white">Các nội dung đang sử dụng</div>
              </div>
              <div className="rounded-full border border-[#3f6275] bg-[#1d3c4d] px-2.5 py-1 text-[10px] font-black text-[#bcd2dd]">{links.length} ô</div>
            </div>

            {linksError && links.length === 0 ? (
              <div className="rounded-2xl border border-[#704e50] bg-[#3d292f] px-4 py-8 text-center text-sm text-[#f0b5b5]">Không thể tải danh sách liên kết.</div>
            ) : links.length === 0 && !linksLoading ? (
              <div className="rounded-2xl border border-[#3d5b6d] bg-[#183342] px-4 py-8 text-center text-sm text-[#9cb8c6]">Chưa có liên kết nào.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {links.map((link) => <LinkTile key={link.id} link={link} onOpen={setSelectedLink} />)}
              </div>
            )}
          </section>

          <div className="h-[50vh] min-h-[390px] lg:h-[calc(100vh-250px)] lg:min-h-[520px]">
            <VerticalAgenda />
          </div>
        </main>
      </div>

      {selectedLink && <IframeModal link={selectedLink} onClose={() => setSelectedLink(null)} />}
      <AddLinkModal
        isOpen={isAddModalOpen}
        editingLink={editingLink}
        categories={categories}
        onClose={() => { setIsAddModalOpen(false); setEditingLink(null) }}
        onSubmit={handleAddOrUpdateLink}
      />
      <StatsPanel isOpen={isStatsOpen} stats={stats} onClose={() => setIsStatsOpen(false)} onExport={(format) => window.open(`/api/export?format=${format}&category=all`, '_blank')} />
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogoutAdmin={logoutAdmin}
        onAddLink={() => { setEditingLink(null); setIsAddModalOpen(true) }}
        onEditLink={(link) => { setEditingLink(link); setIsAddModalOpen(true) }}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      {adminPwdOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/75 p-4" onClick={() => { setAdminPwdOpen(false); setPendingMaintenanceToggle(false) }}>
          <div className="w-full max-w-sm rounded-[22px] border border-[#496b7e] bg-[#173243] p-5 shadow-[0_25px_70px_rgba(0,0,0,.55)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#285064] text-[#d8edf5]"><ShieldCheck className="h-5 w-5" /></div>
                <div><div className="text-sm font-black text-white">Xác thực quản trị</div><div className="mt-0.5 text-[10px] text-[#91afbd]">Mở quyền điều khiển hệ thống</div></div>
              </div>
              <button onClick={() => { setAdminPwdOpen(false); setPendingMaintenanceToggle(false) }} className="grid h-8 w-8 place-items-center rounded-lg bg-[#23485a] text-[#b8ced8]" aria-label="Đóng"><X className="h-4 w-4" /></button>
            </div>
            <input type="password" value={adminPwdInput} onChange={(event) => { setAdminPwdInput(event.target.value); setAdminPwdError(false) }} onKeyDown={(event) => { if (event.key === 'Enter') submitAdminPwd() }} autoFocus placeholder="Mật khẩu Admin" className={`mt-4 w-full rounded-xl border bg-[#0e2330] px-3 py-3 text-sm text-white outline-none ${adminPwdError ? 'border-[#d46a6a]' : 'border-[#486b7d]'}`} />
            {adminPwdError && <div className="mt-1.5 text-center text-[11px] font-semibold text-[#f1a0a0]">Mật khẩu không đúng</div>}
            <button onClick={submitAdminPwd} className="mt-3 w-full rounded-xl bg-[#318c76] px-4 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(49,140,118,.25)]">Xác nhận</button>
          </div>
        </div>
      )}

      {noticeOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/75 p-4" onClick={() => setNoticeOpen(false)}>
          <div className="w-full max-w-lg rounded-[22px] border border-[#6d613e] bg-[#20323a] p-5 shadow-[0_25px_70px_rgba(0,0,0,.55)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-sm font-black text-white">Thông báo KPI</div><div className="mt-0.5 text-[10px] text-[#a9b8bd]">Nội dung băng thông báo trên KPI</div></div>
              <button onClick={() => setNoticeOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#314850] text-[#c7d5d9]" aria-label="Đóng"><X className="h-4 w-4" /></button>
            </div>
            <textarea value={noticeContent} onChange={(event) => setNoticeContent(event.target.value)} rows={6} className="mt-4 w-full resize-y rounded-xl border border-[#50656c] bg-[#12242b] px-3 py-3 text-sm text-white outline-none placeholder:text-[#667b82]" placeholder="Nhập thông báo…" />
            <div className="mt-3 flex gap-2">
              <button onClick={toggleNoticeEnabled} className="rounded-xl border border-[#52656d] bg-[#31464d] px-3 py-2 text-xs font-black text-white">{noticeEnabled ? 'Tắt hiển thị' : 'Bật hiển thị'}</button>
              <button onClick={saveNotice} disabled={noticeSaving} className="flex-1 rounded-xl bg-[#a57c2e] px-3 py-2 text-xs font-black text-white disabled:opacity-50">{noticeSaving ? 'Đang lưu…' : 'Lưu thông báo'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
