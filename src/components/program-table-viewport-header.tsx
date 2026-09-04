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
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
] as const;

const MIRRORED_ELEMENT_PROPERTIES = [
  'align-items',
  'background-color',
  'background-image',
  'background-position',
  'background-size',
  'background-repeat',
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
  'box-shadow',
  'box-sizing',
  'color',
  'display',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'gap',
  'justify-content',
  'letter-spacing',
  'line-height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'opacity',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'text-align',
  'text-decoration-color',
  'text-decoration-line',
  'text-decoration-style',
  'text-decoration-thickness',
  'text-shadow',
  'text-transform',
  'vertical-align',
  'white-space',
  'word-break',
  'overflow-wrap',
] as const;

const MIRRORED_TABLE_PROPERTIES = [
  'background-color',
  'background-image',
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
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'box-sizing',
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'table-layout',
] as const;

const copyComputedProperties = (
  source: Element,
  target: HTMLElement,
  properties: readonly string[],
) => {
  const computed = getComputedStyle(source);
  properties.forEach((property) => {
    target.style.setProperty(property, computed.getPropertyValue(property), 'important');
  });
};

const copyHeaderTreePresentation = (
  sourceHead: HTMLTableSectionElement,
  mirrorHead: HTMLTableSectionElement,
) => {
  const sourceNodes = [sourceHead, ...Array.from(sourceHead.querySelectorAll<HTMLElement>('*'))];
  const mirrorNodes = [mirrorHead, ...Array.from(mirrorHead.querySelectorAll<HTMLElement>('*'))];
  sourceNodes.forEach((source, index) => {
    const target = mirrorNodes[index];
    if (target) copyComputedProperties(source, target, MIRRORED_ELEMENT_PROPERTIES);
  });
};

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

const getStickyViewportTop = (scrollOwner: HTMLElement | null) => {
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
  verticalScrollOwner: HTMLElement | null;
  overlay: HTMLDivElement;
  signature: string;
  lastScrollLeft: number;
};

export function ProgramTableViewportHeader() {
  useEffect(() => {
    const entries = new Map<HTMLTableElement, Entry>();
    const listened = new Map<HTMLElement, () => void>();
    let discoverTimer = 0;
    let geometryRaf = 0;

    const syncHorizontal = (entry: Entry, force = false) => {
      const scrollLeft = entry.scroller.scrollLeft || 0;
      if (!force && scrollLeft === entry.lastScrollLeft) return;
      entry.lastScrollLeft = scrollLeft;

      const mirrorTable = entry.overlay.querySelector<HTMLElement>('table');
      if (!mirrorTable) return;
      // Only move the compact header layer. Updating transform directly avoids
      // a layout read and keeps it in the same frame as native horizontal pan.
      mirrorTable.style.setProperty('left', '0px', 'important');
      mirrorTable.style.setProperty('transform', `translate3d(${-scrollLeft}px, 0, 0)`, 'important');
    };

    const syncVisibility = (entry: Entry) => {
      if (!entry.table.isConnected || !entry.root.isConnected) return;

      const tableRect = entry.table.getBoundingClientRect();
      const headRect = entry.thead.getBoundingClientRect();
      const stickyTop = getStickyViewportTop(entry.verticalScrollOwner);
      const headerPaintHeight = Math.max(headRect.height, headRect.bottom - tableRect.top);

      entry.overlay.style.setProperty('top', `${stickyTop}px`, 'important');
      entry.overlay.style.height = `${headerPaintHeight}px`;

      // Take over a couple of pixels before the source header leaves the
      // scrollport, so an Android frame can never show a gap between the two.
      const headerHasReachedTop = headRect.top <= stickyTop + 2;
      const tableStillVisible = tableRect.bottom > stickyTop + Math.max(headerPaintHeight + 6, 30);
      entry.overlay.dataset.visible = headerHasReachedTop && tableStillVisible ? '1' : '0';
    };

    const syncAllVisibility = () => {
      entries.forEach(syncVisibility);
    };

    const scheduleGeometry = () => {
      if (geometryRaf) return;
      geometryRaf = requestAnimationFrame(() => {
        geometryRaf = 0;
        const viewportWidth = document.documentElement.clientWidth || window.innerWidth;

        entries.forEach((entry) => {
          if (!entry.table.isConnected || !entry.root.isConnected) return;

          const rootRect = entry.root.getBoundingClientRect();
          const tableRect = entry.table.getBoundingClientRect();
          const scrollLeft = entry.scroller.scrollLeft || 0;
          // Anchor the overlay to the table content edge. The whole mirrored
          // header then moves left together with horizontal scroll; STT is not
          // counter-offset or pinned separately.
          const tableContentLeft = tableRect.left + scrollLeft;
          const left = Math.max(0, rootRect.left, tableContentLeft);
          const right = Math.min(viewportWidth, rootRect.right);
          const width = Math.max(0, right - left);

          entry.overlay.style.left = `${left}px`;
          entry.overlay.style.width = `${width}px`;
          syncHorizontal(entry, true);
          syncVisibility(entry);
        });
      });
    };

    const listen = (element: HTMLElement) => {
      if (listened.has(element)) return;
      let lastScrollLeft = element.scrollLeft;
      let lastScrollTop = element.scrollTop;
      const handler = () => {
        const nextScrollLeft = element.scrollLeft;
        const nextScrollTop = element.scrollTop;

        if (nextScrollLeft !== lastScrollLeft) {
          entries.forEach((entry) => {
            if (entry.scroller === element) syncHorizontal(entry);
          });
          lastScrollLeft = nextScrollLeft;
        }

        if (nextScrollTop !== lastScrollTop) {
          syncAllVisibility();
          lastScrollTop = nextScrollTop;
        }
      };
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
      copyComputedProperties(entry.table, mirrorTable, MIRRORED_TABLE_PROPERTIES);
      mirrorTable.style.setProperty('width', `${tableWidth}px`, 'important');
      mirrorTable.style.setProperty('min-width', `${tableWidth}px`, 'important');
      mirrorTable.style.setProperty('border-collapse', sourceTableStyle.borderCollapse, 'important');
      mirrorTable.style.setProperty('border-spacing', sourceTableStyle.borderSpacing, 'important');
      mirrorTable.style.setProperty('table-layout', sourceTableStyle.tableLayout, 'important');

      const mirrorHead = mirrorTable.tHead;
      if (mirrorHead) copyHeaderTreePresentation(entry.thead, mirrorHead);

      const sourceCells = Array.from(entry.thead.querySelectorAll<HTMLTableCellElement>('th'));
      const mirrorCells = Array.from(mirrorTable.querySelectorAll<HTMLTableCellElement>('th'));
      sourceCells.forEach((source, index) => {
        const target = mirrorCells[index];
        if (!target) return;
        copyHeaderCellPresentation(source, target);
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
        const verticalScrollAncestors = getVerticalScrollAncestors(root);
        const verticalScrollOwner = verticalScrollAncestors[0] || null;
        let entry = entries.get(table);
        if (!entry) {
          const overlay = document.createElement('div');
          overlay.className = 'nmc-kpi-sticky-header-overlay nmc-kpi-sticky-header-overlay-v2';
          overlay.setAttribute('aria-hidden', 'true');
          document.body.appendChild(overlay);
          entry = {
            root,
            table,
            thead,
            scroller,
            verticalScrollOwner,
            overlay,
            signature: '',
            lastScrollLeft: Number.NaN,
          };
          entries.set(table, entry);
        } else {
          entry.root = root;
          entry.thead = thead;
          entry.scroller = scroller;
          entry.verticalScrollOwner = verticalScrollOwner;
        }

        buildMirror(entry);
        listen(scroller);
        verticalScrollAncestors.forEach(listen);
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

    window.addEventListener('scroll', syncAllVisibility, { passive: true });
    window.addEventListener('resize', scheduleDiscover, { passive: true });
    document.body.addEventListener('click', handleRowClick);

    return () => {
      cancelAnimationFrame(geometryRaf);
      window.clearTimeout(discoverTimer);
      observer.disconnect();
      window.removeEventListener('scroll', syncAllVisibility);
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
