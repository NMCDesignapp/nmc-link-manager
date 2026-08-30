'use client';

import { useEffect } from 'react';

const WRAPPER_SELECTOR = [
  '.policy-detail-table-wrapper',
  '.saoviet-detail-table-wrapper',
  '.clbsv-detail-table-wrapper',
  '.contest-result-table-wrapper',
  '#result-table-container',
].join(',');

const isEmbedded = () => document.documentElement.getAttribute('data-kpi-embed') === '1';

const getScroller = (root: HTMLElement) => {
  const inner = root.querySelector<HTMLElement>('[data-slot="table-container"]');
  if (inner && inner.scrollWidth > inner.clientWidth + 2) return inner;
  return root;
};

const getUniqueRoots = () => {
  const seenTables = new Set<HTMLTableElement>();
  const roots: HTMLElement[] = [];

  document.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR).forEach((candidate) => {
    const table = candidate.querySelector<HTMLTableElement>('table');
    if (!table || seenTables.has(table) || candidate.getClientRects().length === 0) return;
    seenTables.add(table);
    roots.push(table.closest<HTMLElement>(WRAPPER_SELECTOR) || candidate);
  });

  return roots;
};

export function KpiScrollStabilityV2() {
  useEffect(() => {
    if (!isEmbedded()) return;

    let raf = 0;
    let mutationTimer = 0;

    const sync = () => {
      raf = 0;
      if (!isEmbedded()) return;

      const roots = getUniqueRoots();
      const overlays = Array.from(document.querySelectorAll<HTMLElement>('.nmc-kpi-sticky-header-overlay'));

      roots.forEach((root, index) => {
        const overlay = overlays[index];
        if (!overlay) return;
        const mirror = overlay.querySelector<HTMLElement>('table');
        if (!mirror) return;

        const scroller = getScroller(root);
        const x = scroller.scrollLeft || 0;

        // The legacy sticky helper writes translate3d() on every scroll. CSS v2
        // disables that transform; this 2D relative offset keeps columns aligned
        // without promoting the header to a separate GPU texture on Android.
        mirror.style.transform = 'none';
        mirror.style.left = `${-x}px`;
        mirror.style.marginLeft = '0';
      });
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(sync);
    };

    const onScroll = () => schedule();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });

    const observer = new MutationObserver(() => {
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(schedule, 40);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(mutationTimer);
      observer.disconnect();
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return null;
}
