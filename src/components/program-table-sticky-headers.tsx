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

const SUMMARY_RE = /(?:^|\s)TONG(?:\s|:)|TONG THUONG|TONG FYP|TONG DONG|TONG CONG/;

const isWarmSeparatorColor = (color: string) => {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return false;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return r >= 95 && r > g * 1.18 && r > b * 1.35 && g < 155;
};

const isEmbeddedKpiPage = () => document.documentElement.getAttribute('data-kpi-embed') === '1';

const isQuarterlyPolicyPage = () => {
  if (!isEmbeddedKpiPage()) return false;
  const text = normalizeText(document.body?.innerText?.slice(0, 50000));
  return /CHINH SACH 2026|THUONG QUY|NANG SUAT QUY/.test(text);
};

const findHorizontalScroller = (root: HTMLElement) => {
  if (root.scrollWidth > root.clientWidth + 2) return root;
  const inner = root.querySelector<HTMLElement>('[data-slot="table-container"]');
  if (inner && inner.scrollWidth > inner.clientWidth + 2) return inner;
  return root;
};

const findSummarySource = (root: HTMLElement, table: HTMLTableElement): HTMLElement | null => {
  const tfoot = table.querySelector<HTMLElement>('tfoot');
  if (tfoot && SUMMARY_RE.test(normalizeText(tfoot.textContent))) return tfoot;

  const rows = Array.from(table.querySelectorAll<HTMLElement>('tbody tr'));
  for (const row of rows.slice(-8).reverse()) {
    const text = normalizeText(row.textContent);
    if (text.length > 0 && text.length <= 280 && SUMMARY_RE.test(text)) return row;
  }

  const scope = root.parentElement;
  if (!scope) return null;
  const following = Array.from(scope.querySelectorAll<HTMLElement>('div, footer, section'))
    .filter((el) => el !== root && !root.contains(el))
    .filter((el) => Boolean(root.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))
    .filter((el) => {
      const text = normalizeText(el.textContent);
      if (!text || text.length > 260 || !SUMMARY_RE.test(text)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width >= Math.min(120, root.getBoundingClientRect().width * 0.55);
    });

  return following[0] || null;
};

const markQuarterlyPolicySeparators = (root: HTMLElement) => {
  if (!root.matches('.policy-detail-table-wrapper') || !isQuarterlyPolicyPage()) return;

  root.querySelectorAll<HTMLElement>('table tr').forEach((row) => {
    if (normalizeText(row.textContent)) return;
    const cells = Array.from(row.querySelectorAll<HTMLElement>('th, td'));
    if (!cells.length) return;

    const warm = [row, ...cells].some((el) => isWarmSeparatorColor(getComputedStyle(el).backgroundColor));
    if (warm) row.classList.add('nmc-policy-quarter-empty-separator');
  });
};

const makeTableMirror = (
  sourceTable: HTMLTableElement,
  section: HTMLElement,
  kind: 'header' | 'footer',
) => {
  const table = document.createElement('table');
  table.className = sourceTable.className;
  table.style.cssText = sourceTable.style.cssText;
  table.setAttribute('aria-hidden', 'true');
  table.setAttribute('data-nmc-kpi-mirror-table', kind);

  const colgroup = sourceTable.querySelector(':scope > colgroup');
  if (colgroup) table.appendChild(colgroup.cloneNode(true));

  if (kind === 'header') {
    table.appendChild(section.cloneNode(true));
  } else if (section.tagName === 'TR') {
    const body = document.createElement('tbody');
    body.appendChild(section.cloneNode(true));
    table.appendChild(body);
  } else {
    table.appendChild(section.cloneNode(true));
  }

  return table;
};

export function ProgramTableStickyHeaders() {
  useEffect(() => {
    const overlays = new Map<HTMLElement, {
      header: HTMLDivElement;
      footer: HTMLDivElement;
      summary: HTMLElement | null;
      table: HTMLTableElement;
      scroller: HTMLElement;
      headerSignature: string;
      footerSignature: string;
    }>();
    const listened = new Set<HTMLElement>();
    let raf = 0;

    const buildHeader = (entry: NonNullable<ReturnType<typeof overlays.get>>, thead: HTMLElement) => {
      const signature = thead.innerHTML;
      if (entry.headerSignature === signature && entry.header.firstElementChild) return;
      entry.header.replaceChildren(makeTableMirror(entry.table, thead, 'header'));
      entry.headerSignature = signature;
    };

    const buildFooter = (entry: NonNullable<ReturnType<typeof overlays.get>>, summary: HTMLElement | null) => {
      if (entry.summary && entry.summary !== summary) entry.summary.style.removeProperty('visibility');
      entry.summary = summary;
      if (!summary) {
        entry.footer.replaceChildren();
        entry.footerSignature = '';
        return;
      }

      const signature = `${summary.tagName}:${summary.innerHTML}`;
      if (entry.footerSignature === signature && entry.footer.firstElementChild) return;

      if (summary.tagName === 'TR' || summary.tagName === 'TFOOT') {
        entry.footer.replaceChildren(makeTableMirror(entry.table, summary, 'footer'));
      } else {
        const clone = summary.cloneNode(true) as HTMLElement;
        clone.removeAttribute('id');
        clone.setAttribute('aria-hidden', 'true');
        entry.footer.replaceChildren(clone);
      }
      entry.footerSignature = signature;
    };

    const ensureEntry = (root: HTMLElement, table: HTMLTableElement, thead: HTMLElement) => {
      let entry = overlays.get(root);
      const scroller = findHorizontalScroller(root);
      if (!entry) {
        const header = document.createElement('div');
        header.className = 'nmc-kpi-sticky-header-overlay';
        header.setAttribute('aria-hidden', 'true');

        const footer = document.createElement('div');
        footer.className = 'nmc-kpi-sticky-footer-overlay';
        footer.setAttribute('aria-hidden', 'true');

        document.body.append(header, footer);
        entry = {
          header,
          footer,
          summary: null,
          table,
          scroller,
          headerSignature: '',
          footerSignature: '',
        };
        overlays.set(root, entry);
      } else {
        entry.table = table;
        entry.scroller = scroller;
      }

      buildHeader(entry, thead);
      buildFooter(entry, findSummarySource(root, table));

      if (!listened.has(scroller)) {
        scroller.addEventListener('scroll', schedule, { passive: true });
        listened.add(scroller);
      }
      if (!listened.has(root)) {
        root.addEventListener('scroll', schedule, { passive: true });
        listened.add(root);
      }
      return entry;
    };

    const syncRoot = (root: HTMLElement) => {
      if (!isEmbeddedKpiPage()) return;
      const table = root.querySelector<HTMLTableElement>('table');
      const thead = table?.querySelector<HTMLElement>('thead');
      if (!table || !thead) return;

      root.classList.add('nmc-kpi-viewport-table');
      markQuarterlyPolicySeparators(root);

      const entry = ensureEntry(root, table, thead);
      const rootRect = root.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const headerRect = thead.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const viewportW = window.innerWidth || document.documentElement.clientWidth;

      if (rootRect.top < viewportH && rootRect.bottom > 0) {
        const available = Math.max(250, viewportH - Math.max(0, rootRect.top) - 2);
        const previous = Number(root.dataset.nmcKpiFloor || 0);
        if (available > previous + 2) {
          root.dataset.nmcKpiFloor = String(Math.round(available));
          root.style.setProperty('--nmc-kpi-table-floor', `${Math.round(available)}px`);
        }
      }

      const left = Math.max(0, rootRect.left);
      const width = Math.max(0, Math.min(rootRect.width, viewportW - left));
      const scrollLeft = entry.scroller.scrollLeft || root.scrollLeft || 0;
      const mirrorWidth = Math.max(table.scrollWidth, tableRect.width);

      entry.header.style.left = `${left}px`;
      entry.header.style.width = `${width}px`;
      const headerTable = entry.header.querySelector<HTMLElement>('table');
      if (headerTable) {
        headerTable.style.width = `${mirrorWidth}px`;
        headerTable.style.minWidth = `${mirrorWidth}px`;
        headerTable.style.transform = `translate3d(${-scrollLeft}px,0,0)`;
      }

      const pinHeader = rootRect.top <= 0 && rootRect.bottom > Math.max(80, headerRect.height + 32);
      entry.header.dataset.visible = pinHeader ? '1' : '0';

      const summary = findSummarySource(root, table);
      buildFooter(entry, summary);
      const footerVisible = Boolean(summary) && rootRect.top < viewportH - 36 && rootRect.bottom > 36;
      entry.footer.dataset.visible = footerVisible ? '1' : '0';

      if (summary) {
        if (footerVisible) summary.style.setProperty('visibility', 'hidden', 'important');
        else summary.style.removeProperty('visibility');
      }

      if (footerVisible) {
        entry.footer.style.left = `${left}px`;
        entry.footer.style.width = `${width}px`;
        const footerTable = entry.footer.querySelector<HTMLElement>('table');
        if (footerTable) {
          footerTable.style.width = `${mirrorWidth}px`;
          footerTable.style.minWidth = `${mirrorWidth}px`;
          footerTable.style.transform = `translate3d(${-scrollLeft}px,0,0)`;
        }
        requestAnimationFrame(() => {
          const footerHeight = Math.ceil(entry.footer.getBoundingClientRect().height || 0);
          if (footerHeight > 0) root.style.setProperty('--nmc-kpi-footer-space', `${footerHeight}px`);
        });
      } else {
        root.style.setProperty('--nmc-kpi-footer-space', '0px');
      }
    };

    const patch = () => {
      if (!isEmbeddedKpiPage()) {
        overlays.forEach((entry) => {
          entry.header.dataset.visible = '0';
          entry.footer.dataset.visible = '0';
          entry.summary?.style.removeProperty('visibility');
        });
        return;
      }

      document.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR).forEach(syncRoot);
    };

    function schedule() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(patch);
    }

    const resetFloors = () => {
      document.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR).forEach((root) => {
        delete root.dataset.nmcKpiFloor;
        root.style.removeProperty('--nmc-kpi-table-floor');
      });
      schedule();
    };

    patch();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', resetFloors, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', resetFloors);
      listened.forEach((el) => el.removeEventListener('scroll', schedule));
      overlays.forEach((entry, root) => {
        entry.summary?.style.removeProperty('visibility');
        entry.header.remove();
        entry.footer.remove();
        root.classList.remove('nmc-kpi-viewport-table');
        root.style.removeProperty('--nmc-kpi-table-floor');
        root.style.removeProperty('--nmc-kpi-footer-space');
      });
    };
  }, []);

  return (
    <style>{`
      /*
       * The three fixed detail wrappers keep their original geometry and colors.
       * Header pinning below is the native fallback; the client mirror handles
       * Android/WebView cases where a horizontal overflow ancestor breaks sticky.
       */
      .policy-detail-table-wrapper,
      .saoviet-detail-table-wrapper,
      .clbsv-detail-table-wrapper {
        position: relative !important;
        overflow: auto !important;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        isolation: isolate;
      }

      .policy-detail-table-wrapper [data-slot="table-container"],
      .saoviet-detail-table-wrapper [data-slot="table-container"] {
        position: static !important;
        width: max-content !important;
        min-width: 100% !important;
        overflow: visible !important;
      }

      .clbsv-detail-table-wrapper [data-slot="table-container"] {
        position: static !important;
        width: max-content !important;
        overflow: visible !important;
      }

      .policy-detail-table-wrapper table,
      .saoviet-detail-table-wrapper table {
        width: 100% !important;
        min-width: 100% !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }

      .clbsv-detail-table-wrapper table {
        width: max-content !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }

      .policy-detail-table-wrapper thead,
      .saoviet-detail-table-wrapper thead {
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 80 !important;
        transform: translateZ(0);
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.28);
      }

      .clbsv-detail-table-wrapper thead {
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 80 !important;
        transform: translateZ(0);
        box-shadow: 0 2px 0 #9dbdaf;
      }

      .policy-detail-table-wrapper thead th,
      .saoviet-detail-table-wrapper thead th,
      .clbsv-detail-table-wrapper thead th {
        position: static !important;
        z-index: auto !important;
        background-clip: padding-box;
      }

      .policy-detail-table-wrapper tbody,
      .saoviet-detail-table-wrapper tbody,
      .clbsv-detail-table-wrapper tbody {
        position: relative;
        z-index: 1;
      }
    `}</style>
  );
}
