'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Link, Category } from '@/lib/types'
import { LinkCard } from '@/components/link-card'
import { IframeModal } from '@/components/iframe-modal'
import { AddLinkModal } from '@/components/add-link-modal'
import { StatsPanel } from '@/components/stats-panel'
import { MonthlyCalendar } from '@/components/monthly-calendar'
import { Settings, Check, AlertCircle, Link2, Trophy, Database, BarChart3, Lock, Unlock, X, RefreshCw, Bell, Bold, Italic, Underline } from 'lucide-react'
import { SettingsPanel } from '@/components/settings-panel'
import { DesktopBigClock } from '@/components/desktop-big-clock'
import { AppLoader } from '@/components/app-loader'
import { useSettings } from '@/hooks/use-settings'
import { useAppData } from '@/lib/app-data-context'
import { cn } from '@/lib/utils'
import useSWR, { mutate } from 'swr'
import { motion, AnimatePresence, staggerContainer, staggerItem, glowPulseAnimation } from '@/lib/animations'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  return res.json()
}

// Neon divider component with stronger glow
function NeonDivider({ color = '#00ff88' }: { color?: string }) {
  return (
    <div className="relative h-6 flex items-center justify-center">
      <div
        className="w-full h-[1px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}60, ${color}, ${color}60, transparent)`,
          boxShadow: `0 0 8px ${color}40, 0 0 16px ${color}20`,
        }}
      />
      {/* Glow pulse effect */}
      <motion.div
        className="absolute h-[1px] left-0 right-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
        animate={{
          opacity: [0.3, 1, 0.3],
          scaleX: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

// Creative N•M•C text with neon effects - horizontal layout with flowing chevron arrows
function NMCLogo({ color = '#00ff88' }: { color?: string }) {
  const parts = ['N', '•', 'M', '•', 'C']

  // Flowing chevron arrow stream - spans from edge toward center text
  // Uses SVG with animated sweep mask for ultra-smooth flowing light effect
  const ArrowStream = ({ direction }: { direction: 'left' | 'right' }) => {
    const isLeft = direction === 'left'
    const count = 18
    const spacing = 14
    const svgW = count * spacing
    const svgH = 22

    return (
      <div className="flex-1 min-w-0 overflow-hidden" style={{ height: '24px' }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgW} ${svgH}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Proximity fade gradient - chevrons near text are brighter */}
            <linearGradient id={`fade-${direction}`} x1="0%" y1="0%" x2="100%" y2="0%">
              {isLeft ? (
                <>
                  <stop offset="0%" stopColor={color} stopOpacity="0.06" />
                  <stop offset="80%" stopColor={color} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                  <stop offset="20%" stopColor={color} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.06" />
                </>
              )}
            </linearGradient>

            {/* Sweep gradient for animated glow - moves from edge toward text */}
            <linearGradient id={`sweep-${direction}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={svgW} y2="0">
              <stop stopColor="white" stopOpacity="0">
                <animate
                  attributeName="offset"
                  values={isLeft ? '-0.25;-0.25;1.25' : '1.25;1.25;-0.25'}
                  keyTimes="0;0.55;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop stopColor="white" stopOpacity="1">
                <animate
                  attributeName="offset"
                  values={isLeft ? '-0.12;-0.12;1.38' : '1.38;1.38;-0.12'}
                  keyTimes="0;0.55;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop stopColor="white" stopOpacity="0">
                <animate
                  attributeName="offset"
                  values={isLeft ? '0;0;1.5' : '1.5;1.5;0'}
                  keyTimes="0;0.55;1"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>

            <mask id={`mask-${direction}`}>
              <rect x="0" y="0" width={svgW} height={svgH} fill={`url(#sweep-${direction})`} />
            </mask>
          </defs>

          {/* Base chevrons - always dimly visible */}
          {Array.from({ length: count }).map((_, i) => {
            const x = i * spacing
            return (
              <path
                key={i}
                d={isLeft
                  ? `M${x + 4} 4 L${x + 10} 11 L${x + 4} 18`
                  : `M${x + 10} 4 L${x + 4} 11 L${x + 10} 18`
                }
                fill="none"
                stroke={`url(#fade-${direction})`}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          })}

          {/* Glow chevrons - revealed by sweeping mask */}
          <g mask={`url(#mask-${direction})`} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
            {Array.from({ length: count }).map((_, i) => {
              const x = i * spacing
              return (
                <path
                  key={`g${i}`}
                  d={isLeft
                    ? `M${x + 4} 4 L${x + 10} 11 L${x + 4} 18`
                    : `M${x + 10} 4 L${x + 4} 11 L${x + 10} 18`
                  }
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}
          </g>
        </svg>
      </div>
    )
  }

  return (
    <div className="flex items-center w-full">
      {/* Left arrows: flowing right → toward text */}
      <ArrowStream direction="left" />

      {/* N•M•C text */}
      <div className="flex items-center justify-center gap-0.5 flex-shrink-0 px-1">
        {parts.map((part, i) => {
          const isBullet = part === '•'
          return (
            <motion.span
              key={i}
              className="relative inline-block leading-none"
              style={{
                fontSize: isBullet ? '1.5rem' : '3rem',
                fontWeight: isBullet ? 400 : 900,
                fontFamily: '"Outfit", system-ui, sans-serif',
                color: isBullet ? `${color}60` : color,
                textShadow: isBullet
                  ? `0 0 6px ${color}30`
                  : `0 0 10px ${color}80, 0 0 30px ${color}40, 0 0 60px ${color}20, 0 0 100px ${color}10`,
                letterSpacing: isBullet ? '0' : '0.05em',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + i * 0.08,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {part}
              {!isBullet && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, transparent 0%, ${color}30 50%, transparent 100%)`,
                    backgroundSize: '100% 200%',
                  }}
                  animate={{
                    backgroundPosition: ['0% 0%', '0% 200%'],
                  }}
                  transition={{
                    duration: 2 + i * 0.3,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.2,
                  }}
                />
              )}
            </motion.span>
          )
        })}
      </div>

      {/* Right arrows: flowing left ← toward text */}
      <ArrowStream direction="right" />
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const { data: linksData, isLoading: linksLoading, isValidating: linksValidating, error: linksError } = useSWR<Link[]>('/api/links', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    keepPreviousData: true,
    fallbackData: [],
  })
  const { data: categoriesData, error: categoriesError } = useSWR<Category[]>('/api/categories', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    keepPreviousData: true,
    fallbackData: [],
  })
  const { data: stats, error: statsError } = useSWR('/api/stats', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
  })

  const links = useMemo(() => Array.isArray(linksData) ? linksData : [], [linksData])
  const categories = useMemo(() => Array.isArray(categoriesData) ? categoriesData : [], [categoriesData])
  const { settings } = useSettings()
  const { reload: reloadAppData, isReloading: appDataReloading, lastSync, isLoading, loadError, reload } = useAppData()

  // Apply neon color from server settings (no localStorage)
  useEffect(() => {
    if (settings?.neon_color) {
      document.documentElement.style.setProperty('--primary', settings.neon_color)
    }
  }, [settings?.neon_color])

  // Handler cho nút "Load dữ liệu" — ép đồng bộ toàn app:
  // 1) Reload context (KPI, Quản lý, Thi đua)
  // 2) Refresh SWR cache của trang chính (links, categories, stats)
  const handleReloadAll = useCallback(async () => {
    await reloadAppData();
    mutate('/api/links');
    mutate('/api/categories');
    mutate('/api/stats');
  }, [reloadAppData]);

  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [modalKey, setModalKey] = useState(0)

  // ===== ADMIN AUTH =====
  // Admin đăng nhập tại đây → lưu sessionStorage('kpi_admin_authed')='1'.
  // Các trang /kpi và /quan-ly đọc sessionStorage này để hiện nút Trở về + Cài đặt + Sync.
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminPwdOpen, setAdminPwdOpen] = useState(false);
  const [adminPwdInput, setAdminPwdInput] = useState('');
  const [adminPwdError, setAdminPwdError] = useState(false);
  const ADMIN_PWD = '123456';

  // ===== KPI NOTICE (banner thông báo chạy cuộn trên trang KPI) =====
  // Admin nhập nội dung + bật/tắt hiển thị tại đây → lưu vào settings → KPI page đọc và hiển thị.
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeEnabled, setNoticeEnabled] = useState(true);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const noticeTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync notice state từ settings khi mount hoặc khi settings thay đổi
  useEffect(() => {
    const raw = (settings as Record<string, string>)['kpi-notice-content'] || '';
    setNoticeContent(raw);
    setNoticeEnabled((settings as Record<string, string>)['kpi-notice-enabled'] !== '0');
  }, [settings]);

  // Wrap selection trong textarea bằng HTML tag (<b>, <i>, <u>)
  const wrapSelection = useCallback((openTag: string, closeTag: string) => {
    const ta = noticeTextareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = noticeContent.slice(0, start);
    const sel = noticeContent.slice(start, end);
    const after = noticeContent.slice(end);
    const next = `${before}${openTag}${sel}${closeTag}${after}`;
    setNoticeContent(next);
    // Đặt lại caret sau khi render
    requestAnimationFrame(() => {
      ta.focus();
      const pos = (before + openTag + sel + closeTag).length;
      ta.setSelectionRange(pos, pos);
    });
  }, [noticeContent]);

  const saveNotice = useCallback(async () => {
    setNoticeSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'kpi-notice-content': noticeContent,
          'kpi-notice-enabled': noticeEnabled ? '1' : '0',
        }),
      });
      mutate('/api/settings');
    } catch (e) {
      console.warn('Lưu thông báo thất bại:', e);
    } finally {
      setNoticeSaving(false);
    }
  }, [noticeContent, noticeEnabled]);

  const toggleNotice = useCallback(async () => {
    const next = !noticeEnabled;
    setNoticeEnabled(next);
    setNoticeSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'kpi-notice-enabled': next ? '1' : '0',
        }),
      });
      mutate('/api/settings');
    } catch (e) {
      console.warn('Bật/tắt thông báo thất bại:', e);
    } finally {
      setNoticeSaving(false);
    }
  }, [noticeEnabled]);

  const targetRegistrationOpen = (settings as Record<string, string>)['kpi-target-registration-open'] !== '0';
  const toggleTargetRegistration = useCallback(async () => {
    const next = !targetRegistrationOpen;
    // Update the main app immediately; KPI pages pick up this shared setting.
    mutate('/api/settings', (current: Record<string, string> | undefined) => ({
      ...(current || {}),
      'kpi-target-registration-open': next ? '1' : '0',
    }), false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'kpi-target-registration-open': next ? '1' : '0' }),
      });
      if (!res.ok) throw new Error('save failed');
      // Tell KPI tabs on this domain immediately; no full data reload is needed.
      try {
        const channel = new BroadcastChannel('nmc-kpi-settings');
        channel.postMessage({ key: 'kpi-target-registration-open', value: next ? '1' : '0' });
        channel.close();
      } catch {}
      try {
        localStorage.setItem('nmc-kpi-settings-changed', String(Date.now()));
      } catch {}
    } catch {
      mutate('/api/settings');
      alert('Không thể cập nhật trạng thái đăng ký mục tiêu. Vui lòng thử lại.');
    }
  }, [targetRegistrationOpen]);

  // Đọc sessionStorage khi mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('kpi_admin_authed') === '1') {
        setAdminAuthed(true);
      }
    } catch {}
  }, []);

  const openAdminPwd = useCallback(() => {
    setAdminPwdOpen(true); setAdminPwdInput(''); setAdminPwdError(false);
  }, []);
  const submitAdminPwd = useCallback(() => {
    if (adminPwdInput === ADMIN_PWD) {
      setAdminAuthed(true);
      try { sessionStorage.setItem('kpi_admin_authed', '1'); } catch {}
      setAdminPwdOpen(false); setAdminPwdInput(''); setAdminPwdError(false);
    } else {
      setAdminPwdError(true);
    }
  }, [adminPwdInput]);
  const logoutAdmin = useCallback(() => {
    setAdminAuthed(false);
    try { sessionStorage.removeItem('kpi_admin_authed'); } catch {}
  }, []);

  const handleAddOrUpdateLink = async (data: Partial<Link>) => {
    setSaveStatus('saving')
    try {
      let res: Response
      if (data.id) {
        res = await fetch(`/api/links/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save link')
      }

      if (data.category && data.category !== 'General') {
        const existingCat = categories.find(c => c.name === data.category)
        if (!existingCat) {
          await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: data.category, color: '#3b82f6' }),
          })
          mutate('/api/categories')
        }
      }

      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
      // Optimistic update: mutate with revalidation to prevent flash
      mutate('/api/links', async (current) => {
        const res = await fetch('/api/links')
        if (!res.ok) throw new Error()
        return res.json()
      }, { revalidate: true })
      mutate('/api/stats')
      setEditingLink(null)
    } catch (error) {
      console.error('Failed to save link:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/export?format=${format}&category=all`, '_blank')
  }

  const neonColor = settings.neon_color || '#00ff88'

  const handleOpenLink = useCallback((link: Link) => {
    setModalKey(k => k + 1)
    setSelectedLink(link)
  }, [])

  const handleCloseLink = useCallback(() => {
    setSelectedLink(null)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden relative z-[1]">
      {/* Branded loading screen — shows on initial app load until first data arrives */}
      <AppLoader show={isLoading || (linksLoading && links.length === 0)} error={loadError} onRetry={reload} />
      {/* Save Status Toast */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg"
            style={{
              background: saveStatus === 'success' ? 'rgba(0, 255, 136, 0.15)' : saveStatus === 'error' ? 'rgba(255, 68, 68, 0.15)' : 'rgba(0, 255, 136, 0.1)',
              border: `1px solid ${saveStatus === 'success' ? 'rgba(0, 255, 136, 0.3)' : saveStatus === 'error' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(0, 255, 136, 0.2)'}`,
              color: saveStatus === 'error' ? '#ff4444' : neonColor,
              backdropFilter: 'blur(12px)',
            }}
          >
            {saveStatus === 'saving' && (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Đang lưu...
              </>
            )}
            {saveStatus === 'success' && (
              <>
                <Check className="w-4 h-4" />
                Đã lưu thành công!
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4" />
                Lưu thất bại!
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MOBILE LAYOUT: vertical (unchanged) ===== */}
      <div className="flex flex-col h-full md:hidden">
        {/* Header */}
        <motion.header
          className="max-w-lg mx-auto w-full px-4 pt-10 pb-3 text-center relative flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <NMCLogo color={neonColor} />
          <motion.div
            className="flex items-center justify-center gap-2 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <p className="text-xs text-muted-foreground">{settings.profile_bio}</p>
            {/* Admin button — bên dưới chữ N.M.C. CHỈ HIỆN khi chưa đăng nhập. Khi đã đăng nhập → ẩn (đã có nút Cài đặt). */}
            {!adminAuthed && (() => {
              const adminBtnStyle = { background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` };
              const adminHoverShadow = `0 0 20px ${neonColor}50`;
              return (
                <motion.button
                  onClick={() => openAdminPwd()}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={adminBtnStyle}
                  animate={{ boxShadow: [`0 0 8px ${neonColor}20`, `0 0 16px ${neonColor}35`, `0 0 8px ${neonColor}20`] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.2, boxShadow: adminHoverShadow }}
                  whileTap={{ scale: 0.85 }}
                  title="Đăng nhập Admin"
                  aria-label="Đăng nhập Admin"
                >
                  <Lock className="w-3 h-3" style={{ color: neonColor }} />
                </motion.button>
              );
            })()}
            {/* Load dữ liệu button — ép đồng bộ toàn app. Hiện cho mọi user. */}
            <motion.button
              onClick={() => handleReloadAll()}
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
              whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }}
              whileTap={{ scale: 0.85 }}
              title={lastSync ? `Đồng bộ lần cuối: ${lastSync.toLocaleTimeString('vi-VN')}` : 'Đồng bộ dữ liệu'}
              aria-label="Đồng bộ dữ liệu toàn ứng dụng"
            >
              <RefreshCw className={`w-3 h-3 ${appDataReloading ? 'animate-spin' : ''}`} style={{ color: neonColor }} />
            </motion.button>
            {/* Settings button — chỉ hiện khi đã đăng nhập Admin */}
            {adminAuthed && (
              <motion.button
                onClick={() => setIsSettingsOpen(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                whileHover={{ scale: 1.2, rotate: 90, boxShadow: `0 0 20px ${neonColor}50` }}
                whileTap={{ scale: 0.85 }}
                title="Cài đặt"
              >
                <Settings className="w-3 h-3" style={{ color: neonColor }} />
              </motion.button>
            )}
            {adminAuthed && (
              <motion.button
                onClick={toggleTargetRegistration}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }} whileTap={{ scale: 0.85 }}
                title={targetRegistrationOpen ? 'Đăng ký mục tiêu đang mở — bấm để khóa' : 'Đăng ký mục tiêu đang khóa — bấm để mở'}
                aria-label="Khóa hoặc mở đăng ký mục tiêu"
              >
                {targetRegistrationOpen ? <Unlock className="w-3 h-3" style={{ color: neonColor }} /> : <Lock className="w-3 h-3" style={{ color: neonColor }} />}
              </motion.button>
            )}
            {/* Notice button — chỉ hiện khi đã đăng nhập Admin. Mở popup nhập thông báo cho băng rôn KPI. */}
            {adminAuthed && (
              <motion.button
                onClick={() => setNoticeOpen(true)}
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 relative"
                style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }}
                whileTap={{ scale: 0.85 }}
                title="Thông báo KPI"
                aria-label="Thông báo KPI"
              >
                <Bell className="w-3 h-3" style={{ color: neonColor }} />
                {noticeEnabled && noticeContent && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: '#ffd700', boxShadow: '0 0 6px #ffd700' }}
                  />
                )}
              </motion.button>
            )}
          </motion.div>
        </motion.header>

        <div className="max-w-lg mx-auto w-full px-6 flex-shrink-0"><NeonDivider color={neonColor} /></div>

        <motion.div className="max-w-lg mx-auto w-full px-4 pb-2 flex-shrink-0 grid grid-cols-3 gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
          <motion.button
            onClick={() => router.push('/thi-dua-chau')}
            className="py-2.5 rounded-none flex items-center justify-center gap-1 text-xs font-bold text-white relative overflow-hidden"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1.5px solid #f59e0b60', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(245,158,11,0.2)' }}
            whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(245,158,11,0.35)' }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', boxShadow: '0 0 8px #f59e0b80, 0 0 16px #f59e0b40', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
            </div>
            <Trophy className="w-4 h-4 relative z-10" /> <span className="relative z-10">Thi Đua</span>
          </motion.button>
          <motion.button
            onClick={() => router.push('/quan-ly')}
            className="py-2.5 rounded-none flex items-center justify-center gap-1 text-xs font-bold text-white relative overflow-hidden"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid #10b98160', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(16,185,129,0.2)' }}
            whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(16,185,129,0.35)' }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)', boxShadow: '0 0 8px #10b98180, 0 0 16px #10b98140', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
            </div>
            <Database className="w-4 h-4 relative z-10" /> <span className="relative z-10">Quản Lý</span>
          </motion.button>
          <motion.button
            onClick={() => router.push('/kpi')}
            className="py-2.5 rounded-none flex items-center justify-center gap-1 text-xs font-bold text-white relative overflow-hidden"
            style={{ background: 'rgba(6,182,212,0.12)', border: '1.5px solid #06b6d460', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(6,182,212,0.2)' }}
            whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(6,182,212,0.35)' }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)', boxShadow: '0 0 8px #06b6d480, 0 0 16px #06b6d440', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
            </div>
            <BarChart3 className="w-4 h-4 relative z-10" /> <span className="relative z-10">KPI</span>
          </motion.button>
        </motion.div>

        {/* Links area — flex-1, scroll independently, chiếm phần còn lại sau khi calendar lấy 50vh */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-lg mx-auto w-full px-4 pt-2 pb-2">
            {linksLoading && links.length === 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map(i => (
                  <motion.div key={i} className="h-20 rounded-xl bg-card border border-border/50" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, duration: 0.3 }}>
                    <div className="h-full rounded-xl skeleton-pulse" />
                  </motion.div>
                ))}
              </div>
            ) : linksError && links.length === 0 ? (
              <motion.div className="text-center py-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <motion.div className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                  <Link2 className="w-10 h-10 text-primary" />
                </motion.div>
                <p className="text-muted-foreground text-xs">Lỗi tải dữ liệu. Kéo xuống để thử lại.</p>
              </motion.div>
            ) : links.length === 0 && !linksLoading ? (
              <motion.div className="text-center py-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <motion.div className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                  <Link2 className="w-10 h-10 text-primary" />
                </motion.div>
                <p className="text-muted-foreground text-xs">Chưa có liên kết nào. Mở Cài đặt để thêm.</p>
              </motion.div>
            ) : (
              <motion.div className="grid grid-cols-2 gap-2" variants={staggerContainer} initial="initial" animate="animate">
                <AnimatePresence mode="popLayout">
                  {links.map((link, index) => (
                    <motion.div key={link.id} variants={staggerItem} layout layoutId={`mobile-link-${link.id}`}>
                      <LinkCard link={link} index={index} neonColor={neonColor} onOpen={handleOpenLink} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

        {/* Calendar — chiếm 50% chiều cao màn hình mobile */}
        <div className="flex-shrink-0 h-[50vh] overflow-hidden flex flex-col">
          <div className="max-w-lg mx-auto w-full px-6 pt-1 flex-shrink-0"><NeonDivider color={neonColor} /></div>
          <motion.div className="max-w-lg mx-auto w-full px-4 pt-2 pb-4 flex-1 min-h-0 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <div className="rounded-xl p-3 flex-1 min-h-0 flex flex-col" style={{ background: 'rgba(42, 46, 54, 0.65)', border: `1px solid ${neonColor}18`, backdropFilter: 'blur(12px)', boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 15px ${neonColor}08` }}>
              <MonthlyCalendar neonColor={neonColor} compact />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== DESKTOP LAYOUT: horizontal - left: functions, right: calendar ===== */}
      <div className="hidden md:flex md:flex-row md:h-full md:w-full">
        {/* LEFT SIDE: Logo + Thi Đua + Links - vertically centered */}
        <div className="flex flex-col h-full md:w-[40%] lg:w-[38%] xl:w-[36%] flex-shrink-0 pt-6 pb-4">
          {/* Header */}
          <motion.header
            className="w-full px-8 pb-3 text-center relative flex-shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <NMCLogo color={neonColor} />
            <motion.div
              className="flex items-center justify-center gap-2 mt-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p className="text-sm text-muted-foreground">{settings.profile_bio}</p>
              {/* Admin button — bên dưới chữ N.M.C. CHỈ HIỆN khi chưa đăng nhập. Khi đã đăng nhập → ẩn (đã có nút Cài đặt). */}
              {!adminAuthed && (
                <motion.button
                  onClick={() => openAdminPwd()}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                  animate={{ boxShadow: [`0 0 8px ${neonColor}20`, `0 0 16px ${neonColor}35`, `0 0 8px ${neonColor}20`] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }}
                  whileTap={{ scale: 0.85 }}
                  title="Đăng nhập Admin"
                  aria-label="Đăng nhập Admin"
                >
                  <Lock className="w-3.5 h-3.5" style={{ color: neonColor }} />
                </motion.button>
              )}
              {/* Load dữ liệu button — ép đồng bộ toàn app. Hiện cho mọi user. */}
              <motion.button
                onClick={() => handleReloadAll()}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }}
                whileTap={{ scale: 0.85 }}
                title={lastSync ? `Đồng bộ lần cuối: ${lastSync.toLocaleTimeString('vi-VN')}` : 'Đồng bộ dữ liệu'}
                aria-label="Đồng bộ dữ liệu toàn ứng dụng"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${appDataReloading ? 'animate-spin' : ''}`} style={{ color: neonColor }} />
              </motion.button>
              {/* Settings button — chỉ hiện khi đã đăng nhập Admin */}
              {adminAuthed && (
                <motion.button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                  whileHover={{ scale: 1.2, rotate: 90, boxShadow: `0 0 20px ${neonColor}50` }}
                  whileTap={{ scale: 0.85 }}
                  title="Cài đặt"
                >
                  <Settings className="w-3.5 h-3.5" style={{ color: neonColor }} />
                </motion.button>
              )}
              {adminAuthed && (
                <motion.button
                  onClick={toggleTargetRegistration}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                  whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }} whileTap={{ scale: 0.85 }}
                  title={targetRegistrationOpen ? 'Đăng ký mục tiêu đang mở — bấm để khóa' : 'Đăng ký mục tiêu đang khóa — bấm để mở'}
                  aria-label="Khóa hoặc mở đăng ký mục tiêu"
                >
                  {targetRegistrationOpen ? <Unlock className="w-3.5 h-3.5" style={{ color: neonColor }} /> : <Lock className="w-3.5 h-3.5" style={{ color: neonColor }} />}
                </motion.button>
              )}
              {/* Notice button — chỉ hiện khi đã đăng nhập Admin. Mở popup nhập thông báo cho băng rôn KPI. */}
              {adminAuthed && (
                <motion.button
                  onClick={() => setNoticeOpen(true)}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 relative"
                  style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}30`, boxShadow: `0 0 8px ${neonColor}20` }}
                  whileHover={{ scale: 1.2, boxShadow: `0 0 20px ${neonColor}50` }}
                  whileTap={{ scale: 0.85 }}
                  title="Thông báo KPI"
                  aria-label="Thông báo KPI"
                >
                  <Bell className="w-3.5 h-3.5" style={{ color: neonColor }} />
                  {noticeEnabled && noticeContent && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ background: '#ffd700', boxShadow: '0 0 6px #ffd700' }}
                    />
                  )}
                </motion.button>
              )}
            </motion.div>
          </motion.header>

          <div className="w-full px-8 flex-shrink-0"><NeonDivider color={neonColor} /></div>

          <motion.div className="w-full px-8 py-3 flex-shrink-0 grid grid-cols-3 gap-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
            <motion.button
              onClick={() => router.push('/thi-dua-chau')}
              className="py-3 rounded-none flex items-center justify-center gap-2 text-sm font-bold text-white relative overflow-hidden"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1.5px solid #f59e0b60', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(245,158,11,0.2)' }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(245,158,11,0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', boxShadow: '0 0 8px #f59e0b80, 0 0 16px #f59e0b40', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
              </div>
              <Trophy className="w-4 h-4 relative z-10" /> <span className="relative z-10">Thi Đua</span>
            </motion.button>
            <motion.button
              onClick={() => router.push('/quan-ly')}
              className="py-3 rounded-none flex items-center justify-center gap-2 text-sm font-bold text-white relative overflow-hidden"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid #10b98160', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(16,185,129,0.2)' }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(16,185,129,0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)', boxShadow: '0 0 8px #10b98180, 0 0 16px #10b98140', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
              </div>
              <Database className="w-4 h-4 relative z-10" /> <span className="relative z-10">Quản Lý</span>
            </motion.button>
            <motion.button
              onClick={() => router.push('/kpi')}
              className="py-3 rounded-none flex items-center justify-center gap-2 text-sm font-bold text-white relative overflow-hidden"
              style={{ background: 'rgba(6,182,212,0.12)', border: '1.5px solid #06b6d460', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(6,182,212,0.2)' }}
              whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(6,182,212,0.35)' }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)', boxShadow: '0 0 8px #06b6d480, 0 0 16px #06b6d440', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
              </div>
              <BarChart3 className="w-4 h-4 relative z-10" /> <span className="relative z-10">KPI</span>
            </motion.button>
          </motion.div>

          {/* Links grid - scrollable when many buttons */}
          <div className="flex-1 min-h-0 px-8 overflow-y-auto scrollbar-none">
            <div className="w-full pt-1 pb-4">
              {linksLoading && links.length === 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map(i => (
                    <motion.div key={i} className="h-24 rounded-xl bg-card border border-border/50" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1, duration: 0.3 }}>
                      <div className="h-full rounded-xl skeleton-pulse" />
                    </motion.div>
                  ))}
                </div>
              ) : linksError && links.length === 0 ? (
                <motion.div className="text-center py-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                  <motion.div className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                    <Link2 className="w-10 h-10 text-primary" />
                  </motion.div>
                  <p className="text-muted-foreground text-xs">Lỗi tải dữ liệu. Kéo xuống để thử lại.</p>
                </motion.div>
              ) : links.length === 0 && !linksLoading ? (
                <motion.div className="text-center py-8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                  <motion.div className="opacity-30 mb-3 mx-auto w-10 h-10 flex items-center justify-center" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                    <Link2 className="w-10 h-10 text-primary" />
                  </motion.div>
                  <p className="text-muted-foreground text-xs">Chưa có liên kết nào. Mở Cài đặt để thêm.</p>
                </motion.div>
              ) : (
                <motion.div className="grid grid-cols-2 gap-3" variants={staggerContainer} initial="initial" animate="animate">
                  <AnimatePresence mode="popLayout">
                    {links.map((link, index) => (
                      <motion.div key={link.id} variants={staggerItem} layout layoutId={`desktop-link-${link.id}`}>
                        <LinkCard link={link} index={index} neonColor={neonColor} onOpen={handleOpenLink} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>

          {/* Big Clock - centered in remaining space */}
          <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
            <DesktopBigClock neonColor={neonColor} />
          </div>
        </div>

        {/* Vertical Neon Divider between left and right */}
        <div className="flex-shrink-0 flex items-center justify-center w-4">
          <div className="w-[1px] h-[65%] rounded-full" style={{
            background: `linear-gradient(180deg, transparent, ${neonColor}40, ${neonColor}80, ${neonColor}40, transparent)`,
            boxShadow: `0 0 12px ${neonColor}30`,
          }} />
        </div>

        {/* RIGHT SIDE: Calendar - wider, shorter */}
        <motion.div
          className="flex-1 flex items-start justify-center py-4 px-2 lg:px-4 xl:px-6 overflow-y-auto"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div
            className="rounded-none p-3 lg:p-4 w-full max-w-[900px] flex-shrink-0"
            style={{
              background: 'rgba(42, 46, 54, 0.7)',
              border: `1.5px solid ${neonColor}30`,
              backdropFilter: 'blur(20px)',
              boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 50px ${neonColor}12, inset 0 0 30px ${neonColor}05`,
            }}
          >
            <MonthlyCalendar neonColor={neonColor} compact={false} desktopBright />
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedLink && (
          <IframeModal key={`modal-${modalKey}`} link={selectedLink} onClose={handleCloseLink} />
        )}
      </AnimatePresence>

      <AddLinkModal
        isOpen={isAddModalOpen}
        editingLink={editingLink}
        categories={categories}
        onClose={() => {
          setIsAddModalOpen(false)
          setEditingLink(null)
        }}
        onSubmit={handleAddOrUpdateLink}
      />

      <StatsPanel isOpen={isStatsOpen} stats={stats} onClose={() => setIsStatsOpen(false)} onExport={handleExport} />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogoutAdmin={logoutAdmin}
        onAddLink={() => {
          setEditingLink(null)
          setIsAddModalOpen(true)
        }}
        onEditLink={(link) => {
          setEditingLink(link)
          setIsAddModalOpen(true)
        }}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      {/* ===== ADMIN LOGIN MODAL ===== */}
      <AnimatePresence>
        {adminPwdOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setAdminPwdOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl p-5 relative"
              style={{
                background: 'rgba(42, 46, 54, 0.95)',
                border: `1.5px solid ${neonColor}40`,
                boxShadow: `0 20px 60px rgba(0,0,0,.6), 0 0 50px ${neonColor}20`,
              }}
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            >
              <button
                onClick={() => setAdminPwdOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center text-center mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                  style={{ background: `${neonColor}15`, border: `1px solid ${neonColor}40`, boxShadow: `0 0 12px ${neonColor}30` }}
                >
                  <Lock className="w-5 h-5" style={{ color: neonColor }} />
                </div>
                <h3 className="text-base font-extrabold text-white">Xác thực Admin</h3>
                <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                  Nhập mật khẩu Admin để mở khóa các nút Cài đặt số liệu, hình ảnh và link liên kết trên toàn ứng dụng.
                </p>
              </div>
              <input
                type="password"
                className={`w-full bg-black/40 border ${adminPwdError ? 'border-red-500/70' : 'border-white/20'} rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-${neonColor} transition-colors`}
                style={adminPwdError ? {} : { boxShadow: adminPwdError ? 'none' : `inset 0 0 8px ${neonColor}10` }}
                value={adminPwdInput}
                autoFocus
                onChange={e => { setAdminPwdInput(e.target.value); setAdminPwdError(false); }}
                onKeyDown={e => { if (e.key === 'Enter') submitAdminPwd(); }}
                placeholder="••••••"
              />
              {adminPwdError && (
                <p className="text-[11px] text-red-400 mt-1.5 text-center">Mật khẩu không đúng</p>
              )}
              <button
                onClick={submitAdminPwd}
                className="w-full mt-3 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:brightness-110 active:scale-[.98]"
                style={{
                  background: `linear-gradient(135deg, ${neonColor}, ${neonColor}cc)`,
                  boxShadow: `0 4px 12px ${neonColor}40`,
                }}
              >
                Xác nhận
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== KPI NOTICE EDITOR MODAL ===== */}
      <AnimatePresence>
        {noticeOpen && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setNoticeOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl p-5 relative"
              style={{
                background: 'rgba(42, 46, 54, 0.96)',
                border: '1.5px solid #ffd70040',
                boxShadow: '0 20px 60px rgba(0,0,0,.6), 0 0 50px #ffd70020',
              }}
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            >
              <button
                onClick={() => setNoticeOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center text-center mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                  style={{ background: '#ffd70015', border: '1px solid #ffd70040', boxShadow: '0 0 12px #ffd70030' }}
                >
                  <Bell className="w-5 h-5" style={{ color: '#ffd700' }} />
                </div>
                <h3 className="text-base font-extrabold text-white">Thông báo KPI</h3>
                <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                  Nội dung nhập ở đây sẽ hiển thị như băng rôn chạy cuộn liên tục trên đầu trang KPI. Để trống để ẩn băng rôn.
                </p>
              </div>

              {/* Phía trên: nội dung thông báo (textarea) */}
              <textarea
                ref={noticeTextareaRef}
                className="w-full bg-black/40 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/30 outline-none focus:border-[#ffd700] transition-colors resize-y min-h-[120px] leading-relaxed"
                placeholder="Nhập nội dung thông báo… (hỗ trợ thẻ HTML: <b>, <i>, <u>)"
                value={noticeContent}
                onChange={e => setNoticeContent(e.target.value)}
                autoFocus
              />

              {/* Bên dưới ô nhập: thanh icon gợi ý định dạng (in đậm, in nghiêng, gạch chân) */}
              <div className="flex items-center gap-2 mt-2 mb-3 flex-wrap">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">Gợi ý định dạng:</span>
                <button
                  type="button"
                  onClick={() => wrapSelection('<b>', '</b>')}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}
                  title="In đậm (bọc chọn trong <b>…</b>)"
                  aria-label="In đậm"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection('<i>', '</i>')}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm italic transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}
                  title="In nghiêng (bọc chọn trong <i>…</i>)"
                  aria-label="In nghiêng"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => wrapSelection('<u>', '</u>')}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm underline transition-colors hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }}
                  title="Gạch chân (bọc chọn trong <u>…</u>)"
                  aria-label="Gạch chân"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                {/* Trạng thái bật/tắt hiện tại — small badge */}
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{
                    background: noticeEnabled ? '#16a34a30' : '#71717a30',
                    color: noticeEnabled ? '#86efac' : '#d4d4d8',
                    border: `1px solid ${noticeEnabled ? '#16a34a80' : '#71717a80'}`,
                  }}
                >
                  {noticeEnabled ? 'Đang bật' : 'Đang tắt'}
                </span>
              </div>

              {/* Preview nhỏ để admin thấy nội dung sẽ hiển thị */}
              {noticeContent.trim() && (
                <div className="mb-3">
                  <span className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Xem trước:</span>
                  <div
                    className="rounded-md px-3 py-1.5 text-[12px] font-bold overflow-hidden whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(90deg, #fff3c0 0%, #ffd966 50%, #fff3c0 100%)',
                      color: '#0b5d1f',
                      border: '1px solid #d4a017',
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: noticeContent }} />
                  </div>
                </div>
              )}

              {/* Nút lưu + nút bật/tắt thông báo */}
              <div className="flex items-center gap-2">
                <button
                  onClick={saveNotice}
                  disabled={noticeSaving}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700, #d4a017)',
                    boxShadow: '0 4px 12px #ffd70040',
                    color: '#3a2a00',
                  }}
                >
                  {noticeSaving ? 'Đang lưu…' : 'Lưu thông báo'}
                </button>
                <button
                  onClick={toggleNotice}
                  disabled={noticeSaving}
                  className="px-4 py-2.5 rounded-lg text-white text-sm font-bold transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-60"
                  style={{
                    background: noticeEnabled
                      ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                      : 'linear-gradient(135deg, #16a34a, #15803d)',
                    boxShadow: noticeEnabled ? '0 4px 12px #ef444440' : '0 4px 12px #16a34a40',
                  }}
                  title={noticeEnabled ? 'Tắt hiển thị thông báo' : 'Bật hiển thị thông báo'}
                >
                  {noticeEnabled ? 'Tắt thông báo' : 'Bật thông báo'}
                </button>
              </div>
              <p className="text-[10px] text-white/40 mt-2 text-center leading-relaxed">
                Mẹo: bôi đen đoạn chữ trong ô nhập rồi bấm icon để bọc nó bằng thẻ &lt;b&gt;, &lt;i&gt; hoặc &lt;u&gt;.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
