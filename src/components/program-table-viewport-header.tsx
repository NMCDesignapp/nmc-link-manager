'use client';

import { useEffect } from 'react';

import { findKpiHorizontalScroller } from '@/lib/kpi-table-scroller';

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

const MIRRORED_CELL_PROPERTIES = [
  'background-color',
  'background-image',
  'background-position',
  'background-size',
  'background-repeat',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-shadow',
  'text-transform',
  'vertical-align',
  'white-space',
  'box-sizing',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-top-style',
  'border-top-color',
  'border-right-width',
  'border-right-style',
  'border-right-color',
  'border-bottom-width',
  'border-bottom-style',
  'border-bottom-color',
  'border-left-width',
  'border-left-style',
  'border-left-color',
] as const;

const copyHeaderCellPresentation = (source: HTMLTableCellElement, target: HTMLTableCellElement) => {
  const computed = getComputedStyle(source);
  MIRRORED_CELL_PROPERTIES.forEach((property) => {
    target.style.setProperty(property, computed.getPropertyValue(property), 'important');
  });

  const rect = source.getBoundingClientRect();
  if (rect.width > 1) {
    target.style.setProperty('width', `${rect.width}px`, 'important');
    target.style.setProperty('min-width', `${rect.width}px`, 'important');
    target.style.setProperty('max-width', `${rect.width}px`, 'important');
  }
  if (rect.height > 1) target.style.setProperty('height', `${rect.height}px`, 'important');
};

const getVerticalScrollAncestors = (node: HTMLElement) => {
  const result: HTMLElement[] = [];
  let parent = node.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 2) {
      result.push(parent);
    }
    parent = parent.parentElement;
  }

  const scrolling = document.scrollingElement;
  if (scrolling instanceof HTMLElement && !result.includes(scrolling)) result.push(scrolling);
  if (!result.includes(document.body)) result.push(document.body);
  if (!result.includes(document.documentElement)) result.push(document.documentElement);
  return result;
};

const getStickyViewportTop = (root: HTMLElement) => {
  const scrollOwner = getVerticalScrollAncestors(root)[0];
  const documentScrollers = [document.body, document.documentElement, document.scrollingElement];
  if (!scrollOwner || documentScrollers.includes(scrollOwner)) return 0;
  return Math.max(0, scrollOwner.getBoundingClientRect().top);
};

const makeHeaderMirror = (sourceTable: HTMLTableElement, sourceHead: HTMLTableSectionElement) => {
  const table = document.createElement('table');
  table.className = sourceTable.className;
  table.style.cssText = sourceTable.style.cssText;
  table.setAttribute('aria-hidden', 'true');
  table.setAttribute('data-nmc-kpi-mirror-table', 'header');

  const colgroup = sourceTable.querySelector(':scope > colgroup');
  if (colgroup) table.appendChild(colgroup.cloneNode(true));

  const head = sourceHead.cloneNode(true) as HTMLTableSectionElement;
  head.querySelectorAll<HTMLElement>('.nmc-kpi-native-sticky-cell').forEach((cell) => {
    cell.classList.remove('nmc-kpi-native-sticky-cell');
    cell.style.removeProperty('--nmc-kpi-sticky-top');
    cell.style.removeProperty('--nmc-kpi-sticky-z');
    cell.style.removeProperty('--nmc-kpi-sticky-bg');
  });
  table.appendChild(head);
  return table;
};

type Entry = {
  root: HTMLElement;
  table: HTMLTableElement;
  thead: HTMLTableSectionElement;
  scroller: HTMLElement;
  overlay: HTMLDivElement;
  signature: string;
};

export function ProgramTableViewportHeader() {
  useEffect(() => {
    const entries = new Map<HTMLTableElement, Entry>();
    const listened = new Map<HTMLElement, () => void>();
    let discoverTimer = 0;
    let geometryRaf = 0;

    const scheduleGeometry = () => {
      if (geometryRaf) return;
      geometryRaf = requestAnimationFrame(() => {
        geometryRaf = 0;
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

        entries.forEach((entry) => {
          if (!entry.table.isConnected || !entry.root.isConnected) return;

          const rootRect = entry.root.getBoundingClientRect();
          const tableRect = entry.table.getBoundingClientRect();
          const headRect = entry.thead.getBoundingClientRect();
          const scrollLeft = entry.scroller.scrollLeft || 0;
          // Keep the mirror on the table's real content edge. Several KPI tables
          // have a small inset inside their wrapper; anchoring to the wrapper made
          // the mirrored STT column drift a few pixels to the left.
          const tableContentLeft = tableRect.left + scrollLeft;
          const firstHeadCell = entry.thead.querySelector<HTMLTableCellElement>('th');
          const firstHeadText = normalizeText(firstHeadCell?.textContent);
          const pinnedSttLeft = firstHeadCell && (firstHeadText === 'STT' || firstHeadText === 'TT' || firstHeadText === '#')
            ? firstHeadCell.getBoundingClientRect().left
            : tableContentLeft;
          const left = Math.max(0, rootRect.left, tableContentLeft, pinnedSttLeft);
          const right = Math.min(viewportWidth, rootRect.right);
          const width = Math.max(0, right - left);
          const stickyTop = getStickyViewportTop(entry.root);

          entry.overlay.style.left = `${left}px`;
          entry.overlay.style.width = `${width}px`;
          entry.overlay.style.height = `${headRect.height}px`;
          entry.overlay.style.setProperty('top', `${stickyTop}px`, 'important');
          entry.overlay.style.setProperty('--nmc-kpi-mirror-scroll-left', `${scrollLeft}px`);

          const mirrorTable = entry.overlay.querySelector<HTMLElement>('table');
          if (mirrorTable) mirrorTable.style.left = `${-scrollLeft}px`;

          // Anchor the mirror to the active vertical scrollport. The normal mobile
          // path uses the management viewport (top: 0). A legacy nested scroller
          // falls back to its own top edge, so the mirror never covers the poster.
          const headerHasReachedTop = tableRect.top <= stickyTop;
          const tableStillVisible = tableRect.bottom > stickyTop + Math.max(headRect.height + 6, 30);
          entry.overlay.dataset.visible = headerHasReachedTop && tableStillVisible ? '1' : '0';
        });
      });
    };

    const listen = (element: HTMLElement) => {
      if (listened.has(element)) return;
      const handler = () => scheduleGeometry();
      element.addEventListener('scroll', handler, { passive: true });
      listened.set(element, () => element.removeEventListener('scroll', handler));
    };

    const buildMirror = (entry: Entry) => {
      const signature = `${entry.table.className}|${entry.thead.innerHTML}`;
      if (entry.signature !== signature || !entry.overlay.firstElementChild) {
        entry.overlay.replaceChildren(makeHeaderMirror(entry.table, entry.thead));
        entry.signature = signature;
      }

      const mirrorTable = entry.overlay.querySelector<HTMLTableElement>('table');
      if (!mirrorTable) return;
      const tableWidth = Math.max(entry.table.scrollWidth, entry.table.getBoundingClientRect().width);
      const sourceTableStyle = getComputedStyle(entry.table);
      mirrorTable.style.setProperty('width', `${tableWidth}px`, 'important');
      mirrorTable.style.setProperty('min-width', `${tableWidth}px`, 'important');
      mirrorTable.style.setProperty('border-collapse', sourceTableStyle.borderCollapse, 'important');
      mirrorTable.style.setProperty('border-spacing', sourceTableStyle.borderSpacing, 'important');
      mirrorTable.style.setProperty('table-layout', sourceTableStyle.tableLayout, 'important');

      const sourceCells = Array.from(entry.thead.querySelectorAll<HTMLTableCellElement>('th'));
      const mirrorCells = Array.from(mirrorTable.querySelectorAll<HTMLTableCellElement>('th'));
      sourceCells.forEach((source, index) => {
        const target = mirrorCells[index];
        if (!target) return;
        copyHeaderCellPresentation(source, target);
        const text = normalizeText(source.textContent);
        if (text === 'STT' || text === 'TT' || text === '#') target.classList.add('nmc-kpi-mirror-pin-stt');
      });
    };

    const discover = () => {
      discoverTimer = 0;
      if (!isEmbeddedKpiPage()) {
        entries.forEach((entry) => { entry.overlay.dataset.visible = '0'; });
        return;
      }

      const seen = new Set<HTMLTableElement>();
      document.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR).forEach((candidate) => {
        const table = candidate.querySelector<HTMLTableElement>('table:not([data-nmc-kpi-mirror-table])');
        const thead = table?.tHead;
        if (!table || !thead || seen.has(table)) return;
        if (table.getClientRects().length === 0) return;
        seen.add(table);

        const root = table.closest<HTMLElement>(WRAPPER_SELECTOR) || candidate;
        const scroller = findKpiHorizontalScroller(root, table);
        let entry = entries.get(table);
        if (!entry) {
          const overlay = document.createElement('div');
          overlay.className = 'nmc-kpi-sticky-header-overlay nmc-kpi-sticky-header-overlay-v2';
          overlay.setAttribute('aria-hidden', 'true');
          document.body.appendChild(overlay);
          entry = { root, table, thead, scroller, overlay, signature: '' };
          entries.set(table, entry);
        } else {
          entry.root = root;
          entry.thead = thead;
          entry.scroller = scroller;
        }

        buildMirror(entry);
        listen(scroller);
        getVerticalScrollAncestors(root).forEach(listen);
      });

      entries.forEach((entry, table) => {
        if (seen.has(table)) return;
        entry.overlay.remove();
        entries.delete(table);
      });
      scheduleGeometry();
    };

    const scheduleDiscover = () => {
      window.clearTimeout(discoverTimer);
      discoverTimer = window.setTimeout(discover, 100);
    };

    const handleRowClick = (event: MouseEvent) => {
      if (!isEmbeddedKpiPage()) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('button, input, select, textarea, a, [role="button"]')) return;
      const row = target.closest<HTMLTableRowElement>('tbody tr');
      if (!row || !row.closest(WRAPPER_SELECTOR)) return;
      if (row.classList.contains('nmc-kpi-original-summary-row') || row.classList.contains('nmc-policy-quarter-empty-separator')) return;
      if (!normalizeText(row.textContent)) return;

      row.closest('tbody')?.querySelectorAll<HTMLElement>('.nmc-kpi-row-selected').forEach((item) => item.classList.remove('nmc-kpi-row-selected'));
      row.classList.add('nmc-kpi-row-selected');
    };

    discover();
    const observer = new MutationObserver((mutations) => {
      const external = mutations.some((mutation) => {
        const node = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return !node?.closest('.nmc-kpi-sticky-header-overlay, .nmc-kpi-fixed-summary-bar, .nmc-kpi-filter-menu');
      });
      if (external) scheduleDiscover();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('scroll', scheduleGeometry, { passive: true });
    window.addEventListener('resize', scheduleDiscover, { passive: true });
    document.body.addEventListener('click', handleRowClick);

    return () => {
      cancelAnimationFrame(geometryRaf);
      window.clearTimeout(discoverTimer);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleGeometry);
      window.removeEventListener('resize', scheduleDiscover);
      document.body.removeEventListener('click', handleRowClick);
      listened.forEach((cleanup) => cleanup());
      listened.clear();
      entries.forEach((entry) => entry.overlay.remove());
      entries.clear();
      document.querySelectorAll<HTMLElement>('.nmc-kpi-row-selected').forEach((row) => row.classList.remove('nmc-kpi-row-selected'));
    };
  }, []);

  return null;
}
