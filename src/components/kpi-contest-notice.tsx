'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

type ContestNotice = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  targetType: string;
  conditionType?: string | null;
  posterUrl: string;
};

const DAY_MS = 86_400_000;
const ROTATE_MS = 5_000;

function dayStart(value?: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function targetLabel(item: ContestNotice): string {
  if (item.targetType === 'nhom') return 'Nhóm';
  if (item.targetType === 'nyd') return 'NTD';
  const condition = String(item.conditionType || '').toLowerCase();
  if (condition.includes('tvv90')) return 'TVV90';
  if (condition.includes('tvvm')) return 'TVVm';
  return 'TVV';
}

function statusRank(item: ContestNotice, today: number): number {
  const start = dayStart(item.startDate);
  const end = dayStart(item.endDate);
  if (start && start > today) return 1; // upcoming
  if (end && end < today) return 2; // ended
  return 0; // running/unknown: show first
}

function endStatus(item: ContestNotice, today: number): { text: string; tone: 'active' | 'today' | 'ended' | 'upcoming' } {
  const start = dayStart(item.startDate);
  const end = dayStart(item.endDate);
  if (start && start > today) {
    const days = Math.max(1, Math.ceil((start - today) / DAY_MS));
    return { text: `BẮT ĐẦU SAU ${days} NGÀY`, tone: 'upcoming' };
  }
  if (!end) return { text: 'ĐANG DIỄN RA', tone: 'active' };
  const diff = Math.round((end - today) / DAY_MS);
  if (diff < 0) return { text: 'ĐÃ KẾT THÚC', tone: 'ended' };
  if (diff === 0) return { text: 'HÔM NAY KẾT THÚC', tone: 'today' };
  return { text: `CÒN ${diff} NGÀY`, tone: diff <= 2 ? 'today' : 'active' };
}

export function KpiContestNotice() {
  const [items, setItems] = useState<ContestNotice[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressPosterClickUntilRef = useRef(0);
  const [rotationNonce, setRotationNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/contest-notices');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const today = todayDate.getTime();
    return [...items].sort((a, b) => {
      const rankDiff = statusRank(a, today) - statusRank(b, today);
      if (rankDiff !== 0) return rankDiff;
      const aEnd = dayStart(a.endDate);
      const bEnd = dayStart(b.endDate);
      if (statusRank(a, today) === 2) return bEnd - aEnd; // most recently ended first
      return aEnd - bEnd; // nearest ending first for running/upcoming
    });
  }, [items]);

  useEffect(() => {
    if (sorted.length <= 1 || popupOpen) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % sorted.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [sorted.length, popupOpen, rotationNonce]);

  useEffect(() => {
    if (index >= sorted.length && sorted.length > 0) setIndex(0);
    setPosterFailed(false);
  }, [index, sorted.length]);

  useEffect(() => {
    if (!popupOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPopupOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [popupOpen]);

  // Preload only the next poster. The image endpoint itself is immutable-cached,
  // so continuous rotation does not repeatedly download the same poster.
  useEffect(() => {
    if (sorted.length <= 1) return;
    const next = sorted[(index + 1) % sorted.length];
    if (!next?.posterUrl) return;
    const img = new Image();
    img.src = next.posterUrl;
  }, [index, sorted]);

  const moveContest = (direction: -1 | 1) => {
    if (sorted.length <= 1) return;
    setIndex((currentIndex) => (currentIndex + direction + sorted.length) % sorted.length);
    setRotationNonce((value) => value + 1);
  };

  const handleSwipeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSwipeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) event.preventDefault();
  };

  const finishSwipe = (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || cancelled) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
    suppressPosterClickUntilRef.current = Date.now() + 450;
    moveContest(deltaX < 0 ? 1 : -1);
  };

  const current = sorted[index] || null;
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const status = current ? endStatus(current, todayDate.getTime()) : null;

  return (
    <section className="kpi-contest-notice" aria-label="Thông báo chương trình thi đua">
      {loading ? (
        <div className="kpi-contest-notice-state">Đang tải chương trình thi đua...</div>
      ) : failed ? (
        <div className="kpi-contest-notice-state">Chưa tải được thông báo thi đua.</div>
      ) : !current ? (
        <div className="kpi-contest-notice-state">Chưa có chương trình thi đua đã lưu.</div>
      ) : (
        <div
          className="kpi-contest-notice-card"
          key={current.id}
          data-kpi-contest-swipe="true"
          data-contest-index={index}
          aria-roledescription="carousel"
          aria-label={`Chương trình ${index + 1} trên ${sorted.length}. Kéo ngang để xem chương trình khác.`}
          onPointerDown={handleSwipeStart}
          onPointerMove={handleSwipeMove}
          onPointerUp={(event) => finishSwipe(event)}
          onPointerCancel={(event) => finishSwipe(event, true)}
        >
          <button
            type="button"
            className="kpi-contest-poster-wrap"
            onClick={() => { if (Date.now() >= suppressPosterClickUntilRef.current) setPopupOpen(true); }}
            aria-label={`Xem poster lớn: ${current.title}`}
            title="Bấm để xem poster lớn"
          >
            {!posterFailed ? (
              <img
                src={current.posterUrl}
                alt={`Poster ${current.title}`}
                className="kpi-contest-poster"
                onError={() => setPosterFailed(true)}
                draggable={false}
              />
            ) : (
              <div className="kpi-contest-poster-fallback" aria-label="Poster chưa sẵn sàng">
                <span>★</span>
                <strong>THI ĐUA</strong>
              </div>
            )}
          </button>

          <div className="kpi-contest-copy">
            <div className="kpi-contest-eyebrow">
              <span>THÔNG BÁO THI ĐUA</span>
              <span>{index + 1}/{sorted.length}</span>
            </div>
            <div className="kpi-contest-title" title={current.title}>{current.title}</div>
            <div className="kpi-contest-meta-grid">
              <div>
                <span className="kpi-contest-meta-label">Bắt đầu</span>
                <strong>{formatDate(current.startDate)}</strong>
              </div>
              <div>
                <span className="kpi-contest-meta-label">Đối tượng</span>
                <strong>{targetLabel(current)}</strong>
              </div>
            </div>
            <div className={`kpi-contest-end kpi-contest-end-${status?.tone || 'active'}`}>
              <div>
                <span>KẾT THÚC THI ĐUA</span>
                <strong>{formatDate(current.endDate)}</strong>
              </div>
              <em>{status?.text}</em>
            </div>
          </div>
        </div>
      )}

      {popupOpen && current && (
        <div
          className="kpi-contest-modal-backdrop"
          data-kpi-contest-popup="true"
          role="presentation"
          onClick={() => setPopupOpen(false)}
        >
          <div
            className="kpi-contest-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết chương trình ${current.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="kpi-contest-modal-close"
              onClick={() => setPopupOpen(false)}
              aria-label="Đóng chi tiết chương trình"
            >
              ×
            </button>

            <div className="kpi-contest-modal-poster-stage">
              {!posterFailed ? (
                <img
                  src={current.posterUrl}
                  alt={`Poster lớn ${current.title}`}
                  className="kpi-contest-modal-poster"
                  onError={() => setPosterFailed(true)}
                  draggable={false}
                />
              ) : (
                <div className="kpi-contest-modal-poster-fallback">
                  <span>★</span>
                  <strong>THI ĐUA</strong>
                </div>
              )}
            </div>

            <div className="kpi-contest-modal-info">
              <div className="kpi-contest-modal-kicker">THÔNG TIN CHƯƠNG TRÌNH</div>
              <h3>{current.title}</h3>
              <div className="kpi-contest-modal-meta">
                <div>
                  <span>Bắt đầu</span>
                  <strong>{formatDate(current.startDate)}</strong>
                </div>
                <div>
                  <span>Đối tượng thi đua</span>
                  <strong>{targetLabel(current)}</strong>
                </div>
              </div>
              <div className={`kpi-contest-modal-end kpi-contest-modal-end-${status?.tone || 'active'}`}>
                <div>
                  <span>KẾT THÚC THI ĐUA</span>
                  <strong>{formatDate(current.endDate)}</strong>
                </div>
                <em>{status?.text}</em>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .kpi-contest-notice {
          width: 100%;
          min-width: 0;
          min-height: 156px;
          margin: 18px 0 16px;
          padding: 7px;
          border: 1px solid rgba(76, 166, 201, .42);
          border-radius: 13px;
          background: linear-gradient(145deg, rgba(8, 31, 51, .96), rgba(5, 19, 35, .96));
          box-shadow: 0 10px 26px rgba(0, 0, 0, .3), inset 0 1px 0 rgba(255,255,255,.05);
          overflow: hidden;
          grid-column: 1 / -1;
        }
        .kpi-contest-notice-card {
          width: 100%;
          touch-action: pan-y;
          cursor: grab;
          user-select: none;
          min-height: 140px;
          display: grid;
          grid-template-columns: minmax(180px, 42%) minmax(0, 1fr);
          gap: 12px;
          animation: kpiContestNoticeIn .96s cubic-bezier(.16,1,.3,1); will-change: opacity, transform;
        }
        @keyframes kpiContestNoticeIn {
          from { opacity: 0; transform: translateX(8px) scale(.997); }
          45% { opacity: .72; }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        .kpi-contest-poster-wrap {
          appearance: none;
          font: inherit;
          cursor: zoom-in;
          min-width: 0;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(230, 189, 85, .5);
          border-radius: 9px;
          background: #020a12;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.04), 0 5px 14px rgba(0,0,0,.35);
          overflow: hidden;
        }
        .kpi-contest-poster {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 5px;
          user-select: none;
          -webkit-user-drag: none;
        }
        .kpi-contest-poster-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 5px;
          align-items: center;
          justify-content: center;
          color: #f4d477;
          background: radial-gradient(circle at 50% 30%, #143c58, #061724 70%);
          letter-spacing: .12em;
          font-size: 10px;
        }
        .kpi-contest-poster-fallback span { font-size: 24px; }
        .kpi-contest-poster-wrap:focus-visible {
          outline: 2px solid rgba(126, 220, 244, .95);
          outline-offset: 2px;
        }
        .kpi-contest-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 10050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          background: rgba(1, 8, 17, .86);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: kpiContestModalBackdropIn .24s ease-out both;
        }
        .kpi-contest-modal {
          position: relative;
          width: min(640px, calc(100% - 16px));
          max-height: calc(100dvh - 44px);
          overflow: auto;
          border: 1px solid rgba(96, 191, 220, .58);
          border-radius: 16px;
          background: linear-gradient(160deg, #071a2b 0%, #07131f 60%, #0b1d2b 100%);
          box-shadow: 0 28px 80px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.06);
          overscroll-behavior: contain;
          animation: kpiContestModalIn .34s cubic-bezier(.16,1,.3,1) both;
        }
        .kpi-contest-modal-close {
          position: absolute;
          z-index: 2;
          top: 10px;
          right: 10px;
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(255,255,255,.24);
          border-radius: 999px;
          background: rgba(2, 10, 18, .78);
          color: #fff;
          font: 700 25px/1 Arial, sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,.34);
        }
        .kpi-contest-modal-poster-stage {
          width: 100%;
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #01070d;
          border-bottom: 1px solid rgba(230, 189, 85, .35);
          overflow: hidden;
        }
        .kpi-contest-modal-poster {
          display: block;
          width: 100%;
          max-height: 50dvh;
          object-fit: cover;
          user-select: none;
          -webkit-user-drag: none;
        }
        .kpi-contest-modal-poster-fallback {
          width: 100%;
          min-height: 190px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #f4d477;
          background: radial-gradient(circle at 50% 30%, #143c58, #061724 72%);
          letter-spacing: .12em;
        }
        .kpi-contest-modal-poster-fallback span { font-size: 38px; }
        .kpi-contest-modal-info {
          padding: 13px;
        }
        .kpi-contest-modal-kicker {
          color: #79d9ed;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .kpi-contest-modal-info h3 {
          margin: 7px 0 14px;
          color: #f7fbff;
          font-size: clamp(16px, 3.4vw, 23px);
          line-height: 1.18;
          font-weight: 900;
          text-transform: uppercase;
        }
        .kpi-contest-modal-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
          margin-bottom: 10px;
        }
        .kpi-contest-modal-meta > div {
          min-width: 0;
          padding: 8px 9px;
          border: 1px solid rgba(92, 160, 191, .28);
          border-radius: 10px;
          background: rgba(20, 57, 79, .62);
        }
        .kpi-contest-modal-meta span,
        .kpi-contest-modal-end span {
          display: block;
          margin-bottom: 3px;
          color: #88aabd;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .kpi-contest-modal-meta strong {
          color: #ecfaff;
          font-size: 14px;
        }
        .kpi-contest-modal-end {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(241, 201, 95, .62);
          border-radius: 11px;
          background: linear-gradient(135deg, rgba(120, 77, 15, .62), rgba(66, 41, 8, .46));
          box-shadow: 0 0 20px rgba(241, 201, 95, .08);
        }
        .kpi-contest-modal-end span { color: #f5d788; }
        .kpi-contest-modal-end strong {
          display: block;
          color: #fff2bd;
          font-size: clamp(18px, 4.5vw, 24px);
          line-height: 1;
          white-space: nowrap;
        }
        .kpi-contest-modal-end em {
          flex: 0 0 auto;
          padding: 7px 9px;
          border: 1px solid rgba(93, 219, 145, .42);
          border-radius: 999px;
          background: rgba(35, 132, 81, .34);
          color: #c9ffdc;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          font-style: normal;
          white-space: nowrap;
        }
        .kpi-contest-modal-end-today {
          border-color: rgba(255, 140, 77, .78);
          background: linear-gradient(135deg, rgba(142, 59, 23, .67), rgba(74, 29, 10, .54));
        }
        .kpi-contest-modal-end-today em {
          color: #ffe1cc;
          border-color: rgba(255, 137, 85, .58);
          background: rgba(185, 63, 26, .44);
        }
        .kpi-contest-modal-end-ended {
          border-color: rgba(132, 153, 170, .4);
          background: rgba(39, 52, 64, .64);
        }
        .kpi-contest-modal-end-ended em {
          color: #c8d5df;
          border-color: rgba(159, 178, 193, .32);
          background: rgba(75, 92, 107, .42);
        }
        @keyframes kpiContestModalBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes kpiContestModalIn {
          from { opacity: 0; transform: translateY(12px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* nmc-kpi-contest-end-red-v1 */
        .kpi-contest-end {
          border-color: rgba(255, 92, 92, .86) !important;
          background: linear-gradient(135deg, #a51420 0%, #7f0f19 58%, #520911 100%) !important;
          box-shadow: 0 0 18px rgba(239, 68, 68, .18), inset 0 1px 0 rgba(255,255,255,.08) !important;
        }
        .kpi-contest-end span { color: #ffd983 !important; }
        .kpi-contest-end strong { color: #fff4e8 !important; }
        .kpi-contest-end-today {
          background: linear-gradient(135deg, #bb1723 0%, #8e101b 58%, #5b0a12 100%) !important;
        }
        /* nmc-kpi-contest-urgent-green-v1 */
        @keyframes kpiContestUrgentGreenSurface {
          0%, 100% {
            box-shadow: 0 0 10px rgba(34,197,94,.18), inset 0 1px 0 rgba(255,255,255,.06);
            border-color: rgba(255,92,92,.86);
          }
          50% {
            box-shadow: 0 0 24px rgba(34,197,94,.46), 0 0 0 1px rgba(74,222,128,.42), inset 0 1px 0 rgba(255,255,255,.10);
            border-color: rgba(74,222,128,.92);
          }
        }
        @keyframes kpiContestUrgentGreenDate {
          0%, 100% {
            opacity: .88;
            transform: scale(1);
            color: #a7f3c1;
            text-shadow: 0 0 5px rgba(34,197,94,.44);
          }
          50% {
            opacity: 1;
            transform: scale(1.045);
            color: #effff4;
            text-shadow: 0 0 7px #22c55e, 0 0 16px rgba(74,222,128,.96), 0 0 28px rgba(34,197,94,.68);
          }
        }
        .kpi-contest-end-today,
        .kpi-contest-modal-end-today {
          animation: kpiContestUrgentGreenSurface 1.8s ease-in-out infinite !important;
        }
        .kpi-contest-end-today strong,
        .kpi-contest-modal-end-today strong {
          display: inline-block !important;
          transform-origin: left center;
          animation: kpiContestUrgentGreenDate 1.15s ease-in-out infinite !important;
          color: #a7f3c1 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .kpi-contest-end-today,
          .kpi-contest-modal-end-today,
          .kpi-contest-end-today strong,
          .kpi-contest-modal-end-today strong { animation: none !important; }
        }
        @media (max-width: 560px) {
          .kpi-contest-modal-backdrop { padding: 8px; }
          .kpi-contest-modal {
            width: 100%;
            max-height: calc(100dvh - 16px);
            border-radius: 13px;
          }
          .kpi-contest-modal-poster { max-height: 52dvh; }
          .kpi-contest-modal-info { padding: 13px; }
          .kpi-contest-modal-meta { gap: 7px; }
          .kpi-contest-modal-end { align-items: flex-end; }
          .kpi-contest-modal-end strong { font-size: 21px; }
          .kpi-contest-modal-end em { font-size: 9px; padding: 6px 8px; }
        }
        .kpi-contest-copy {
          min-width: 0;
          height: 140px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2px 3px 2px 0;
        }
        .kpi-contest-eyebrow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #76d7ec;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .13em;
        }
        .kpi-contest-eyebrow span:last-child {
          color: #8da9ba;
          letter-spacing: .04em;
          flex: 0 0 auto;
        }
        .kpi-contest-title {
          color: #f7fbff;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 900;
          text-transform: uppercase;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-shadow: 0 2px 8px rgba(0,0,0,.4);
        }
        .kpi-contest-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .kpi-contest-meta-grid > div {
          min-width: 0;
          padding: 5px 7px;
          border-radius: 7px;
          background: rgba(24, 63, 86, .56);
          border: 1px solid rgba(92, 160, 191, .22);
        }
        .kpi-contest-meta-label {
          display: block;
          margin-bottom: 2px;
          color: #80a8bd;
          font-size: 7px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .kpi-contest-meta-grid strong {
          display: block;
          color: #dff6ff;
          font-size: 10px;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kpi-contest-end {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 8px;
          border: 1px solid rgba(241, 201, 95, .58);
          background: linear-gradient(135deg, rgba(120, 77, 15, .58), rgba(66, 41, 8, .42));
          box-shadow: 0 0 16px rgba(241, 201, 95, .09), inset 0 1px 0 rgba(255,255,255,.06);
        }
        .kpi-contest-end > div { min-width: 0; }
        .kpi-contest-end span {
          display: block;
          margin-bottom: 1px;
          color: #f5d788;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .09em;
        }
        .kpi-contest-end strong {
          display: block;
          color: #fff2bd;
          font-size: 14px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .02em;
          white-space: nowrap;
        }
        .kpi-contest-end em {
          flex: 0 0 auto;
          padding: 4px 6px;
          border-radius: 999px;
          color: #c9ffdc;
          background: rgba(35, 132, 81, .32);
          border: 1px solid rgba(93, 219, 145, .4);
          font-size: 7px;
          line-height: 1;
          font-weight: 900;
          font-style: normal;
          white-space: nowrap;
        }
        .kpi-contest-end-today {
          border-color: rgba(255, 140, 77, .72);
          background: linear-gradient(135deg, rgba(142, 59, 23, .64), rgba(74, 29, 10, .5));
          box-shadow: 0 0 18px rgba(255, 112, 56, .15), inset 0 1px 0 rgba(255,255,255,.06);
        }
        .kpi-contest-end-today em {
          color: #ffe1cc;
          background: rgba(185, 63, 26, .4);
          border-color: rgba(255, 137, 85, .55);
        }
        .kpi-contest-end-ended {
          border-color: rgba(132, 153, 170, .35);
          background: rgba(39, 52, 64, .56);
        }
        .kpi-contest-end-ended em {
          color: #c8d5df;
          background: rgba(75, 92, 107, .45);
          border-color: rgba(142, 161, 176, .35);
        }
        .kpi-contest-end-upcoming em {
          color: #d8ecff;
          background: rgba(40, 105, 166, .35);
          border-color: rgba(96, 170, 230, .45);
        }
        .kpi-contest-notice-state {
          min-height: 140px;
          display: grid;
          place-items: center;
          padding: 20px;
          color: #84a5b7;
          font-size: 10px;
          font-weight: 700;
          font-style: italic;
          text-align: center;
        }
        @media (min-width: 900px) {
          .kpi-contest-notice { min-height: 168px; margin: 10px 0 18px; padding: 8px; }
          .kpi-contest-notice-card { min-height: 150px; grid-template-columns: minmax(240px, 38%) minmax(0, 1fr); gap: 14px; }
          .kpi-contest-poster-wrap, .kpi-contest-copy { height: 150px; }
          .kpi-contest-title { font-size: 15px; }
          .kpi-contest-meta-grid strong { font-size: 11px; }
          .kpi-contest-end strong { font-size: 16px; }
          .kpi-contest-notice-state { min-height: 150px; }
        }
        @media (max-width: 560px) {
          .kpi-contest-notice {
            min-height: 156px;
            margin: 8px 0 14px;
            padding: 6px;
            border-radius: 11px;
          }
          .kpi-contest-notice-card {
            min-height: 142px;
            grid-template-columns: minmax(0, 43%) minmax(0, 57%);
            gap: 8px;
          }
          .kpi-contest-poster-wrap, .kpi-contest-copy { height: 142px; }
          .kpi-contest-poster-wrap { padding: 4px; border-radius: 8px; }
          .kpi-contest-title { font-size: 10px; line-height: 1.18; }
          .kpi-contest-eyebrow { font-size: 6.5px; letter-spacing: .09em; }
          .kpi-contest-meta-grid { gap: 4px; }
          .kpi-contest-meta-grid > div { padding: 4px 5px; }
          .kpi-contest-meta-label { font-size: 6px; }
          .kpi-contest-meta-grid strong { font-size: 8px; }
          .kpi-contest-end { gap: 5px; padding: 5px 6px; }
          .kpi-contest-end span { font-size: 5.8px; letter-spacing: .065em; }
          .kpi-contest-end strong { font-size: 11.5px; }
          .kpi-contest-end em { padding: 3px 5px; font-size: 5.8px; }
          .kpi-contest-notice-state { min-height: 142px; font-size: 9px; }
        }
        /* nmc-kpi-contest-honour-style-v2 */
        .kpi-contest-notice {
          border-color: rgba(255,215,107,.22) !important;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(255,215,107,.06) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 60%, rgba(192,132,252,.04) 0%, transparent 50%),
            linear-gradient(180deg, #0a0e1a 0%, #050810 100%) !important;
          box-shadow: 0 10px 28px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,215,107,.06), 0 0 18px rgba(255,215,107,.04) !important;
        }
        .kpi-contest-eyebrow { color: #ffd76b !important; }
        .kpi-contest-notice-card { align-items: center; }
        .kpi-contest-poster-wrap {
          aspect-ratio: 4 / 3 !important;
          height: auto !important;
          padding: 0 !important;
        }
        .kpi-contest-poster {
          width: 100% !important;
          height: 100% !important;
          object-fit: fill !important;
        }
        .kpi-contest-modal {
          width: min(560px, calc(100% - 40px)) !important;
          max-height: calc(100dvh - 72px) !important;
        }
        .kpi-contest-modal-poster-stage {
          width: 100% !important;
          aspect-ratio: 4 / 3 !important;
          min-height: 0 !important;
          height: auto !important;
        }
        .kpi-contest-modal-poster {
          width: 100% !important;
          height: 100% !important;
          max-height: none !important;
          object-fit: fill !important;
        }
        @keyframes kpiContestDeadlinePulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(255,150,70,.10), inset 0 1px 0 rgba(255,255,255,.06);
            border-color: rgba(255,140,77,.72);
          }
          50% {
            box-shadow: 0 0 26px rgba(255,128,46,.34), 0 0 0 1px rgba(255,194,92,.18), inset 0 1px 0 rgba(255,255,255,.10);
            border-color: rgba(255,190,92,.96);
          }
        }
        @keyframes kpiContestDeadlineTextPulse {
          0%, 100% { opacity: 1; transform: scale(1); text-shadow: 0 0 6px rgba(255,210,110,.16); }
          50% { opacity: .72; transform: scale(1.035); text-shadow: 0 0 14px rgba(255,190,80,.78); }
        }
        .kpi-contest-end-today {
          animation: kpiContestDeadlinePulse 1.8s ease-in-out infinite !important;
        }
        .kpi-contest-end-today strong {
          display: inline-block !important;
          transform-origin: left center;
          animation: kpiContestDeadlineTextPulse 1.35s ease-in-out infinite !important;
          color: #fff0a8 !important;
        }
        @media (max-width: 560px) {
          .kpi-contest-modal { width: calc(100% - 40px) !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kpi-contest-end-today,
          .kpi-contest-end-today strong { animation: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kpi-contest-notice-card { animation: none; }
        }
      `}</style>
    </section>
  );
}
