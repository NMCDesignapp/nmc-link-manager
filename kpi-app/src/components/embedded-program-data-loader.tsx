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
const MAX_VISIBLE_MS = 15_000;

function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.getClientRects().length === 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function findActiveDetail(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(DETAIL_SELECTOR));
  return candidates.find(isVisible) || candidates.at(-1) || null;
}

function detailKey(element: HTMLElement): string {
  return element.dataset.policyTable
    || element.dataset.saovietTable
    || element.dataset.clbSaovietTable
    || '';
}

function hasRenderedTableData(detail: HTMLElement): boolean {
  const tables = Array.from(detail.querySelectorAll<HTMLTableElement>('table'));
  const visibleTables = tables.filter(isVisible);
  const tablesToCheck = visibleTables.length > 0 ? visibleTables : tables;

  return tablesToCheck.some((table) => {
    const bodyRows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    return bodyRows.some((row) => {
      const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
      return text.length > 0;
    });
  });
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

    let activeDetail: HTMLElement | null = null;
    let activeKey = '';
    let shownAt = 0;
    let hideTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let frameOne: number | null = null;
    let frameTwo: number | null = null;

    const clearHideTimer = () => {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = null;
    };

    const clearFallbackTimer = () => {
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    };

    const removeOverlay = () => {
      clearHideTimer();
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

    const showOverlay = () => {
      if (!document.getElementById(OVERLAY_ID)) {
        createOverlay();
        shownAt = Date.now();
      }
      clearFallbackTimer();
      fallbackTimer = window.setTimeout(removeOverlay, MAX_VISIBLE_MS);
    };

    const evaluate = () => {
      const nextDetail = findActiveDetail();
      if (!nextDetail) {
        activeDetail = null;
        activeKey = '';
        removeOverlay();
        return;
      }

      const nextKey = detailKey(nextDetail);
      const detailChanged = nextDetail !== activeDetail || nextKey !== activeKey;
      activeDetail = nextDetail;
      activeKey = nextKey;

      if (hasRenderedTableData(nextDetail)) {
        hideAfterMinimumDuration();
        return;
      }

      if (detailChanged || !document.getElementById(OVERLAY_ID)) {
        showOverlay();
      }
    };

    const scheduleEvaluate = () => {
      if (frameOne !== null) window.cancelAnimationFrame(frameOne);
      if (frameTwo !== null) window.cancelAnimationFrame(frameTwo);
      frameOne = window.requestAnimationFrame(() => {
        frameTwo = window.requestAnimationFrame(evaluate);
      });
    };

    const observer = new MutationObserver(scheduleEvaluate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
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
