'use client';

import { useEffect, useMemo, useState } from 'react';

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
const ROTATE_MS = 7_500;

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
  return { text: `CÒN ${diff} NGÀY`, tone: diff <= 3 ? 'today' : 'active' };
}

export function KpiContestNotice() {
  const [items, setItems] = useState<ContestNotice[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

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
    if (sorted.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % sorted.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [sorted.length]);

  useEffect(() => {
    if (index >= sorted.length && sorted.length > 0) setIndex(0);
    setPosterFailed(false);
  }, [index, sorted.length]);

  // Preload only the next poster. The image endpoint itself is immutable-cached,
  // so continuous rotation does not repeatedly download the same poster.
  useEffect(() => {
    if (sorted.length <= 1) return;
    const next = sorted[(index + 1) % sorted.length];
    if (!next?.posterUrl) return;
    const img = new Image();
    img.src = next.posterUrl;
  }, [index, sorted]);

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
        <div className="kpi-contest-notice-card" key={current.id}>
          <div className="kpi-contest-poster-wrap">
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
          </div>

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

      <style jsx>{`
        .kpi-contest-notice {
          width: 100%;
          min-width: 0;
          min-height: 156px;
          margin: 10px 0 16px;
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
          min-height: 140px;
          display: grid;
          grid-template-columns: minmax(180px, 42%) minmax(0, 1fr);
          gap: 12px;
          animation: kpiContestNoticeIn .5s cubic-bezier(.22,1,.36,1);
        }
        @keyframes kpiContestNoticeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .kpi-contest-poster-wrap {
          min-width: 0;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
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
          object-fit: contain;
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
        @media (prefers-reduced-motion: reduce) {
          .kpi-contest-notice-card { animation: none; }
        }
      `}</style>
    </section>
  );
}
