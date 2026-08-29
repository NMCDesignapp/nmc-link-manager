'use client';

import { useEffect } from 'react';

const ROOT_SELECTOR = [
  '.policy-detail-table-wrapper',
  '.saoviet-detail-table-wrapper',
  '.clbsv-detail-table-wrapper',
  '.contest-result-table-wrapper',
  '#result-table-container',
].join(',');

const SEMANTIC_CLASSES = [
  'nmc-head-index', 'nmc-head-group', 'nmc-head-code', 'nmc-head-name',
  'nmc-head-date', 'nmc-head-metric', 'nmc-head-activity', 'nmc-head-reward',
  'nmc-head-status', 'nmc-head-note', 'nmc-head-neutral',
  'nmc-col-index', 'nmc-col-group', 'nmc-col-code', 'nmc-col-name',
  'nmc-col-date', 'nmc-col-metric', 'nmc-col-activity', 'nmc-col-reward',
  'nmc-col-status', 'nmc-col-note', 'nmc-col-neutral',
];

type Semantic = 'index' | 'group' | 'code' | 'name' | 'date' | 'metric' | 'activity' | 'reward' | 'status' | 'note' | 'neutral';
type Band = { left: number; right: number; semantic: Semantic };

const normalizeText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const classify = (raw: string): Semantic => {
  const text = normalizeText(raw);
  if (!text) return 'neutral';
  if (/^(STT|TT|#)$/.test(text)) return 'index';
  if (/THUONG|BONUS|TONG TIEN|QUA TANG|GIA TRI QUA|MUC QUA/.test(text)) return 'reward';
  if (/KET QUA|TRANG THAI|DAT THUONG|XEP HANG|HANG$|THU HANG|CHUA DAT/.test(text)) return 'status';
  if (/GHI CHU|DIEU KIEN|YEU CAU|DKB|TIEU CHI|NOI DUNG/.test(text)) return 'note';
  if (/NGAY|THANG|KY XET|DOT XET|HIEU LUC|BAT DAU|THAM NIEN/.test(text)) return 'date';
  if (/MA (SO|DL|TVV|TTN|TN|NTD|DAI LY)|^MA$|MA NHOM|MA BAN/.test(text)) return 'code';
  if (/HO TEN|TEN TVV|TEN DAI LY|TEN TTN|TEN TN|TEN NTD|TEN TRUONG NHOM|TRUONG NHOM/.test(text)) return 'name';
  if (/NHOM|BAN KD|PHONG|KHU VUC|DON VI/.test(text)) return 'group';
  if (/LUOT HD|LUOT HOAT DONG|SO HD|SL HD|HOP DONG|SO TVV|SL TVV|TUYEN DUNG|SO LUONG/.test(text)) return 'activity';
  if (/IP|AFYP|FYP|DOANH SO|PHI|PDT|NANG SUAT|TY LE|%|DO LON|DOANH THU|(^| )DT($| )/.test(text)) return 'metric';
  return 'neutral';
};

const clearSemanticClasses = (cell: Element) => {
  SEMANTIC_CLASSES.forEach((name) => cell.classList.remove(name));
};

const applyHeaderClasses = (table: HTMLTableElement) => {
  table.querySelectorAll<HTMLTableCellElement>('thead th').forEach((cell) => {
    clearSemanticClasses(cell);
    cell.classList.add(`nmc-head-${classify(cell.textContent || '')}`);
  });
};

const getLeafBands = (table: HTMLTableElement): Band[] => {
  const thead = table.tHead;
  if (!thead) return [];
  const headRect = thead.getBoundingClientRect();
  return Array.from(thead.querySelectorAll<HTMLTableCellElement>('th'))
    .filter((cell) => {
      const rect = cell.getBoundingClientRect();
      return rect.width > 1 && rect.bottom >= headRect.bottom - 2;
    })
    .map((cell) => {
      const rect = cell.getBoundingClientRect();
      return { left: rect.left, right: rect.right, semantic: classify(cell.textContent || '') };
    });
};

const applyBodyClasses = (table: HTMLTableElement) => {
  const bands = getLeafBands(table);
  if (!bands.length) return;

  table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
    Array.from(row.cells).forEach((cell) => {
      clearSemanticClasses(cell);
      const rect = cell.getBoundingClientRect();
      if (rect.width <= 1) return;

      let best: Band | null = null;
      let bestOverlap = 0;
      bands.forEach((band) => {
        const overlap = Math.min(rect.right, band.right) - Math.max(rect.left, band.left);
        if (overlap > bestOverlap) {
          best = band;
          bestOverlap = overlap;
        }
      });
      cell.classList.add(`nmc-col-${best && bestOverlap > 1 ? best.semantic : 'neutral'}`);
    });
  });
};

const styleTables = () => {
  if (document.documentElement.getAttribute('data-kpi-embed') !== '1') return;

  const seen = new Set<HTMLTableElement>();
  document.querySelectorAll<HTMLElement>(ROOT_SELECTOR).forEach((root) => {
    root.querySelectorAll<HTMLTableElement>('table:not([data-nmc-kpi-mirror-table])').forEach((table) => {
      if (seen.has(table) || !table.tHead) return;
      seen.add(table);
      table.classList.add('nmc-kpi-standardized-table');
      applyHeaderClasses(table);
      applyBodyClasses(table);
    });
  });

  document.querySelectorAll<HTMLTableElement>('table[data-nmc-kpi-mirror-table="header"]').forEach((table) => {
    table.classList.add('nmc-kpi-standardized-table');
    applyHeaderClasses(table);
  });
};

export function ProgramTableSemanticStyle() {
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(styleTables, 60);
    };

    styleTables();
    const observer = new MutationObserver((mutations) => {
      const external = mutations.some((mutation) => {
        const node = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return !node?.closest('.nmc-kpi-sticky-header-overlay, .nmc-kpi-fixed-summary-bar');
      });
      if (external) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      document.querySelectorAll<HTMLElement>('.nmc-kpi-standardized-table').forEach((table) => table.classList.remove('nmc-kpi-standardized-table'));
    };
  }, []);

  return null;
}
