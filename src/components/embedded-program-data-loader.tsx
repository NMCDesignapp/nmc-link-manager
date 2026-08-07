'use client';

import { useEffect } from 'react';

const DETAIL_SELECTOR = [
  '[data-policy-table]',
  '[data-saoviet-table]',
  '[data-clb-saoviet-table]',
].join(',');

const OVERLAY_ID = 'nmc-program-data-loader';
const STYLE_ID = 'nmc-program-data-loader-style';
const PAGE_CLASS = 'nmc-kpi-linked-page';
const MIN_VISIBLE_MS = 420;
const EMPTY_STATE_GRACE_MS = 3_500;
const MAX_VISIBLE_MS = 15_000;
const EMPTY_STATE_PATTERN = /(chưa có|không có dữ liệu|không tìm thấy|dữ liệu trống|đang tải|vui lòng nhập|vui lòng cập nhật)/i;

type TableState = 'data' | 'empty' | 'none';

function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function findActiveDetail(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(DETAIL_SELECTOR));
  return candidates.find(isVisible) || null;
}

function detailKey(element: HTMLElement): string {
  return element.dataset.policyTable
    || element.dataset.saovietTable
    || element.dataset.clbSaovietTable
    || '';
}

function getTableState(detail: HTMLElement): TableState {
  const tables = Array.from(detail.querySelectorAll<HTMLTableElement>('table'));
  const visibleTables = tables.filter(isVisible);
  const tablesToCheck = visibleTables.length > 0 ? visibleTables : tables;
  let sawEmptyState = false;

  for (const table of tablesToCheck) {
    const bodyRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    for (const row of bodyRows) {
      const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>('td'));
      const onlyCell = cells.length === 1 ? cells[0] : null;
      const isPlaceholderRow = Boolean(
        onlyCell
        && (onlyCell.colSpan > 1 || onlyCell.hasAttribute('colspan'))
        && EMPTY_STATE_PATTERN.test(text),
      );

      if (isPlaceholderRow) {
        sawEmptyState = true;
        continue;
      }

      return 'data';
    }
  }

  return sawEmptyState ? 'empty' : 'none';
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes nmc-program-loader-segment {
      0%, 18% { opacity: .26; filter: brightness(.72); transform: scaleY(.82); }
      42%, 72% { opacity: 1; filter: brightness(1.28) drop-shadow(0 0 7px rgba(20, 221, 255, .72)); transform: scaleY(1); }
      100% { opacity: .42; filter: brightness(.86); transform: scaleY(.88); }
    }

    html.${PAGE_CLASS},
    body.${PAGE_CLASS} {
      min-height: 100% !important;
      background-color: #020914 !important;
      background-image:
        linear-gradient(180deg, rgba(1, 7, 17, .08), rgba(1, 8, 20, .18)),
        url('/kpi-tech-bg.webp') !important;
      background-repeat: no-repeat !important;
      background-position: center center !important;
      background-size: 100% 100% !important;
      background-attachment: fixed !important;
    }

    .${PAGE_CLASS} [data-policy-table],
    .${PAGE_CLASS} [data-saoviet-table],
    .${PAGE_CLASS} [data-clb-saoviet-table] {
      position: relative;
      z-index: 1;
    }

    #${OVERLAY_ID}.nmc-program-loader-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 22px;
      background:
        linear-gradient(180deg, rgba(0, 4, 11, .54), rgba(0, 5, 13, .72)),
        url('/kpi-tech-bg.webp') center center / 100% 100% no-repeat;
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      pointer-events: auto;
    }

    #${OVERLAY_ID} .nmc-program-loader-card {
      position: relative;
      width: min(92vw, 900px);
      min-height: 210px;
      display: grid;
      grid-template-columns: 190px minmax(0, 1fr);
      align-items: center;
      gap: 28px;
      padding: 24px 42px 24px 28px;
      overflow: hidden;
      border: 2px solid rgba(35, 210, 255, .92);
      border-radius: 30px;
      background:
        linear-gradient(112deg, rgba(8, 28, 52, .76), rgba(0, 5, 13, .91)),
        radial-gradient(circle at 19% 42%, rgba(25, 156, 255, .15), transparent 34%);
      box-shadow:
        0 0 0 1px rgba(57, 105, 156, .28),
        0 0 26px rgba(16, 165, 255, .24),
        inset 0 0 36px rgba(16, 123, 217, .12);
    }

    #${OVERLAY_ID} .nmc-program-loader-card::before,
    #${OVERLAY_ID} .nmc-program-loader-card::after {
      content: '';
      position: absolute;
      pointer-events: none;
    }

    #${OVERLAY_ID} .nmc-program-loader-card::before {
      inset: 0;
      background:
        linear-gradient(120deg, transparent 0 32%, rgba(40, 165, 255, .10) 33%, transparent 34% 100%),
        radial-gradient(circle at 100% 0%, rgba(41, 173, 255, .13), transparent 25%);
    }

    #${OVERLAY_ID} .nmc-program-loader-card::after {
      left: 32px;
      right: 32px;
      bottom: -1px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(31, 218, 255, .92), transparent);
      box-shadow: 0 0 10px rgba(22, 198, 255, .54);
    }

    #${OVERLAY_ID} .nmc-program-loader-logo {
      position: relative;
      z-index: 1;
      width: 168px;
      height: 168px;
      justify-self: center;
      border-radius: 50%;
      background: url('/kpi-tech-logo.webp') center / cover no-repeat;
      box-shadow:
        0 0 0 2px rgba(62, 215, 255, .58),
        0 0 20px rgba(22, 207, 255, .66),
        0 0 44px rgba(18, 98, 255, .30);
      filter: saturate(1.04);
    }

    #${OVERLAY_ID} .nmc-program-loader-logo::before {
      content: '';
      position: absolute;
      inset: -18px;
      z-index: -1;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(25, 218, 255, .34), rgba(22, 100, 255, .15) 42%, transparent 72%);
      filter: blur(10px);
    }

    #${OVERLAY_ID} .nmc-program-loader-content {
      position: relative;
      z-index: 1;
      min-width: 0;
      align-self: center;
    }

    #${OVERLAY_ID} .nmc-program-loader-title {
      color: #f3f6ff;
      font-family: Tahoma, Arial, Helvetica, sans-serif;
      font-size: clamp(30px, 4vw, 43px);
      line-height: 1.1;
      font-weight: 400;
      letter-spacing: .018em;
      text-shadow: 0 0 18px rgba(62, 170, 255, .16);
      white-space: nowrap;
    }

    #${OVERLAY_ID} .nmc-program-loader-progress {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 9px;
      width: min(100%, 650px);
      margin-top: 36px;
    }

    #${OVERLAY_ID} .nmc-program-loader-segment {
      height: 16px;
      border-radius: 4px;
      background: linear-gradient(90deg, #119dff, #13e7ec);
      box-shadow: 0 0 7px rgba(15, 195, 255, .30);
      transform-origin: center;
      animation: nmc-program-loader-segment 1.35s ease-in-out infinite;
    }

    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(2) { animation-delay: .08s; }
    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(3) { animation-delay: .16s; }
    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(4) { animation-delay: .24s; }
    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(5) { animation-delay: .32s; }
    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(6) { animation-delay: .40s; }
    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(7) { animation-delay: .48s; }
    #${OVERLAY_ID} .nmc-program-loader-segment:nth-child(8) { animation-delay: .56s; }

    @media (max-width: 640px) {
      html.${PAGE_CLASS},
      body.${PAGE_CLASS} {
        background-size: cover !important;
        background-position: center top !important;
      }

      #${OVERLAY_ID}.nmc-program-loader-overlay {
        padding: 14px;
        background-size: cover;
        background-position: center top;
      }

      #${OVERLAY_ID} .nmc-program-loader-card {
        width: min(95vw, 560px);
        min-height: 162px;
        grid-template-columns: 112px minmax(0, 1fr);
        gap: 16px;
        padding: 20px 18px 20px 15px;
        border-radius: 22px;
      }

      #${OVERLAY_ID} .nmc-program-loader-logo {
        width: 102px;
        height: 102px;
      }

      #${OVERLAY_ID} .nmc-program-loader-logo::before {
        inset: -12px;
      }

      #${OVERLAY_ID} .nmc-program-loader-title {
        font-size: clamp(21px, 6vw, 29px);
      }

      #${OVERLAY_ID} .nmc-program-loader-progress {
        gap: 5px;
        margin-top: 25px;
      }

      #${OVERLAY_ID} .nmc-program-loader-segment {
        height: 11px;
        border-radius: 3px;
      }
    }

    @media (max-width: 390px) {
      #${OVERLAY_ID} .nmc-program-loader-card {
        grid-template-columns: 94px minmax(0, 1fr);
        gap: 12px;
        padding-left: 12px;
        padding-right: 14px;
      }

      #${OVERLAY_ID} .nmc-program-loader-logo {
        width: 86px;
        height: 86px;
      }

      #${OVERLAY_ID} .nmc-program-loader-progress {
        gap: 4px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #${OVERLAY_ID} .nmc-program-loader-segment {
        animation-duration: 2.4s;
      }
    }
  `;
  document.head.appendChild(style);
}

function createOverlay(): HTMLElement {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing;

  ensureStyle();

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.className = 'nmc-program-loader-overlay';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Đang tải dữ liệu');

  const card = document.createElement('div');
  card.className = 'nmc-program-loader-card';

  const logo = document.createElement('div');
  logo.className = 'nmc-program-loader-logo';
  logo.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'nmc-program-loader-content';

  const title = document.createElement('div');
  title.className = 'nmc-program-loader-title';
  title.textContent = 'Đang tải dữ liệu';

  const progress = document.createElement('div');
  progress.className = 'nmc-program-loader-progress';
  progress.setAttribute('aria-hidden', 'true');

  for (let index = 0; index < 8; index += 1) {
    const segment = document.createElement('span');
    segment.className = 'nmc-program-loader-segment';
    progress.appendChild(segment);
  }

  content.append(title, progress);
  card.append(logo, content);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  return overlay;
}

export function EmbeddedProgramDataLoader(): null {
  useEffect(() => {
    if (window.location.pathname !== '/quan-ly') return;

    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }

    let openedFromKpi = false;
    try {
      const params = new URLSearchParams(window.location.search);
      openedFromKpi = params.get('from') === 'kpi' || sessionStorage.getItem('kpi_embed') === '1';
    } catch {}

    if (!isIframe && !openedFromKpi) return;

    ensureStyle();
    document.documentElement.classList.add(PAGE_CLASS);
    document.body.classList.add(PAGE_CLASS);

    let activeDetail: HTMLElement | null = null;
    let activeKey = '';
    let detailStartedAt = 0;
    let shownAt = 0;
    let dismissedKey = '';
    let hideTimer: number | null = null;
    let emptyGraceTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let frameOne: number | null = null;
    let frameTwo: number | null = null;

    const clearTimer = (timer: number | null) => {
      if (timer !== null) window.clearTimeout(timer);
    };

    const clearHideTimer = () => {
      clearTimer(hideTimer);
      hideTimer = null;
    };

    const clearEmptyGraceTimer = () => {
      clearTimer(emptyGraceTimer);
      emptyGraceTimer = null;
    };

    const clearFallbackTimer = () => {
      clearTimer(fallbackTimer);
      fallbackTimer = null;
    };

    const removeOverlay = () => {
      clearHideTimer();
      clearEmptyGraceTimer();
      clearFallbackTimer();
      document.getElementById(OVERLAY_ID)?.remove();
      shownAt = 0;
    };

    const hideAfterMinimumDuration = () => {
      if (!document.getElementById(OVERLAY_ID)) return;
      clearHideTimer();
      const elapsed = Date.now() - shownAt;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimer = window.setTimeout(removeOverlay, remaining);
    };

    const dismissCurrentDetail = () => {
      dismissedKey = activeKey;
      hideAfterMinimumDuration();
    };

    const showOverlay = () => {
      if (!document.getElementById(OVERLAY_ID)) {
        createOverlay();
        shownAt = Date.now();
      }
      if (fallbackTimer === null) {
        fallbackTimer = window.setTimeout(dismissCurrentDetail, MAX_VISIBLE_MS);
      }
    };

    const evaluate = () => {
      const nextDetail = findActiveDetail();
      if (!nextDetail) {
        activeDetail = null;
        activeKey = '';
        detailStartedAt = 0;
        dismissedKey = '';
        removeOverlay();
        return;
      }

      const nextKey = detailKey(nextDetail);
      const detailChanged = nextDetail !== activeDetail || nextKey !== activeKey;
      if (detailChanged) {
        activeDetail = nextDetail;
        activeKey = nextKey;
        detailStartedAt = Date.now();
        dismissedKey = '';
        clearEmptyGraceTimer();
        clearFallbackTimer();
      }

      const tableState = getTableState(nextDetail);
      if (tableState === 'data') {
        dismissedKey = '';
        hideAfterMinimumDuration();
        return;
      }

      if (dismissedKey === nextKey) {
        removeOverlay();
        return;
      }

      showOverlay();

      if (tableState === 'empty') {
        const elapsed = Date.now() - detailStartedAt;
        const remaining = Math.max(0, EMPTY_STATE_GRACE_MS - elapsed);
        if (remaining === 0) {
          dismissCurrentDetail();
        } else if (emptyGraceTimer === null) {
          emptyGraceTimer = window.setTimeout(() => {
            emptyGraceTimer = null;
            const currentDetail = findActiveDetail();
            if (currentDetail && detailKey(currentDetail) === activeKey && getTableState(currentDetail) === 'empty') {
              dismissCurrentDetail();
            }
          }, remaining);
        }
      } else {
        clearEmptyGraceTimer();
      }
    };

    const scheduleEvaluate = () => {
      if (frameOne !== null) window.cancelAnimationFrame(frameOne);
      if (frameTwo !== null) window.cancelAnimationFrame(frameTwo);
      frameOne = window.requestAnimationFrame(() => {
        frameOne = null;
        frameTwo = window.requestAnimationFrame(() => {
          frameTwo = null;
          evaluate();
        });
      });
    };

    const observer = new MutationObserver(scheduleEvaluate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-policy-table', 'data-saoviet-table', 'data-clb-saoviet-table'],
    });

    scheduleEvaluate();

    return () => {
      observer.disconnect();
      if (frameOne !== null) window.cancelAnimationFrame(frameOne);
      if (frameTwo !== null) window.cancelAnimationFrame(frameTwo);
      removeOverlay();
      document.documentElement.classList.remove(PAGE_CLASS);
      document.body.classList.remove(PAGE_CLASS);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
