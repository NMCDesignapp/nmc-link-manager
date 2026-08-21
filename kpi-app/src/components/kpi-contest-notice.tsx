'use client';

import { useEffect, useMemo, useState } from 'react';

// nmc-kpi-standalone-contest-notice-v2

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
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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
  if (start && start > today) return 1;
  if (end && end < today) return 2;
  return 0;
}

function endStatus(item: ContestNotice, today: number) {
  const start = dayStart(item.startDate);
  const end = dayStart(item.endDate);
  if (start && start > today) {
    const days = Math.max(1, Math.ceil((start - today) / DAY_MS));
    return { text: `BẮT ĐẦU SAU ${days} NGÀY`, tone: 'upcoming' } as const;
  }
  if (!end) return { text: 'ĐANG DIỄN RA', tone: 'active' } as const;
  const diff = Math.round((end - today) / DAY_MS);
  if (diff < 0) return { text: 'ĐÃ KẾT THÚC', tone: 'ended' } as const;
  if (diff === 0) return { text: 'HÔM NAY KẾT THÚC', tone: 'today' } as const;
  return { text: `CÒN ${diff} NGÀY`, tone: diff <= 3 ? 'today' : 'active' } as const;
}

export function KpiContestNotice() {
  const [items, setItems] = useState<ContestNotice[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => { cancelled = true; };
  }, []);

  const sorted = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();
    return [...items].sort((a, b) => {
      const rank = statusRank(a, today) - statusRank(b, today);
      if (rank !== 0) return rank;
      const aEnd = dayStart(a.endDate);
      const bEnd = dayStart(b.endDate);
      return statusRank(a, today) === 2 ? bEnd - aEnd : aEnd - bEnd;
    });
  }, [items]);

  useEffect(() => {
    if (sorted.length <= 1 || popupOpen) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % sorted.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [sorted.length, popupOpen]);

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

  useEffect(() => {
    if (sorted.length <= 1) return;
    const next = sorted[(index + 1) % sorted.length];
    if (!next?.posterUrl) return;
    const img = new Image();
    img.src = next.posterUrl;
  }, [index, sorted]);

  const current = sorted[index] || null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const status = current ? endStatus(current, today.getTime()) : null;

  return (
    <section className="kpi-contest-notice" aria-label="Thông báo chương trình thi đua">
      {loading ? (
        <div className="kpi-contest-state">Đang tải chương trình thi đua...</div>
      ) : failed ? (
        <div className="kpi-contest-state">Chưa tải được thông báo thi đua.</div>
      ) : !current ? (
        <div className="kpi-contest-state">Chưa có chương trình thi đua đã lưu.</div>
      ) : (
        <div className="kpi-contest-card" key={current.id}>
          <button
            type="button"
            className="kpi-contest-poster-wrap"
            onClick={() => setPopupOpen(true)}
            aria-label={`Xem poster lớn: ${current.title}`}
          >
            {!posterFailed ? (
              <img src={current.posterUrl} alt={`Poster ${current.title}`} className="kpi-contest-poster" onError={() => setPosterFailed(true)} draggable={false} />
            ) : (
              <div className="kpi-contest-poster-fallback"><span>★</span><strong>THI ĐUA</strong></div>
            )}
          </button>

          <div className="kpi-contest-copy">
            <div className="kpi-contest-eyebrow"><span>THÔNG BÁO THI ĐUA</span><span>{index + 1}/{sorted.length}</span></div>
            <div className="kpi-contest-title">{current.title}</div>
            <div className="kpi-contest-meta-grid">
              <div><span>Bắt đầu</span><strong>{formatDate(current.startDate)}</strong></div>
              <div><span>Đối tượng</span><strong>{targetLabel(current)}</strong></div>
            </div>
            <div className={`kpi-contest-end kpi-contest-end-${status?.tone || 'active'}`}>
              <div><span>KẾT THÚC THI ĐUA</span><strong>{formatDate(current.endDate)}</strong></div>
              <em>{status?.text}</em>
            </div>
          </div>
        </div>
      )}

      {popupOpen && current && (
        <div className="kpi-contest-modal-backdrop" data-kpi-contest-popup="true" onClick={() => setPopupOpen(false)}>
          <div className="kpi-contest-modal" role="dialog" aria-modal="true" aria-label={`Chi tiết chương trình ${current.title}`} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="kpi-contest-modal-close" onClick={() => setPopupOpen(false)} aria-label="Đóng">×</button>
            <div className="kpi-contest-modal-poster-stage">
              {!posterFailed ? (
                <img src={current.posterUrl} alt={`Poster lớn ${current.title}`} className="kpi-contest-modal-poster" onError={() => setPosterFailed(true)} draggable={false} />
              ) : (
                <div className="kpi-contest-modal-poster-fallback"><span>★</span><strong>THI ĐUA</strong></div>
              )}
            </div>
            <div className="kpi-contest-modal-info">
              <div className="kpi-contest-modal-kicker">THÔNG TIN CHƯƠNG TRÌNH</div>
              <h3>{current.title}</h3>
              <div className="kpi-contest-modal-meta">
                <div><span>Bắt đầu</span><strong>{formatDate(current.startDate)}</strong></div>
                <div><span>Đối tượng thi đua</span><strong>{targetLabel(current)}</strong></div>
              </div>
              <div className={`kpi-contest-modal-end kpi-contest-modal-end-${status?.tone || 'active'}`}>
                <div><span>KẾT THÚC THI ĐUA</span><strong>{formatDate(current.endDate)}</strong></div>
                <em>{status?.text}</em>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .kpi-contest-notice{width:100%;min-width:0;min-height:156px;margin:18px 0 16px;padding:7px;border:1px solid rgba(76,166,201,.42);border-radius:13px;background:linear-gradient(145deg,rgba(8,31,51,.96),rgba(5,19,35,.96));box-shadow:0 10px 26px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);overflow:hidden;grid-column:1/-1}
        .kpi-contest-card{width:100%;min-height:140px;display:grid;grid-template-columns:minmax(180px,42%) minmax(0,1fr);gap:12px;animation:kpiContestNoticeIn .96s cubic-bezier(.16,1,.3,1);will-change:opacity,transform}
        @keyframes kpiContestNoticeIn{from{opacity:0;transform:translateX(8px) scale(.997)}45%{opacity:.72}to{opacity:1;transform:translateX(0) scale(1)}}
        .kpi-contest-poster-wrap{appearance:none;font:inherit;cursor:zoom-in;min-width:0;height:140px;display:flex;align-items:center;justify-content:center;padding:0;border:1px solid rgba(230,189,85,.5);border-radius:9px;background:#020a12;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04),0 5px 14px rgba(0,0,0,.35);overflow:hidden}
        .kpi-contest-poster{display:block;width:100%;height:100%;object-fit:cover;border-radius:5px;user-select:none;-webkit-user-drag:none}
        .kpi-contest-poster-fallback,.kpi-contest-modal-poster-fallback{width:100%;height:100%;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;color:#f4d477;background:radial-gradient(circle at 50% 30%,#143c58,#061724 70%);letter-spacing:.12em;font-size:10px}
        .kpi-contest-copy{min-width:0;height:140px;display:flex;flex-direction:column;justify-content:space-between;padding:2px 3px 2px 0}
        .kpi-contest-eyebrow{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#76d7ec;font-size:8px;font-weight:900;letter-spacing:.13em}.kpi-contest-eyebrow span:last-child{color:#8da9ba}
        .kpi-contest-title{color:#f7fbff;font-size:13px;line-height:1.2;font-weight:900;text-transform:uppercase;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .kpi-contest-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.kpi-contest-meta-grid>div{min-width:0;padding:5px 7px;border-radius:7px;background:rgba(24,63,86,.56);border:1px solid rgba(92,160,191,.22)}.kpi-contest-meta-grid span{display:block;margin-bottom:2px;color:#80a8bd;font-size:7px;font-weight:800;text-transform:uppercase}.kpi-contest-meta-grid strong{display:block;color:#dff6ff;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .kpi-contest-end,.kpi-contest-modal-end{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border-radius:8px;border:1px solid rgba(241,201,95,.58);background:linear-gradient(135deg,rgba(120,77,15,.58),rgba(66,41,8,.42))}.kpi-contest-end span,.kpi-contest-modal-end span{display:block;margin-bottom:1px;color:#f5d788;font-size:7px;font-weight:900;letter-spacing:.09em}.kpi-contest-end strong{display:block;color:#fff2bd;font-size:14px;line-height:1;font-weight:900;white-space:nowrap}.kpi-contest-end em,.kpi-contest-modal-end em{flex:0 0 auto;padding:4px 6px;border-radius:999px;color:#c9ffdc;background:rgba(35,132,81,.32);border:1px solid rgba(93,219,145,.4);font-size:7px;font-weight:900;font-style:normal;white-space:nowrap}
        .kpi-contest-state{min-height:140px;display:grid;place-items:center;padding:20px;color:#84a5b7;font-size:10px;font-weight:700;font-style:italic;text-align:center}
        .kpi-contest-modal-backdrop{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(1,8,17,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
        .kpi-contest-modal{position:relative;width:min(640px,calc(100% - 16px));max-height:calc(100dvh - 44px);overflow:auto;border:1px solid rgba(96,191,220,.58);border-radius:14px;background:linear-gradient(160deg,#071a2b 0%,#07131f 60%,#0b1d2b 100%);box-shadow:0 28px 80px rgba(0,0,0,.62)}
        .kpi-contest-modal-close{position:absolute;z-index:2;top:8px;right:8px;width:32px;height:32px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:rgba(2,10,18,.8);color:#fff;font:700 22px/1 Arial,sans-serif;cursor:pointer}
        .kpi-contest-modal-poster-stage{width:100%;min-height:190px;display:flex;align-items:center;justify-content:center;background:#01070d;border-bottom:1px solid rgba(230,189,85,.35);overflow:hidden}.kpi-contest-modal-poster{display:block;width:100%;max-height:50dvh;object-fit:contain;user-select:none;-webkit-user-drag:none}.kpi-contest-modal-poster-fallback{min-height:220px}
        .kpi-contest-modal-info{padding:13px}.kpi-contest-modal-kicker{color:#79d9ed;font-size:9px;font-weight:900;letter-spacing:.14em}.kpi-contest-modal-info h3{margin:6px 0 11px;color:#f7fbff;font-size:clamp(16px,3.4vw,23px);line-height:1.18;font-weight:900;text-transform:uppercase}.kpi-contest-modal-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-bottom:8px}.kpi-contest-modal-meta>div{min-width:0;padding:8px 9px;border:1px solid rgba(92,160,191,.28);border-radius:9px;background:rgba(20,57,79,.62)}.kpi-contest-modal-meta span{display:block;margin-bottom:3px;color:#88aabd;font-size:8px;font-weight:900;text-transform:uppercase}.kpi-contest-modal-meta strong{color:#ecfaff;font-size:13px}.kpi-contest-modal-end{padding:9px 10px;border-radius:10px}.kpi-contest-modal-end span{font-size:8px}.kpi-contest-modal-end strong{display:block;color:#fff2bd;font-size:clamp(18px,4.5vw,24px);line-height:1;white-space:nowrap}.kpi-contest-modal-end em{padding:6px 8px;font-size:9px}
        @media(max-width:560px){.kpi-contest-notice{min-height:156px;padding:6px;border-radius:11px}.kpi-contest-card{min-height:142px;grid-template-columns:minmax(0,43%) minmax(0,57%);gap:8px}.kpi-contest-poster-wrap,.kpi-contest-copy{height:142px}.kpi-contest-title{font-size:10px}.kpi-contest-eyebrow{font-size:6.5px}.kpi-contest-meta-grid{gap:4px}.kpi-contest-meta-grid>div{padding:4px 5px}.kpi-contest-meta-grid span{font-size:6px}.kpi-contest-meta-grid strong{font-size:8px}.kpi-contest-end{gap:5px;padding:5px 6px}.kpi-contest-end span{font-size:5.8px}.kpi-contest-end strong{font-size:11.5px}.kpi-contest-end em{padding:3px 5px;font-size:5.8px}.kpi-contest-modal-backdrop{padding:10px}.kpi-contest-modal{width:min(94vw,560px);max-height:calc(100dvh - 28px)}.kpi-contest-modal-poster{max-height:44dvh}.kpi-contest-modal-info{padding:11px}.kpi-contest-modal-meta>div{padding:7px 8px}}
        @media(prefers-reduced-motion:reduce){.kpi-contest-card{animation:none}}
      `}</style>
    </section>
  );
}
