'use client'

import { useEffect, useRef, useState } from 'react'

const ECG_PATH = 'M8 28 H58 L70 28 L82 20 L92 35 L105 9 L118 45 L131 28 H160 L171 23 L182 32 L193 15 L205 40 L217 28 H246 L257 24 L268 31 L280 18 L291 36 L303 28 H352'

export function KpiEntryGate() {
  const [gone, setGone] = useState(false)
  const gateRef = useRef<HTMLDivElement | null>(null)
  const brightRef = useRef<SVGSVGElement | null>(null)
  const endDotRef = useRef<HTMLSpanElement | null>(null)

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
    const startedAt = performance.now()

    const paint = (value: number) => {
      progress = Math.max(0, Math.min(100, value))
      if (brightRef.current) {
        brightRef.current.style.clipPath = `inset(0 ${100 - progress}% 0 0)`
        brightRef.current.style.webkitClipPath = `inset(0 ${100 - progress}% 0 0)`
      }
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
        const eased = 1 - Math.pow(1 - raw, 3)
        paint(from + (100 - from) * eased)

        if (raw < 1) {
          finishRaf = requestAnimationFrame(step)
          return
        }

        endDotRef.current?.classList.add('is-arrived')
        gateRef.current?.classList.add('is-arrived')
        fadeTimer = window.setTimeout(() => gateRef.current?.classList.add('is-leaving'), 180)
        removeTimer = window.setTimeout(() => setGone(true), 620)
      }

      finishRaf = requestAnimationFrame(step)
    }

    const run = (now: number) => {
      if (finishing) return
      const elapsed = now - startedAt
      // Tiến dần tới 88% và không bao giờ chạm đích trước khi dữ liệu thật sẵn sàng.
      // Tải càng lâu thì chuyển động càng chậm dần, vẫn chỉ là một lượt duy nhất.
      const next = 4 + 84 * (1 - Math.exp(-elapsed / 7000))
      paint(Math.min(88, next))
      raf = requestAnimationFrame(run)
    }

    const inspectLoader = () => {
      const errorLoader = document.querySelector<HTMLElement>('[aria-label="Tải dữ liệu gặp lỗi"]')
      if (errorLoader) {
        setGone(true)
        return
      }

      const loader = document.querySelector<HTMLElement>('[aria-label="Đang tải dữ liệu KPI"]')
      if (loader) {
        seenLoader = true
        if (loader.style.opacity === '0' || loader.style.pointerEvents === 'none') finish()
        return
      }

      if (seenLoader) finish()
    }

    paint(progress)
    raf = requestAnimationFrame(run)
    polling = window.setInterval(inspectLoader, 80)
    inspectLoader()

    // Safety fallback: nếu hydration rất nhanh và loader gốc không kịp xuất hiện,
    // vẫn hoàn tất một lượt ECG rồi mới mở app thay vì giữ màn hình vô hạn.
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
    <div ref={gateRef} id="nmc-kpi-entry-gate" role="status" aria-live="polite" aria-label="Đang tải dữ liệu KPI">
      <style>{`
        #nmc-kpi-entry-gate {
          position: fixed;
          inset: 0;
          z-index: 2400;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
          overflow: hidden;
          background-color: #050a12;
          background-image:
            linear-gradient(180deg, rgba(2,7,15,.08), rgba(2,7,15,.03) 42%, rgba(2,7,15,.15)),
            url('/nmc-tech-bg-v3.webp');
          background-repeat: no-repeat;
          background-position: center top;
          background-size: cover;
          opacity: 1;
          transition: opacity .38s ease-out, visibility .38s ease-out;
          pointer-events: auto;
        }
        #nmc-kpi-entry-gate.is-leaving {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        #nmc-kpi-entry-gate .nmc-kpi-gate-card {
          position: relative;
          box-sizing: border-box;
          width: min(86vw, 390px);
          min-height: 300px;
          padding: 30px 28px 24px;
          overflow: hidden;
          border: 1.5px solid rgba(244,197,83,.96);
          border-radius: 23px;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, rgba(0,0,0,.04) 1px 3px),
            linear-gradient(145deg, #e4e7ea 0%, #bdc2c7 18%, #8f969d 39%, #545b63 64%, #9ba1a8 82%, #d9dde1 100%);
          box-shadow:
            0 28px 82px rgba(0,0,0,.66),
            inset 0 1px 0 rgba(255,255,255,.86),
            inset 0 -14px 30px rgba(18,22,27,.30),
            0 0 0 1px rgba(255,218,119,.12),
            0 0 30px rgba(244,197,83,.12);
          text-align: center;
        }
        #nmc-kpi-entry-gate .nmc-kpi-bolt {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 3px solid #7b8289;
          background: radial-gradient(circle at 42% 38%, #e7eaed 0 21%, #495058 24% 47%, #c5c9cd 50% 67%, #656c73 70% 100%);
          box-shadow: inset 0 1px 1px rgba(255,255,255,.68), 0 1px 3px rgba(0,0,0,.45);
        }
        #nmc-kpi-entry-gate .b1 { left: 13px; top: 13px; }
        #nmc-kpi-entry-gate .b2 { right: 13px; top: 13px; }
        #nmc-kpi-entry-gate .b3 { left: 13px; bottom: 13px; }
        #nmc-kpi-entry-gate .b4 { right: 13px; bottom: 13px; }
        #nmc-kpi-entry-gate .nmc-kpi-logo-shell {
          width: 94px;
          height: 94px;
          aspect-ratio: 1 / 1;
          margin: 0 auto 11px;
          overflow: hidden;
          border: 2px solid rgba(255,213,103,.95);
          border-radius: 50%;
          background: #06111b;
          box-shadow: 0 0 0 3px rgba(247,190,77,.12), 0 0 24px rgba(255,191,62,.25), inset 0 0 0 1px rgba(255,255,255,.15);
        }
        #nmc-kpi-entry-gate .nmc-kpi-logo-shell img {
          display: block;
          width: 100%;
          height: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          object-position: center;
          border-radius: 50%;
          transform: scale(1.08);
          image-rendering: auto;
        }
        #nmc-kpi-entry-gate .nmc-kpi-gate-title {
          color: #ffe09a;
          font: 900 27px/1.08 'Outfit', system-ui, sans-serif;
          letter-spacing: .07em;
          text-shadow: 0 1px 1px rgba(0,0,0,.65), 0 0 10px rgba(255,206,100,.18);
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-stage {
          position: relative;
          width: min(100%, 300px);
          height: 58px;
          margin: 13px auto 3px;
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-stage svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-groove path {
          fill: none;
          stroke: #3b3428;
          stroke-width: 5.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 1px 0 rgba(255,255,255,.12));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-groove path + path {
          stroke: #6a5a39;
          stroke-width: 2.2;
          opacity: .78;
          filter: none;
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-bright {
          clip-path: inset(0 96% 0 0);
          -webkit-clip-path: inset(0 96% 0 0);
          will-change: clip-path;
          filter: drop-shadow(0 0 3px rgba(255,214,111,.98)) drop-shadow(0 0 8px rgba(255,187,55,.82)) drop-shadow(0 0 15px rgba(255,174,35,.38));
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-bright path {
          fill: none;
          stroke: #ffd66f;
          stroke-width: 2.7;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 8px;
          margin-top: -4px;
          border-radius: 50%;
          background: #d7b35a;
          box-shadow: 0 0 0 1px rgba(73,58,29,.44);
          transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot.start {
          left: 0;
          background: #ffd66f;
          box-shadow: 0 0 5px rgba(255,214,111,.82), 0 0 11px rgba(255,186,50,.34);
        }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot.end { right: 0; }
        #nmc-kpi-entry-gate .nmc-kpi-ecg-dot.end.is-arrived,
        #nmc-kpi-entry-gate.is-arrived .nmc-kpi-ecg-dot.end {
          background: #ffe28d;
          transform: scale(1.18);
          box-shadow: 0 0 6px rgba(255,226,141,1), 0 0 16px rgba(255,184,43,.78), 0 0 26px rgba(255,174,30,.36);
        }
        #nmc-kpi-entry-gate .nmc-kpi-gate-loading {
          margin-top: 1px;
          color: #f8f9fb;
          font: italic 800 15px/1.25 'Outfit', system-ui, sans-serif;
          letter-spacing: .015em;
          text-shadow: 0 1px 2px rgba(0,0,0,.88);
        }
        @media (max-width: 520px) {
          #nmc-kpi-entry-gate { padding: 18px; background-position: center top; }
          #nmc-kpi-entry-gate .nmc-kpi-gate-card {
            width: min(91vw, 374px);
            min-height: 286px;
            padding: 27px 24px 22px;
          }
          #nmc-kpi-entry-gate .nmc-kpi-logo-shell { width: 88px; height: 88px; }
          #nmc-kpi-entry-gate .nmc-kpi-gate-title { font-size: 24px; }
          #nmc-kpi-entry-gate .nmc-kpi-ecg-stage { height: 54px; margin-top: 11px; }
          #nmc-kpi-entry-gate .nmc-kpi-gate-loading { font-size: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          #nmc-kpi-entry-gate { transition-duration: .2s; }
        }
      `}</style>

      <div className="nmc-kpi-gate-card">
        <span className="nmc-kpi-bolt b1" aria-hidden="true" />
        <span className="nmc-kpi-bolt b2" aria-hidden="true" />
        <span className="nmc-kpi-bolt b3" aria-hidden="true" />
        <span className="nmc-kpi-bolt b4" aria-hidden="true" />

        <div className="nmc-kpi-logo-shell" aria-hidden="true">
          <img src="/kpi-tech-logo.webp" alt="" />
        </div>

        <div className="nmc-kpi-gate-title">AN GIANG KPI</div>

        <div className="nmc-kpi-ecg-stage" aria-hidden="true">
          <svg className="nmc-kpi-ecg-groove" viewBox="0 0 360 56" preserveAspectRatio="none">
            <path d={ECG_PATH} />
            <path d={ECG_PATH} />
          </svg>
          <svg ref={brightRef} className="nmc-kpi-ecg-bright" viewBox="0 0 360 56" preserveAspectRatio="none">
            <path d={ECG_PATH} />
          </svg>
          <span className="nmc-kpi-ecg-dot start" />
          <span ref={endDotRef} className="nmc-kpi-ecg-dot end" />
        </div>

        <div className="nmc-kpi-gate-loading">Đang tải dữ liệu...</div>
      </div>
    </div>
  )
}
