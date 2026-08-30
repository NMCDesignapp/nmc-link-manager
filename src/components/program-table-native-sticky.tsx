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

const markQuarterlyPolicySeparators = (root: HTMLElement) => {
  if (!root.matches('.policy-detail-table-wrapper')) return;
  root.querySelectorAll<HTMLElement>('table tr').forEach((row) => {
    if (normalizeText(row.textContent)) return;
    const cells = Array.from(row.querySelectorAll<HTMLElement>('th, td'));
    if (!cells.length) return;
    const warm = [row, ...cells].some((el) => isWarmSeparatorColor(getComputedStyle(el).backgroundColor));
    if (warm) row.classList.add('nmc-policy-quarter-empty-separator');
  });
};

const markOriginalSummaryRows = (table: HTMLTableElement) => {
  table.querySelectorAll<HTMLElement>('.nmc-kpi-original-summary-row').forEach((el) => el.classList.remove('nmc-kpi-original-summary-row'));
  const footer = table.querySelector<HTMLElement>('tfoot');
  if (footer && SUMMARY_ROW_RE.test(normalizeText(footer.textContent))) footer.classList.add('nmc-kpi-original-summary-row');
  Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).slice(-10).forEach((row) => {
    const text = normalizeText(row.textContent);
    if (text && SUMMARY_ROW_RE.test(text)) row.classList.add('nmc-kpi-original-summary-row');
  });
};

const markLegacyPolicyFooter = () => {
  document.querySelectorAll<HTMLElement>('.nmc-kpi-legacy-policy-footer').forEach((el) => el.classList.remove('nmc-kpi-legacy-policy-footer'));
  const count = document.getElementById('policy-fixed-count');
  const amount = document.getElementById('policy-fixed-amount');
  if (!count || !amount) return;
  let node: HTMLElement | null = count.parentElement;
  for (let depth = 0; node && depth < 5; depth += 1, node = node.parentElement) {
    if (node.contains(amount) && normalizeText(node.textContent).includes('TONG THUONG')) {
      node.classList.add('nmc-kpi-legacy-policy-footer');
      break;
    }
  }
};

const markMobilePoster = () => {
  document.querySelectorAll<HTMLImageElement>('img[alt="Poster"]').forEach((img) => img.parentElement?.classList.add('nmc-kpi-mobile-poster'));
};

const isTransparent = (color: string) => color === 'transparent' || /rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(color);

const applyNativeStickyHeader = (table: HTMLTableElement) => {
  const thead = table.tHead;
  if (!thead) return;
  const rows = Array.from(thead.rows);
  table.classList.toggle('nmc-kpi-multi-tier-head', rows.length >= 2);
  table.classList.toggle('nmc-kpi-three-tier-head', rows.length >= 3);
  thead.classList.add('nmc-kpi-native-thead');

  let top = 0;
  rows.forEach((row, rowIndex) => {
    const rowBg = getComputedStyle(row).backgroundColor;
    Array.from(row.cells).forEach((cell) => {
      const th = cell as HTMLTableCellElement;
      const cellBg = getComputedStyle(th).backgroundColor;
      const bg = !isTransparent(cellBg) ? cellBg : !isTransparent(rowBg) ? rowBg : '#065f46';
      th.classList.add('nmc-kpi-native-sticky-cell');
      th.style.setProperty('--nmc-kpi-sticky-top', `${Math.round(top)}px`);
      th.style.setProperty('--nmc-kpi-sticky-z', String(300 + rows.length - rowIndex));
      th.style.setProperty('--nmc-kpi-sticky-bg', bg);
    });
    top += Math.max(1, row.getBoundingClientRect().height);
  });
};

type ColumnRange = { left: number; right: number; score: number };

const getHeaderRange = (table: HTMLTableElement, scorer: (text: string) => number): ColumnRange | null => {
  if (!table.tHead) return null;
  let best: ColumnRange | null = null;
  Array.from(table.tHead.querySelectorAll<HTMLTableCellElement>('th')).forEach((cell) => {
    const score = scorer(normalizeText(cell.textContent));
    if (score < 0) return;
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 1) return;
    const next = { left: rect.left, right: rect.right, score };
    if (!best || next.score > best.score || (next.score === best.score && next.left > best.left)) best = next;
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

const codeHeaderScore = (text: string) => /MA (?:SO|DL|TVV|TTN|TN|NTD)/.test(text) ? 100 : (text === 'MA SO' || text === 'MA DL' ? 110 : -1);
const nameHeaderScore = (text: string) => text.includes('HO TEN TVV') ? 120 : (text === 'HO TEN' || text.includes('TEN TVV') ? 110 : (text.includes('TEN TTN') || text.includes('TEN TRUONG NHOM') || text.includes('TEN NTD') ? 90 : -1));

const findCellByRange = (row: HTMLTableRowElement, range: ColumnRange | null) => {
  if (!range) return null;
  let best: HTMLTableCellElement | null = null;
  let overlapBest = 0;
  Array.from(row.cells).forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    const overlap = Math.min(rect.right, range.right) - Math.max(rect.left, range.left);
    if (overlap > overlapBest) { overlapBest = overlap; best = cell; }
  });
  return overlapBest > 1 ? best : null;
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
  return parseMoney(raw) > 0 || /\bDAT\b/.test(text) || /[A-Z]/.test(text);
};

const extractSummary = (table: HTMLTableElement) => {
  const rewardRange = getHeaderRange(table, rewardHeaderScore);
  const codeRange = getHeaderRange(table, codeHeaderScore);
  const nameRange = getHeaderRange(table, nameHeaderScore);
  const hasIdentity = Boolean(codeRange || nameRange);
  const identities = new Set<string>();
  const achieved = new Set<string>();
  const seenRewards = new Set<HTMLTableCellElement>();
  let totalMoney = 0;
  let lastIdentity = '';
  let fallback = 0;
  Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).forEach((row) => {
    if (row.classList.contains('nmc-kpi-original-summary-row') || row.classList.contains('nmc-policy-quarter-empty-separator')) return;
    if (row.getAttribute('data-nmc-kpi-filter-hidden') === '1' || getComputedStyle(row).display === 'none') return;
    if (!normalizeText(row.textContent)) return;
    const code = normalizeText(findCellByRange(row, codeRange)?.textContent);
    const name = normalizeText(findCellByRange(row, nameRange)?.textContent);
    let id = code || name;
    if (id) lastIdentity = id;
    else if (hasIdentity && lastIdentity) id = lastIdentity;
    else if (!hasIdentity) id = `ROW-${++fallback}`;
    else return;
    identities.add(id);
    const rewardCell = findCellByRange(row, rewardRange);
    const rewardText = rewardCell?.textContent || '';
    if (rewardRange ? hasReward(rewardText) : /DAT THUONG|\bDAT\b/.test(normalizeText(row.textContent))) achieved.add(id);
    if (rewardCell && !seenRewards.has(rewardCell)) { seenRewards.add(rewardCell); totalMoney += parseMoney(rewardText); }
  });
  return { total: identities.size, achieved: achieved.size, money: totalMoney };
};

export function ProgramTableNativeSticky() {
  useEffect(() => {
    let timer = 0;
    let summaryBar: HTMLDivElement | null = null;

    const ensureSummary = () => {
      if (summaryBar?.isConnected) return summaryBar;
      summaryBar = document.createElement('div');
      summaryBar.className = 'nmc-kpi-fixed-summary-bar';
      summaryBar.innerHTML = '<div class="nmc-kpi-summary-item"><span>Tổng TVV</span><strong data-nmc-summary="total">0</strong></div><div class="nmc-kpi-summary-item"><span>Đạt thưởng</span><strong data-nmc-summary="achieved">0</strong></div><div class="nmc-kpi-summary-item"><span>Tổng tiền</span><strong data-nmc-summary="money">0đ</strong></div>';
      document.body.appendChild(summaryBar);
      return summaryBar;
    };

    const discover = () => {
      if (!isEmbeddedKpiPage()) return;
      markMobilePoster();
      markLegacyPolicyFooter();
      const tables: HTMLTableElement[] = [];
      const seen = new Set<HTMLTableElement>();
      document.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR).forEach((root) => {
        const table = root.querySelector<HTMLTableElement>('table');
        if (!table || !table.tHead || seen.has(table)) return;
        seen.add(table);
        tables.push(table);
        root.classList.add('nmc-kpi-viewport-table');
        markQuarterlyPolicySeparators(root);
        markOriginalSummaryRows(table);
        applyNativeStickyHeader(table);
      });
      const visible = tables.filter((t) => t.getClientRects().length > 0).sort((a,b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0] || null;
      const bar = ensureSummary();
      if (!visible) { bar.dataset.visible = '0'; return; }
      const m = extractSummary(visible);
      const set = (key: string, value: string) => { const el = bar.querySelector<HTMLElement>(`[data-nmc-summary="${key}"]`); if (el) el.textContent = value; };
      set('total', new Intl.NumberFormat('vi-VN').format(m.total));
      set('achieved', new Intl.NumberFormat('vi-VN').format(m.achieved));
      set('money', `${new Intl.NumberFormat('vi-VN').format(m.money)}đ`);
      bar.dataset.visible = '1';
    };

    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(discover, 100); };
    discover();
    const observer = new MutationObserver((mutations) => {
      const external = mutations.some((m) => {
        const el = m.target instanceof Element ? m.target : m.target.parentElement;
        return !el?.closest('.nmc-kpi-fixed-summary-bar');
      });
      if (external) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['data-nmc-kpi-filter-hidden'] });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      summaryBar?.remove();
      document.querySelectorAll<HTMLElement>('.nmc-kpi-native-sticky-cell').forEach((cell) => {
        cell.classList.remove('nmc-kpi-native-sticky-cell');
        cell.style.removeProperty('--nmc-kpi-sticky-top');
        cell.style.removeProperty('--nmc-kpi-sticky-z');
        cell.style.removeProperty('--nmc-kpi-sticky-bg');
      });
    };
  }, []);
  return null;
}
