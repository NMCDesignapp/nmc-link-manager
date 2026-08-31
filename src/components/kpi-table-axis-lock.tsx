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

type TouchState = {
  startX: number;
  startY: number;
  startScrollLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  axis: 'pending' | 'x' | 'y';
  momentumRaf: number;
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

      const state: TouchState = {
        startX: 0,
        startY: 0,
        startScrollLeft: 0,
        lastX: 0,
        lastTime: 0,
        velocity: 0,
        axis: 'pending',
        momentumRaf: 0,
      };

      const stopMomentum = () => {
        if (state.momentumRaf) cancelAnimationFrame(state.momentumRaf);
        state.momentumRaf = 0;
      };

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        stopMomentum();
        const touch = event.touches[0];
        state.startX = touch.clientX;
        state.startY = touch.clientY;
        state.startScrollLeft = scroller.scrollLeft;
        state.lastX = touch.clientX;
        state.lastTime = performance.now();
        state.velocity = 0;
        state.axis = 'pending';
      };

      const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 1) return;
        const touch = event.touches[0];
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;

        if (state.axis === 'pending') {
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 7) return;
          state.axis = Math.abs(dx) > Math.abs(dy) * 1.12 ? 'x' : 'y';
        }

        if (state.axis !== 'x') return;
        if (event.cancelable) event.preventDefault();

        const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        scroller.scrollLeft = Math.max(0, Math.min(max, state.startScrollLeft - dx));

        const now = performance.now();
        const dt = Math.max(8, now - state.lastTime);
        const instant = ((state.lastX - touch.clientX) / dt) * 16;
        state.velocity = state.velocity * 0.68 + instant * 0.32;
        state.lastX = touch.clientX;
        state.lastTime = now;
      };

      const onTouchEnd = () => {
        if (state.axis !== 'x' || Math.abs(state.velocity) < 0.35) {
          state.axis = 'pending';
          return;
        }

        let velocity = Math.max(-22, Math.min(22, state.velocity));
        const tick = () => {
          const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
          const before = scroller.scrollLeft;
          scroller.scrollLeft = Math.max(0, Math.min(max, before + velocity));
          velocity *= 0.91;
          const hitEdge = scroller.scrollLeft === before && (before <= 0 || before >= max);
          if (Math.abs(velocity) < 0.28 || hitEdge) {
            state.momentumRaf = 0;
            return;
          }
          state.momentumRaf = requestAnimationFrame(tick);
        };
        state.momentumRaf = requestAnimationFrame(tick);
        state.axis = 'pending';
      };

      scroller.addEventListener('touchstart', onTouchStart, { passive: true });
      scroller.addEventListener('touchmove', onTouchMove, { passive: false });
      scroller.addEventListener('touchend', onTouchEnd, { passive: true });
      scroller.addEventListener('touchcancel', onTouchEnd, { passive: true });
      scroller.addEventListener('scroll', syncPinnedColumn, { passive: true });
      syncPinnedColumn();

      cleanups.set(scroller, () => {
        stopMomentum();
        scroller.classList.remove('nmc-kpi-axis-lock');
        scroller.style.removeProperty('--nmc-kpi-axis-scroll-left');
        scroller.removeEventListener('touchstart', onTouchStart);
        scroller.removeEventListener('touchmove', onTouchMove);
        scroller.removeEventListener('touchend', onTouchEnd);
        scroller.removeEventListener('touchcancel', onTouchEnd);
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
