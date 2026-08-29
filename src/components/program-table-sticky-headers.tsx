'use client';

import { useEffect } from 'react';

const WRAPPER_SELECTOR = [
  '.policy-detail-table-wrapper',
  '.saoviet-detail-table-wrapper',
  '.clbsv-detail-table-wrapper',
  '.contest-result-table-wrapper',
  '#result-table-container',
].join(',');

const SUMMARY_ROW_RE = /^(?:TONG CONG|TONG THUONG|TONG TIEN|TONG BONUS)\b/;

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

const isWarmSeparatorColor = (color: string) => {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return false;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return r >= 95 && r > g * 1.18 && r > b * 1.35 && g < 155;
};

const isQuarterlyPolicyPage = () => {
  if (!isEmbeddedKpiPage()) return false;
  const text = normalizeText(document.body?.textContent?.slice(0, 18000));
  return /CHINH SACH 2026|THUONG QUY|NANG SUAT QUY/.test(text);
};

const findHorizontalScroller = (root: HTMLElement) => {
  const candidates = [
    root,
    root.querySelector<HTMLElement>('[data-slot="table-container"]'),
  ].filter(Boolean) as HTMLElement[];

  return candidates.find((el) => el.scrollWidth > el.clientWidth + 2) || root;
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

const markOriginalSummaryRows = (table: HTMLTableElement) => {
  table.querySelectorAll<HTMLElement>('.nmc-kpi-original-summary-row').forEach((el) => {
    el.classList.remove('nmc-kpi-original-summary-row');
  });

  const footer = table.querySelector<HTMLElement>('tfoot');
  if (footer && SUMMARY_ROW_RE.test(normalizeText(footer.textContent))) {
    footer.classList.add('nmc-kpi-original-summary-row');
  }

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
  rows.slice(-10).forEach((row) => {
    const text = normalizeText(row.textContent);
    if (text && SUMMARY_ROW_RE.test(text)) row.classList.add('nmc-kpi-original-summary-row');
  });
};

const markHeaderDensity = (table: HTMLTableElement, thead: HTMLTableSectionElement) => {
  const tiers = Math.max(1, thead.rows.length);
  table.classList.toggle('nmc-kpi-multi-tier-head', tiers >= 2);
  table.classList.toggle('nmc-kpi-three-tier-head', tiers >= 3);
};

const markMobilePoster = () => {
  document.querySelectorAll<HTMLImageElement>('img[alt="Poster"]').forEach((img) => {
    img.parentElement?.classList.add('nmc-kpi-mobile-poster');
  });
};

type ColumnRange = {
  left: number;
  right: number;
  text: string;
  score: number;
};

const getHeaderRange = (
  table: HTMLTableElement,
  scorer: (text: string) => number,
): ColumnRange | null => {
  const thead = table.tHead;
  if (!thead) return null;

  let best: ColumnRange | null = null;
  Array.from(thead.querySelectorAll<HTMLTableCellElement>('th')).forEach((cell) => {
    const text = normalizeText(cell.textContent);
    const score = scorer(text);
    if (score < 0) return;
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 1) return;
    const candidate = { left: rect.left, right: rect.right, text, score };
    if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.left > best.left)) {
      best = candidate;
    }
  });

  return best;
};

const rewardHeaderScore = (text: string) => {
  if (!text.includes('THUONG') && !text.includes('TONG TIEN')) return -1;
  if (text.includes('TONG THUONG') || text.includes('TONG TIEN THUONG')) return 120;
  if (/^THUONG(?:\s|$)/.test(text)) return 100;
  if (text.includes('THUONG GD')) return 82;
  if (text.includes('MUC THUONG')) return 74;
  if (text.includes('TONG TIEN')) return 112;
  return 70;
};

const codeHeaderScore = (text: string) => {
  if (/MA (?:SO|DL|TVV|TTN|TN|NTD)/.test(text)) return 100;
  if (text === 'MA SO' || text === 'MA DL') return 110;
  return -1;
};

const nameHeaderScore = (text: string) => {
  if (text.includes('HO TEN TVV')) return 120;
  if (text === 'HO TEN' || text.includes('TEN TVV')) return 110;
  if (text.includes('TEN TTN') || text.includes('TEN TRUONG NHOM') || text.includes('TEN NTD')) return 90;
  return -1;
};

const findCellByRange = (row: HTMLTableRowElement, range: ColumnRange | null) => {
  if (!range) return null;
  let best: HTMLTableCellElement | null = null;
  let bestOverlap = 0;

  Array.from(row.cells).forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 1) return;
    const overlap = Math.min(rect.right, range.right) - Math.max(rect.left, range.left);
    if (overlap > bestOverlap) {
      best = cell;
      bestOverlap = overlap;
    }
  });

  return bestOverlap > 1 ? best : null;
};

const parseMoney = (raw: string | null | undefined) => {
  const text = String(raw || '');
  const re = /\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;
  let match: RegExpExecArray | null;
  let best = 0;

  while ((match = re.exec(text)) !== null) {
    const token = match[0];
    let value = Number(token.replace(/[.\s]/g, '').replace(',', '.'));
    if (!Number.isFinite(value)) continue;

    const tail = text.slice(match.index + token.length, match.index + token.length + 12).toLowerCase();
    if (/^\s*(?:tr|tri[eệ]u)\b/.test(tail) && value < 100000) value *= 1_000_000;
    else if (/^\s*(?:k|ngh[iì]n)\b/.test(tail) && value < 100000) value *= 1_000;

    if (value > best) best = value;
  }

  return Math.round(best);
};

const hasReward = (raw: string | null | undefined) => {
  const text = normalizeText(raw);
  if (!text || /^[-–—]+$/.test(text) || text === '0' || text === '0D') return false;
  if (/CHUA DAT|KHONG DAT|KHONG DU|KHONG THUONG|LOAI/.test(text)) return false;
  if (parseMoney(raw) > 0) return true;
  if (/\bDAT\b/.test(text)) return true;
  return /[A-Z]/.test(text);
};

type SummaryMetrics = {
  totalTvv: number;
  achieved: number;
  totalMoney: number;
};

const extractSummaryMetrics = (table: HTMLTableElement): SummaryMetrics => {
  const rewardRange = getHeaderRange(table, rewardHeaderScore);
  const codeRange = getHeaderRange(table, codeHeaderScore);
  const nameRange = getHeaderRange(table, nameHeaderScore);
  const hasIdentityColumn = Boolean(codeRange || nameRange);

  const identities = new Set<string>();
  const achievedIdentities = new Set<string>();
  const seenRewardCells = new Set<HTMLTableCellElement>();
  let totalMoney = 0;
  let lastIdentity = '';
  let fallbackIndex = 0;

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).filter((row) => {
    if (row.classList.contains('nmc-kpi-original-summary-row')) return false;
    if (row.classList.contains('nmc-policy-quarter-empty-separator')) return false;
    if (!normalizeText(row.textContent)) return false;
    return getComputedStyle(row).display !== 'none';
  });

  rows.forEach((row) => {
    const code = normalizeText(findCellByRange(row, codeRange)?.textContent);
    const name = normalizeText(findCellByRange(row, nameRange)?.textContent);
    let identity = code || name;

    if (identity) lastIdentity = identity;
    else if (hasIdentityColumn && lastIdentity) identity = lastIdentity;
    else if (!hasIdentityColumn) identity = `ROW-${++fallbackIndex}`;
    else return;

    identities.add(identity);

    const rewardCell = findCellByRange(row, rewardRange);
    const rewardText = rewardCell?.textContent || '';
    const rowText = normalizeText(row.textContent);
    const achieved = rewardRange ? hasReward(rewardText) : /DAT THUONG|\bDAT\b/.test(rowText) && !/CHUA DAT|KHONG DAT/.test(rowText);
    if (achieved) achievedIdentities.add(identity);

    if (rewardCell && !seenRewardCells.has(rewardCell)) {
      seenRewardCells.add(rewardCell);
      totalMoney += parseMoney(rewardText);
    }
  });

  return {
    totalTvv: identities.size,
    achieved: achievedIdentities.size,
    totalMoney,
  };
};

const makeHeaderMirror = (sourceTable: HTMLTableElement, thead: HTMLTableSectionElement) => {
  const table = document.createElement('table');
  table.className = sourceTable.className;
  table.style.cssText = sourceTable.style.cssText;
  table.setAttribute('aria-hidden', 'true');
  table.setAttribute('data-nmc-kpi-mirror-table', 'header');

  const colgroup = sourceTable.querySelector(':scope > colgroup');
  if (colgroup) table.appendChild(colgroup.cloneNode(true));
  table.appendChild(thead.cloneNode(true));
  return table;
};

type StickyEntry = {
  root: HTMLElement;
  table: HTMLTableElement;
  thead: HTMLTableSectionElement;
  scroller: HTMLElement;
  header: HTMLDivElement;
  signature: string;
};

export function ProgramTableStickyHeaders() {
  useEffect(() => {
    const entries = new Map<HTMLTableElement, StickyEntry>();
    const listened = new Set<HTMLElement>();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => scheduleGeometry()) : null;
    let raf = 0;
    let discoverTimer = 0;
    let summaryBar: HTMLDivElement | null = null;

    const ensureSummaryBar = () => {
      if (summaryBar?.isConnected) return summaryBar;
      summaryBar = document.createElement('div');
      summaryBar.className = 'nmc-kpi-fixed-summary-bar';
      summaryBar.setAttribute('aria-live', 'polite');
      summaryBar.innerHTML = `
        <div class="nmc-kpi-summary-item"><span>Tổng TVV</span><strong data-nmc-summary="total">0</strong></div>
        <div class="nmc-kpi-summary-item"><span>Đạt thưởng</span><strong data-nmc-summary="achieved">0</strong></div>
        <div class="nmc-kpi-summary-item"><span>Tổng tiền</span><strong data-nmc-summary="money">0đ</strong></div>
      `;
      document.body.appendChild(summaryBar);
      return summaryBar;
    };

    const setSummaryText = (key: string, value: string) => {
      const node = summaryBar?.querySelector<HTMLElement>(`[data-nmc-summary="${key}"]`);
      if (node && node.textContent !== value) node.textContent = value;
    };

    const updateSummaryBar = (table: HTMLTableElement | null) => {
      const bar = ensureSummaryBar();
      if (!table) {
        bar.dataset.visible = '0';
        return;
      }

      const metrics = extractSummaryMetrics(table);
      setSummaryText('total', new Intl.NumberFormat('vi-VN').format(metrics.totalTvv));
      setSummaryText('achieved', new Intl.NumberFormat('vi-VN').format(metrics.achieved));
      setSummaryText('money', `${new Intl.NumberFormat('vi-VN').format(metrics.totalMoney)}đ`);
      bar.dataset.visible = '1';
    };

    const buildHeader = (entry: StickyEntry) => {
      const signature = entry.thead.innerHTML;
      if (entry.signature !== signature || !entry.header.firstElementChild) {
        entry.header.replaceChildren(makeHeaderMirror(entry.table, entry.thead));
        entry.signature = signature;
      }

      const mirrorTable = entry.header.querySelector<HTMLTableElement>('table');
      if (!mirrorTable) return;
      const tableWidth = Math.max(entry.table.scrollWidth, entry.table.getBoundingClientRect().width);
      mirrorTable.style.width = `${tableWidth}px`;
      mirrorTable.style.minWidth = `${tableWidth}px`;

      const sourceCells = Array.from(entry.thead.querySelectorAll<HTMLTableCellElement>('th'));
      const mirrorCells = Array.from(mirrorTable.querySelectorAll<HTMLTableCellElement>('th'));
      sourceCells.forEach((source, index) => {
        const target = mirrorCells[index];
        if (!target) return;
        const width = source.getBoundingClientRect().width;
        if (width > 1) {
          target.style.width = `${width}px`;
          target.style.minWidth = `${width}px`;
          target.style.maxWidth = `${width}px`;
        }
      });
    };

    const syncEntryGeometry = (entry: StickyEntry) => {
      if (!entry.root.isConnected || !entry.table.isConnected) return;
      const rootRect = entry.root.getBoundingClientRect();
      const headerRect = entry.thead.getBoundingClientRect();
      const viewportW = window.innerWidth || document.documentElement.clientWidth;
      const left = Math.max(0, rootRect.left);
      const width = Math.max(0, Math.min(rootRect.width, viewportW - left));
      const scrollLeft = entry.scroller.scrollLeft || 0;

      entry.header.style.left = `${left}px`;
      entry.header.style.width = `${width}px`;
      const mirrorTable = entry.header.querySelector<HTMLElement>('table');
      if (mirrorTable) mirrorTable.style.transform = `translate3d(${-scrollLeft}px,0,0)`;

      const pinHeader = rootRect.top <= 0 && rootRect.bottom > Math.max(60, headerRect.height + 20);
      entry.header.dataset.visible = pinHeader ? '1' : '0';
    };

    function scheduleGeometry() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        entries.forEach(syncEntryGeometry);
      });
    }

    const listenTo = (element: HTMLElement) => {
      if (listened.has(element)) return;
      element.addEventListener('scroll', scheduleGeometry, { passive: true });
      listened.add(element);
    };

    const getVisiblePrimaryTable = (tables: HTMLTableElement[]) => {
      return tables
        .filter((table) => table.isConnected && table.getClientRects().length > 0)
        .sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          const aScore = Math.max(0, Math.min(ar.bottom, window.innerHeight) - Math.max(ar.top, 0)) * Math.max(0, ar.width);
          const bScore = Math.max(0, Math.min(br.bottom, window.innerHeight) - Math.max(br.top, 0)) * Math.max(0, br.width);
          return bScore - aScore;
        })[0] || null;
    };

    const discover = () => {
      if (!isEmbeddedKpiPage()) {
        entries.forEach((entry) => { entry.header.dataset.visible = '0'; });
        if (summaryBar) summaryBar.dataset.visible = '0';
        return;
      }

      markMobilePoster();
      const seenTables = new Set<HTMLTableElement>();
      const tables: HTMLTableElement[] = [];

      document.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR).forEach((candidateRoot) => {
        const table = candidateRoot.querySelector<HTMLTableElement>('table');
        const thead = table?.tHead;
        if (!table || !thead || seenTables.has(table)) return;
        seenTables.add(table);
        tables.push(table);

        const root = table.closest<HTMLElement>(WRAPPER_SELECTOR) || candidateRoot;
        root.classList.add('nmc-kpi-viewport-table');
        markQuarterlyPolicySeparators(root);
        markOriginalSummaryRows(table);
        markHeaderDensity(table, thead);

        const scroller = findHorizontalScroller(root);
        let entry = entries.get(table);
        if (!entry) {
          const header = document.createElement('div');
          header.className = 'nmc-kpi-sticky-header-overlay';
          header.setAttribute('aria-hidden', 'true');
          document.body.appendChild(header);
          entry = { root, table, thead, scroller, header, signature: '' };
          entries.set(table, entry);
          resizeObserver?.observe(root);
          resizeObserver?.observe(table);
        } else {
          entry.root = root;
          entry.thead = thead;
          entry.scroller = scroller;
        }

        buildHeader(entry);
        listenTo(scroller);
        if (root !== scroller) listenTo(root);
      });

      entries.forEach((entry, table) => {
        if (seenTables.has(table)) return;
        entry.header.remove();
        resizeObserver?.unobserve(entry.root);
        resizeObserver?.unobserve(entry.table);
        entries.delete(table);
      });

      updateSummaryBar(getVisiblePrimaryTable(tables));
      scheduleGeometry();
    };

    const scheduleDiscover = () => {
      window.clearTimeout(discoverTimer);
      discoverTimer = window.setTimeout(discover, 90);
    };

    const isInternalMutation = (mutation: MutationRecord) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      return Boolean(target?.closest('.nmc-kpi-sticky-header-overlay, .nmc-kpi-fixed-summary-bar'));
    };

    discover();
    const observer = new MutationObserver((mutations) => {
      if (mutations.length && mutations.every(isInternalMutation)) return;
      scheduleDiscover();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('scroll', scheduleGeometry, { passive: true });
    window.addEventListener('resize', scheduleDiscover, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(discoverTimer);
      observer.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', scheduleGeometry);
      window.removeEventListener('resize', scheduleDiscover);
      listened.forEach((el) => el.removeEventListener('scroll', scheduleGeometry));
      entries.forEach((entry, table) => {
        entry.header.remove();
        entry.root.classList.remove('nmc-kpi-viewport-table');
        table.classList.remove('nmc-kpi-multi-tier-head', 'nmc-kpi-three-tier-head');
      });
      summaryBar?.remove();
      document.querySelectorAll<HTMLElement>('.nmc-kpi-original-summary-row').forEach((el) => {
        el.classList.remove('nmc-kpi-original-summary-row');
      });
    };
  }, []);

  return null;
}
