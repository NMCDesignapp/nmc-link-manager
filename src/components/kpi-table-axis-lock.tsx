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

type PinnedTableEntry = {
  index: number;
  observer: IntersectionObserver | null;
  observedRows: Set<HTMLTableRowElement>;
  visibleRows: Set<HTMLTableRowElement>;
};

const clearPinnedBodyCells = (table: HTMLTableElement, entries: Map<HTMLTableElement, PinnedTableEntry>) => {
  const entry = entries.get(table);
  entry?.observer?.disconnect();
  entries.delete(table);
  Array.from(table.tBodies).forEach((body) => {
    body.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((cell) => cell.classList.remove('nmc-kpi-pin-stt'));
  });
};

const syncPinnedStt = (
  table: HTMLTableElement,
  entries: Map<HTMLTableElement, PinnedTableEntry>,
  pinBody: boolean,
) => {
  table.tHead?.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((el) => el.classList.remove('nmc-kpi-pin-stt'));
  const exactStt = Array.from(table.querySelectorAll<HTMLTableCellElement>('thead th')).find((cell) => {
    const text = normalizeText(cell.textContent);
    return text === 'STT' || text === 'TT' || text === '#';
  });
  if (!exactStt) {
    clearPinnedBodyCells(table, entries);
    return;
  }

  exactStt.classList.add('nmc-kpi-pin-stt');
  const index = exactStt.cellIndex;
  if (!pinBody) {
    clearPinnedBodyCells(table, entries);
    return;
  }

  let entry = entries.get(table);
  if (!entry || entry.index !== index) {
    clearPinnedBodyCells(table, entries);
    entry = {
      index,
      observer: null,
      observedRows: new Set(),
      visibleRows: new Set(),
    };

    if (typeof IntersectionObserver !== 'undefined') {
      entry.observer = new IntersectionObserver((observerEntries) => {
        observerEntries.forEach((observerEntry) => {
          const row = observerEntry.target as HTMLTableRowElement;
          const cell = row.cells[index];
          if (!cell || cell.colSpan !== 1) return;
          if (observerEntry.isIntersecting) entry?.visibleRows.add(row);
          else entry?.visibleRows.delete(row);
          cell.classList.toggle('nmc-kpi-pin-stt', observerEntry.isIntersecting);
        });
      }, { root: null, rootMargin: '240px 0px 240px 0px' });
    }
    entries.set(table, entry);
  }

  const rows = new Set(Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)));
  entry.observedRows.forEach((row) => {
    if (rows.has(row) && row.isConnected) return;
    entry?.observer?.unobserve(row);
    entry?.visibleRows.delete(row);
    row.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((cell) => cell.classList.remove('nmc-kpi-pin-stt'));
    entry?.observedRows.delete(row);
  });

  rows.forEach((row) => {
    const cell = row.cells[index];
    row.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((item) => {
      if (item !== cell) item.classList.remove('nmc-kpi-pin-stt');
    });
    if (!cell || cell.colSpan !== 1) return;

    if (!entry?.observer) {
      entry?.visibleRows.add(row);
      cell.classList.add('nmc-kpi-pin-stt');
      return;
    }

    if (!entry.observedRows.has(row)) {
      entry.observedRows.add(row);
      entry.observer.observe(row);
    } else if (entry.visibleRows.has(row)) {
      cell.classList.add('nmc-kpi-pin-stt');
    }
  });
};

export function KpiTableAxisLock() {
  useEffect(() => {
    const cleanups = new Map<HTMLElement, () => void>();
    const pinnedTables = new Map<HTMLTableElement, PinnedTableEntry>();
    let discoverTimer = 0;

    const bindScroller = (scroller: HTMLElement) => {
      if (cleanups.has(scroller)) return;
      scroller.classList.add('nmc-kpi-axis-lock');
      let lastScrollLeft = Number.NaN;

      const syncPinnedColumn = () => {
        const scrollLeft = Math.round(scroller.scrollLeft || 0);
        if (scrollLeft === lastScrollLeft) return;
        lastScrollLeft = scrollLeft;
        scroller.style.setProperty('--nmc-kpi-axis-scroll-left', `${scrollLeft}px`);
      };

      // Let the browser own touch gestures completely. The previous manual
      // touchmove + momentum implementation competed with vertical page scroll
      // on Android/WebView and made diagonal/up-down swipes feel sticky.
      // Only a real horizontal change updates the pinned STT offset; vertical
      // scrolling must not invalidate the styles of a large result table.
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
        const scroller = findKpiHorizontalScroller(root, table);
        if (!scroller) return;
        const canScrollHorizontally = scroller.scrollWidth > scroller.clientWidth + 2;
        // Pin only rows in/near the viewport. Hundreds of transformed/sticky TDs
        // create compositor tiles that flash grey on Android during fast pan.
        syncPinnedStt(table, pinnedTables, canScrollHorizontally);
        if (!canScrollHorizontally) return;
        alive.add(scroller);
        bindScroller(scroller);
      });

      pinnedTables.forEach((_entry, table) => {
        if (table.isConnected) return;
        clearPinnedBodyCells(table, pinnedTables);
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
      pinnedTables.forEach((_entry, table) => clearPinnedBodyCells(table, pinnedTables));
      pinnedTables.clear();
      document.querySelectorAll<HTMLElement>('.nmc-kpi-pin-stt').forEach((el) => el.classList.remove('nmc-kpi-pin-stt'));
    };
  }, []);

  return null;
}
