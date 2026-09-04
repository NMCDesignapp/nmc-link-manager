'use client'

import { useEffect, useRef, useState } from 'react'

// Three clear beats with calm segments between them, matching the approved
// reference while keeping the signal usable as the real loading progress.
const ECG_PATH = 'M8 28 H64 L75 28 L84 21 L94 43 L107 9 L121 49 L135 28 H168 L178 28 L187 18 L197 40 L210 8 L224 47 L238 28 H278 L289 28 L299 18 L313 45 L327 10 L341 41 L350 28 H352'

export function KpiEntryGate() {
  const [gone, setGone] = useState(false)
  const gateRef = useRef<HTMLDivElement | null>(null)
  const brightPathRef = useRef<SVGPathElement | null>(null)
  const headRef = useRef<SVGCircleElement | null>(null)
  const endDotRef = useRef<HTMLSpanElement | null>(null)
  const progressTextRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (gone) return

    let raf = 0
    let finishRaf = 0
    let polling = 0
    let fadeTimer = 0
    let removeTimer = 0
    let progress = 4
    let finishing = false
    let seenLoader = false
    let pathLength = 0
    const startedAt = performance.now()

    const syncPathMetrics = () => {
      const path = brightPathRef.current
      if (!path) return 0
      if (!pathLength) pathLength = path.getTotalLength()
      path.style.strokeDasharray = `${pathLength}`
      return pathLength
    }

    const paint = (value: number) => {
      progress = Math.max(0, Math.min(100, value))
      if (progressTextRef.current) progressTextRef.current.textContent = `${Math.round(progress)}%`
      const path = brightPathRef.current
      const head = headRef.current
      const total = syncPathMetrics()
      if (!path || !head || !total) return

      const visibleLength = total * (progress / 100)
      path.style.strokeDashoffset = `${Math.max(0, total - visibleLength)}`

      const point = path.getPointAtLength(Math.max(0, Math.min(total, visibleLength)))
      head.setAttribute('cx', String(point.x))
      head.setAttribute('cy', String(point.y))
      head.style.opacity = progress > 0 && progress < 100 ? '1' : progress >= 100 ? '1' : '0'
    }

    const finish = () => {
      if (finishing) return
      finishing = true
      cancelAnimationFrame(raf)
      const from = progress
      const finishStartedAt = performance.now()
      const duration = 900

      const step = (now: number) => {
        const raw = Math.min(1, (now - finishStartedAt) / duration)
        const eased = raw < 0.5
          ? 4 * raw * raw * raw
          : 1 - Math.pow(-2 * raw + 2, 3) / 2
        paint(from + (100 - from) * eased)
        if (raw < 1) {
          finishRaf = requestAnimationFrame(step)
          return
        }
        headRef.current?.classList.add('is-arrived')
        endDotRef.current?.classList.add('is-arrived')
        gateRef.current?.classList.add('is-arrived')
        fadeTimer = window.setTimeout(() => gateRef.current?.classList.add('is-leaving'), 220)
        removeTimer = window.setTimeout(() => setGone(true), 680)
      }
      finishRaf = requestAnimationFrame(step)
    }

    const run = (now: number) => {
      if (finishing) return
      const elapsed = now - startedAt
      const t = Math.min(1, elapsed / 7600)
      const eased = 1 - Math.pow(1 - t, 2.15)
      paint(4 + 84 * eased)
      raf = requestAnimationFrame(run)
    }

    const inspectLoader = () => {
      const errorLoader = document.querySelector<HTMLElement>('[aria-label="Tải dữ liệu gặp lỗi"]')
      if (errorLoader) {
        setGone(true)
        return
      }
      const loader = document.querySelector<HTMLElement>('[aria-label="Đang tải dữ liệu KPI"]:not(#nmc-kpi-entry-gate)')
      if (loader) {
        seenLoader = true
        if (loader.style.opacity === '0' || loader.style.pointerEvents === 'none') finish()
        return
      }
      if (seenLoader) finish()
    }

    syncPathMetrics()
    paint(progress)
    raf = requestAnimationFrame(run)
    polling = window.setInterval(inspectLoader, 80)
    inspectLoader()

    const fallback = window.setTimeout(() => {
      if (!seenLoader && document.readyState === 'complete') finish()
    }, 3200)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(finishRaf)
      window.clearInterval(polling)
      window.clearTimeout(fallback)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(removeTimer)
    }
  }, [gone])

  if (gone) return null

  return (
    <div ref={gateRef} id="nmc-kpi-entry-gate" role="status" aria-live="polite" aria-label="Đang hoàn tất tải dữ liệu KPI">
      <style>{`
        #nmc-kpi-entry-gate {
          position: fixed; inset: 0; z-index: 2400; display: flex; align-items: center; justify-content: center;
          padding: 22px; overflow: hidden; background-color: #050a12;
          background-image: linear-gradient(180deg, rgba(2,7,15,.08), rgba(2,7,15,.03) 42%, rgba(2,7,15,.15)), url('/nmc-tech-bg-v3.webp');
          background-repeat: no-repeat; background-position: center top; background-size: cover;
          opacity: 1; transition: opacity .38s ease-out, visibility .38s ease-out; pointer-events: auto;
        }
        #nmc-kpi-entry-gate.is-leaving { opacity: 0; visibility: hidden; pointer-events: none; }
        #nmc-kpi-entry-gate .nmc-kpi-gate-card {
          position: relative; box-sizing: border-box; width: min(86vw, 390px); min-height: 300px; padding: 30px 28px 24px;
          overflow: hidden; border: 1.5px solid rgba(244,197,83,.96); border-radius: 23px;
          background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, rgba(0,0,0,.04) 1px 3px), linear-gradient(145deg, #e4e7ea 0%, #bdc2c7 18%, #8f969d 39%, #545b63 64%, #9ba1a8 82%, #d9dde1 100%);
          box-shadow: 0 28px 82px rgba(0,0,0,.66), inset 0 1px 0 rgba(255,255,255,.86), inset 0 -14px 30px rgba(18,22,27,.30), 0 0 0 1px rgba(255,218,119,.12), 0 0 30px rgba(244,197,83,.12);
          text-align: center;
        }
        #nmc-kpi-entry-gate .nmc-kpi-bolt {
          position: absolute; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #7b8289;
          background: radial-gradient(circle at 42% 38%, #e7eaed 0 21%, #495058 24% 47%, #c5c9cd 50% 67%, #656c73 70% 100%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,.68), 0 1px 3px rgba(0,0,0,.45);
        }
        #nmc-kpi-entry-gate .b1 { left: 13px; top: 13px; } #nmc-kpi-entry-gate .b2 { right: 13px; top: 13px; }
        #nmc-kpi-entry-gate .b3 { left: 13px; bottom: 13px; } #nmc-kpi-entry-gate .b4 { right: 13px; bottom: 13px; }
        #nmc-kpi-entry-gate .nmc-kpi-logo-shell {
          width: 94px; height: 94px; aspect-ratio: 1 / 1; margin: 0 auto 11px; overflow: hidden; border: 2px solid rgba(255,213,103,.95);
          border-radius: 50%; background: #06111b; box-shadow: 0 0 0 3px rgba(247,190,77,.12), 0 0 24px rgba(255,191,62,.25), inset 0 0 0 1px rgba(255,255,255,.15);
        }
        #nmc-kpi-entry-gate .nmc-kpi-logo-shell img {
          display: block; width: 100%; height: 100%; aspect-ratio: 1 / 1; object-fit: cover; object-position: center; border-radius: 50%; transform: scale(1.08); image-rendering: auto;
        }
        #nmc-kpi-entry-gate .nmc-kpi-gate-title {
          color: #ffcf5d; font: 900 27px/1.08 'Outfit', system-ui, sans-serif; letter-spacing: .07em;
          text-shadow: 0 1px 0 #fff0bd, 0 2px 2px rgba(54,35,8,.82), 0 0 8px rgba(255,193,48,.30);
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-stage { position: relative; width: min(100%, 310px); height: 58px; margin: 10px auto 0; }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-stage svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-groove path:first-child {
          fill: none; stroke: #1f2f35; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round;
          filter: drop-shadow(0 2px 1px rgba(0,0,0,.58));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-groove path + path {
          fill: none; stroke: #40565c; stroke-width: 4.2; stroke-linecap: round; stroke-linejoin: round; opacity: .86;
          filter: drop-shadow(0 -1px 0 rgba(255,255,255,.18)) drop-shadow(0 1px 0 rgba(0,0,0,.42));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-bright { overflow: visible; }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-bright path {
          fill: none; stroke: #16c99c; stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 1000; stroke-dashoffset: 1000; will-change: stroke-dashoffset;
          filter: drop-shadow(0 0 2px rgba(119,255,222,.92)) drop-shadow(0 0 6px rgba(22,201,156,.72));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-head {
          fill: #b9ffe9; stroke: #19d8a8; stroke-width: 1.1; opacity: 0; will-change: transform, opacity;
          filter: drop-shadow(0 0 3px rgba(190,255,238,1)) drop-shadow(0 0 8px rgba(20,215,168,.94));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-head.is-arrived {
          r: 4.6px;
          filter: drop-shadow(0 0 4px rgba(190,255,238,1)) drop-shadow(0 0 11px rgba(20,215,168,1)) drop-shadow(0 0 20px rgba(20,215,168,.66));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot {
          position: absolute; top: 50%; width: 7px; height: 7px; margin-top: -3.5px; border-radius: 50%; background: #708187;
          box-shadow: 0 0 0 1px rgba(27,43,48,.38); transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot.start { left: 0; background: #19c99c; box-shadow: 0 0 5px rgba(25,201,156,.82), 0 0 11px rgba(25,201,156,.32); }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot.end { right: 0; }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot.end.is-arrived, #nmc-kpi-entry-gate.is-arrived .nmc-kpi-ecg-dot.end {
          background: #75f4d0; transform: scale(1.18); box-shadow: 0 0 6px rgba(117,244,208,1), 0 0 16px rgba(22,201,156,.76);
        }
        #nmc-kpi-entry-gate .nmc-kpi-gate-progress {
          margin-top: -1px; color: #086d58; font: 900 13px/1.1 'Outfit', system-ui, sans-serif; letter-spacing: .04em;
          text-shadow: 0 1px 0 rgba(255,255,255,.35);
        }
        #nmc-kpi-entry-gate .nmc-kpi-gate-loading {
          margin-top: 6px; color: #e7efe9; font: italic 850 15px/1.25 'Outfit', system-ui, sans-serif; letter-spacing: .02em;
          -webkit-text-stroke: .25px rgba(44,34,19,.56);
          text-shadow: 0 2px 2px rgba(17,19,21,.96), 0 0 4px rgba(17,19,21,.70), 0 0 10px rgba(255,211,105,.16);
        }
        @media (max-width: 520px) {
          #nmc-kpi-entry-gate { padding: 18px; background-position: center top; }
          #nmc-kpi-entry-gate .nmc-kpi-gate-card { width: min(91vw, 374px); min-height: 286px; padding: 27px 24px 22px; }
          #nmc-kpi-entry-gate .nmc-kpi-logo-shell { width: 88px; height: 88px; }
          #nmc-kpi-entry-gate .nmc-kpi-gate-title { font-size: 24px; }
          #nmc-kpi-entry-gate .nmc-kpi-ecg-stage { height: 54px; margin-top: 11px; }
          #nmc-kpi-entry-gate .nmc-kpi-gate-loading { font-size: 14px; }
        }
      `}</style>
      <div className="nmc-kpi-gate-card">
        <span className="nmc-kpi-bolt b1" aria-hidden="true" /><span className="nmc-kpi-bolt b2" aria-hidden="true" />
        <span className="nmc-kpi-bolt b3" aria-hidden="true" /><span className="nmc-kpi-bolt b4" aria-hidden="true" />
        <div className="nmc-kpi-logo-shell" aria-hidden="true"><img src="/kpi-tech-logo.webp" alt="" /></div>
        <div className="nmc-kpi-gate-title">AN GIANG KPI</div>
        <div className="nmc-kpi-ecg-stage" aria-hidden="true">
          <svg className="nmc-kpi-ecg-groove" viewBox="0 0 360 56" preserveAspectRatio="none"><path d={ECG_PATH} /><path d={ECG_PATH} /></svg>
          <svg className="nmc-kpi-ecg-bright" viewBox="0 0 360 56" preserveAspectRatio="none">
            <path ref={brightPathRef} d={ECG_PATH} />
            <circle ref={headRef} className="nmc-kpi-ecg-head" r="3.7" cx="8" cy="28" />
          </svg>
          <span className="nmc-kpi-ecg-dot start" /><span ref={endDotRef} className="nmc-kpi-ecg-dot end" />
        </div>
        <div ref={progressTextRef} className="nmc-kpi-gate-progress">4%</div>
        <div className="nmc-kpi-gate-loading">Đang tải dữ liệu...</div>
      </div>
    </div>
  )
}
