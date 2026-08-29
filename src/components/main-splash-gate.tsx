'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { AlertCircle, RotateCw } from 'lucide-react'
import { useAppData } from '@/lib/app-data-context'

type Phase = 'loading' | 'finishing' | 'holding' | 'fading' | 'done'

type Point = { x: number; y: number }

const ECG_PATH = 'M10 32H72l10-8 9 14 12-27 15 40 14-19h52l10-9 10 16 13-27 15 39 13-19h50l10-8 10 14 14-26 15 38 13-18h48'

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Không thể tải dữ liệu')
  return response.json()
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

export function MainSplashGate() {
  const { isLoading, loadError, reload } = useAppData()
  const { data: links = [], isLoading: linksLoading, error: linksError } = useSWR('/api/links', fetcher, {
    fallbackData: [],
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  })

  const [phase, setPhase] = useState<Phase>('loading')
  const [progress, setProgress] = useState(4)
  const [head, setHead] = useState<Point>({ x: 10, y: 32 })
  const pathRef = useRef<SVGPathElement | null>(null)
  const mountedAtRef = useRef<number>(0)
  const completionQueuedRef = useRef(false)

  useEffect(() => {
    mountedAtRef.current = performance.now()
  }, [])

  const ready = !isLoading && !linksLoading
  const errorMessage = useMemo(() => {
    if (loadError) return loadError
    if (linksError instanceof Error) return linksError.message
    if (linksError) return 'Không thể tải danh sách liên kết'
    return null
  }, [loadError, linksError])

  /* Smooth pseudo-progress while actual data is still loading. It never reaches
     100 on its own; completion is only allowed after the real data is ready. */
  useEffect(() => {
    if (phase !== 'loading' || errorMessage) return

    let frame = 0
    const tick = (now: number) => {
      const elapsed = Math.max(0, now - mountedAtRef.current)
      const target = Math.min(92, 8 + 84 * (1 - Math.exp(-elapsed / 1550)))
      setProgress((current) => Math.max(current, target))
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, errorMessage])

  /* Data may finish immediately from cache. Keep a tiny minimum presence so the
     transition never flashes, then animate the remaining distance to exactly 100. */
  useEffect(() => {
    if (!ready || errorMessage || phase !== 'loading' || completionQueuedRef.current) return
    completionQueuedRef.current = true

    const elapsed = performance.now() - mountedAtRef.current
    const wait = Math.max(0, 520 - elapsed)
    const timer = window.setTimeout(() => setPhase('finishing'), wait)
    return () => window.clearTimeout(timer)
  }, [ready, errorMessage, phase])

  useEffect(() => {
    if (phase !== 'finishing') return

    const from = progress
    const started = performance.now()
    const duration = Math.max(560, Math.min(760, (100 - from) * 26))
    let frame = 0

    const tick = (now: number) => {
      const ratio = Math.min(1, (now - started) / duration)
      const eased = easeOutCubic(ratio)
      setProgress(from + (100 - from) * eased)

      if (ratio < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        setProgress(100)
        setPhase('holding')
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => {
    if (phase !== 'holding') return
    const timer = window.setTimeout(() => setPhase('fading'), 280)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = window.setTimeout(() => setPhase('done'), 560)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    const path = pathRef.current
    if (!path) return
    const length = path.getTotalLength()
    const point = path.getPointAtLength(length * Math.min(1, Math.max(0, progress / 100)))
    setHead({ x: point.x, y: point.y })
  }, [progress])

  const retry = useCallback(async () => {
    completionQueuedRef.current = false
    mountedAtRef.current = performance.now()
    setProgress(4)
    setPhase('loading')
    await Promise.allSettled([reload(), mutate('/api/links')])
  }, [reload])

  if (phase === 'done') return null

  const displayProgress = Math.min(100, Math.max(0, progress))
  const isReady = displayProgress >= 99.95

  return (
    <div
      className="nmc-main-splash-v2 fixed inset-0 z-[2200] flex items-center justify-center overflow-hidden p-4"
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-label={errorMessage ? 'Khởi động ứng dụng gặp lỗi' : 'Đang khởi động Main App'}
    >
      <div className="nmc-main-splash-plate">
        <span className="nmc-main-splash-screw s1" aria-hidden="true" />
        <span className="nmc-main-splash-screw s2" aria-hidden="true" />
        <span className="nmc-main-splash-screw s3" aria-hidden="true" />
        <span className="nmc-main-splash-screw s4" aria-hidden="true" />

        <div className="nmc-main-splash-logo" aria-label="NMC">
          <svg viewBox="0 0 220 76" aria-hidden="true">
            <defs>
              <linearGradient id="main-splash-metal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset=".48" stopColor="#e5eef2" />
                <stop offset="1" stopColor="#9db1bc" />
              </linearGradient>
              <linearGradient id="main-splash-mint" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#79efd6" />
                <stop offset="1" stopColor="#2cbcaf" />
              </linearGradient>
              <filter id="main-splash-shadow" x="-30%" y="-30%" width="160%" height="170%">
                <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#000000" floodOpacity=".55" />
              </filter>
            </defs>
            <g fill="none" stroke="url(#main-splash-metal)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" filter="url(#main-splash-shadow)">
              <path d="M24 56V20l35 36V20" />
              <path d="M82 56V20l22 26 22-26v36" />
              <path d="M194 28c-6-7-14-10-24-10-19 0-31 12-31 20s12 20 31 20c10 0 18-3 24-10" />
            </g>
            <circle cx="70.5" cy="38" r="4.5" fill="url(#main-splash-mint)" />
            <circle cx="135" cy="38" r="4.5" fill="url(#main-splash-mint)" />
          </svg>
        </div>

        <div className="nmc-main-splash-title">TRUNG TÂM ĐIỀU HÀNH NC-LINK</div>
        <div className="nmc-main-splash-subtitle">N·M·C&nbsp;&nbsp;•&nbsp;&nbsp;MAIN APP</div>

        {errorMessage ? (
          <div className="mt-6 flex flex-col items-center text-center">
            <AlertCircle className="h-7 w-7 text-amber-200" />
            <div className="mt-2 max-w-[280px] text-[11px] font-semibold text-amber-50">{errorMessage}</div>
            <button
              type="button"
              onClick={() => void retry()}
              className="mt-4 inline-flex items-center gap-2 border border-[#7fbcb8]/40 bg-[#23484b] px-4 py-2 text-xs font-black text-[#eafffb]"
            >
              <RotateCw className="h-3.5 w-3.5" /> Thử lại
            </button>
          </div>
        ) : (
          <>
            <div className="nmc-main-splash-ecg" aria-hidden="true">
              <svg viewBox="0 0 460 64">
                <defs>
                  <linearGradient id="main-ecg-live" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#0b5d49" />
                    <stop offset=".52" stopColor="#14785d" />
                    <stop offset="1" stopColor="#259a74" />
                  </linearGradient>
                </defs>
                <path
                  className="nmc-main-splash-groove"
                  d={ECG_PATH}
                  fill="none"
                  stroke="#26343b"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  ref={pathRef}
                  d={ECG_PATH}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="nmc-main-splash-live"
                  d={ECG_PATH}
                  fill="none"
                  stroke="url(#main-ecg-live)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={100}
                  strokeDasharray={100}
                  strokeDashoffset={100 - displayProgress}
                />
                <circle cx="10" cy="32" r="4" fill="#5bc6dc" opacity=".9" />
                <circle cx="450" cy="32" r="4" fill={isReady ? '#9ff9df' : '#5b6d75'} opacity={isReady ? 1 : .72} />
                <circle className="nmc-main-splash-head" cx={head.x} cy={head.y} r={isReady ? 4.8 : 4.2} fill="#9bf4df" />
              </svg>
            </div>
            <div className="nmc-main-splash-status">{isReady ? 'Sẵn sàng' : 'Đang tải dữ liệu...'}</div>
            <div className="nmc-main-splash-percent">{Math.round(displayProgress)}%</div>
          </>
        )}
      </div>
    </div>
  )
}
