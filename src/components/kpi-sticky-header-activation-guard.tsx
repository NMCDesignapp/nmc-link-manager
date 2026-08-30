'use client';

import { useEffect } from 'react';

const WRAPPER_SELECTOR = [
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

const getSourceTable = (overlay: HTMLElement) => {
  const mirrorKey = normalizeText(overlay.querySelector('thead')?.textContent);
  if (!mirrorKey) return null;

  return Array.from(document.querySelectorAll<HTMLTableElement>(`${WRAPPER_SELECTOR} table:not([data-nmc-kpi-mirror-table])`))
    .filter((table) => table.tHead && table.getClientRects().length > 0 && normalizeText(table.tHead.textContent) === mirrorKey)
    .sort((a, b) => Math.abs(a.getBoundingClientRect().top) - Math.abs(b.getBoundingClientRect().top))[0] || null;
};

export function KpiStickyHeaderActivationGuard() {
  useEffect(() => {
    if (!isEmbeddedKpiPage()) return;

    let raf = 0;
    const enforce = () => {
      raf = 0;
      document.querySelectorAll<HTMLElement>('.nmc-kpi-sticky-header-overlay-v2').forEach((overlay) => {
        if (overlay.dataset.visible !== '1') return;

        const table = getSourceTable(overlay);
        const thead = table?.tHead;
        if (!table || !thead) {
          overlay.dataset.visible = '0';
          return;
        }

        const headRect = thead.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        const headerHasActuallyReachedTop = headRect.top <= 0;
        const tableStillVisible = tableRect.bottom > Math.max(headRect.height + 6, 30);

        // The mirror is only allowed to appear after the real header itself reaches
        // the top edge of the iframe viewport. This prevents it from floating over
        // the poster/filter while those elements are still on screen.
        if (!headerHasActuallyReachedTop || !tableStillVisible) {
          overlay.dataset.visible = '0';
        }
      });
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(enforce);
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'attributes' && mutation.attributeName === 'data-visible')) {
        schedule();
      }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-visible'] });

    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return null;
}
