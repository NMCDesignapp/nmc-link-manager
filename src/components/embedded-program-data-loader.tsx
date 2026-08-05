'use client';

import { useEffect } from 'react';

const DETAIL_SELECTOR = [
  '[data-policy-table]',
  '[data-saoviet-table]',
  '[data-clb-saoviet-table]',
].join(',');

const OVERLAY_ID = 'nmc-program-data-loader';
const STYLE_ID = 'nmc-program-data-loader-style';
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
    @keyframes nmc-program-loader-spin {
      to { transform: rotate(360deg); }
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
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-label', 'Đang tải dữ liệu');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    background: 'rgba(15, 23, 42, 0.84)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    pointerEvents: 'auto',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    minWidth: '210px',
    maxWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '22px 24px',
    border: '1px solid rgba(52, 211, 153, 0.5)',
    borderRadius: '14px',
    background: 'rgba(15, 23, 42, 0.96)',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.55), 0 0 24px rgba(16, 185, 129, 0.16)',
    textAlign: 'center',
  });

  const spinner = document.createElement('div');
  Object.assign(spinner.style, {
    width: '42px',
    height: '42px',
    borderRadius: '9999px',
    border: '4px solid rgba(52, 211, 153, 0.2)',
    borderTopColor: '#34d399',
    animation: 'nmc-program-loader-spin 0.8s linear infinite',
  });

  const title = document.createElement('div');
  title.textContent = 'Đang tải dữ liệu...';
  Object.assign(title.style, {
    color: '#d1fae5',
    fontSize: '15px',
    lineHeight: '1.35',
    fontWeight: '800',
    letterSpacing: '0.01em',
  });

  const note = document.createElement('div');
  note.textContent = 'Vui lòng chờ trong giây lát';
  Object.assign(note.style, {
    color: 'rgba(209, 250, 229, 0.72)',
    fontSize: '11px',
    lineHeight: '1.35',
  });

  card.append(spinner, title, note);
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
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}
