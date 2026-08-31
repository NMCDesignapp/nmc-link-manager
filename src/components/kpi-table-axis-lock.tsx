'use client';

import { useEffect } from 'react';

import { findKpiHorizontalScroller } from '@/lib/kpi-table-scroller';

const ROOT_SELECTOR = [
  '.policy-detail-table-wrapper',
  '.saoviet-detail-table-wrapper',
  '.clbsv-detail-table-wrapper',
  '.contest-result-table-wrapper',
  '#result-table-container',
].join(',');

const normalizeText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const isEmbeddedKpiPage = () => document.documentElement.getAttribute('data-kpi-embed') === '1';

const markPinnedStt = (table: HTMLTableElement) => {
  table.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((el) => el.classList.remove('nmc-kpi-pin-stt'));
  const exactStt = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).find((cell) => {
    const text = normalizeText(cell.textContent);
    return text === 'STT' || text === 'TT' || text === '#';
  });
  if (!exactStt) return;

  exactStt.classList.add('nmc-kpi-pin-stt');
  const index = exactStt.cellIndex;
  Array.from(table.tBodies).forEach((body) => {
    Array.from(body.rows).forEach((row) => {
      const cell = row.cells[index];
      if (cell && cell.colSpan === 1) cell.classList.add('nmc-kpi-pin-stt');
    });
  });
};

export function KpiTableAxisLock() {
  useEffect(() => {
    const cleanups = new Map<HTMLElement, () => void>();
    let discoverTimer = 0;

    const bindScroller = (scroller: HTMLElement) => {
      if (cleanups.has(scroller)) return;
      scroller.classList.add('nmc-kpi-axis-lock');

      const syncPinnedColumn = () => {
        scroller.style.setProperty('--nmc-kpi-axis-scroll-left', `${scroller.scrollLeft || 0}px`);
      };

      // Let the browser own touch gestures completely. The previous manual
      // touchmove + momentum implementation competed with vertical page scroll
      // on Android/WebView and made diagonal/up-down swipes feel sticky.
      // We only mirror scrollLeft into a CSS variable for the pinned STT cell.
      scroller.addEventListener('scroll', syncPinnedColumn, { passive: true });
      syncPinnedColumn();

      cleanups.set(scroller, () => {
        scroller.classList.remove('nmc-kpi-axis-lock');
        scroller.style.removeProperty('--nmc-kpi-axis-scroll-left');
        scroller.removeEventListener('scroll', syncPinnedColumn);
      });
    };

    const discover = () => {
      if (!isEmbeddedKpiPage()) return;
      const alive = new Set<HTMLElement>();

      document.querySelectorAll<HTMLElement>(ROOT_SELECTOR).forEach((root) => {
        const table = root.querySelector<HTMLTableElement>('table:not([data-nmc-kpi-mirror-table])');
        if (!table || !table.tHead) return;
        markPinnedStt(table);
        const scroller = findKpiHorizontalScroller(root, table);
        if (!scroller) return;
        alive.add(scroller);
        bindScroller(scroller);
      });

      cleanups.forEach((cleanup, scroller) => {
        if (alive.has(scroller) && scroller.isConnected) return;
        cleanup();
        cleanups.delete(scroller);
      });
    };

    const schedule = () => {
      window.clearTimeout(discoverTimer);
      discoverTimer = window.setTimeout(discover, 100);
    };

    discover();
    const observer = new MutationObserver((mutations) => {
      const external = mutations.some((mutation) => {
        const node = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return !node?.closest('.nmc-kpi-filter-menu, .nmc-kpi-fixed-summary-bar');
      });
      if (external) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.clearTimeout(discoverTimer);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      cleanups.forEach((cleanup) => cleanup());
      cleanups.clear();
      document.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((el) => el.classList.remove('nmc-kpi-pin-stt'));
    };
  }, []);

  return null;
}
