'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const ROOT_SELECTOR = [
  '.policy-detail-table-wrapper',
  '.saoviet-detail-table-wrapper',
  '.clbsv-detail-table-wrapper',
  '.contest-result-table-wrapper',
  '#result-table-container',
].join(',');

const SUPPORTED_SHEETS = new Set(['report', 'saoviet', 'clb-sao-viet', 'clb-saoviet']);

const normalizeText = (value: string | null | undefined) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

type ColumnRange = { left: number; right: number; score: number };
type GroupOption = { key: string; label: string };
type FilterTarget = { root: HTMLElement; table: HTMLTableElement; host: HTMLElement | null };

const groupHeaderScore = (text: string) => {
  if (!text || text.includes('TRUONG NHOM') || text.includes('SO TVV NHOM')) return -1;
  if (text === 'NHOM KD' || text === 'NHOM KINH DOANH') return 140;
  if (text === 'NHOM' || text === 'TEN NHOM') return 130;
  if (text === 'MA NHOM') return 100;
  if (/^NHOM\b/.test(text)) return 90;
  return -1;
};

const nameHeaderScore = (text: string) => {
  if (text.includes('HO TEN TVV')) return 150;
  if (text === 'HO TEN' || text === 'TEN TVV') return 140;
  if (text.includes('TEN DAI LY')) return 130;
  if (text.includes('HO TEN DAI LY')) return 135;
  if (text.includes('TEN TTN') || text.includes('TEN NTD')) return 105;
  if (text.includes('TEN TRUONG NHOM')) return 95;
  return -1;
};

const getHeaderRange = (table: HTMLTableElement, scorer: (text: string) => number): ColumnRange | null => {
  const thead = table.tHead;
  if (!thead) return null;
  let best: ColumnRange | null = null;

  Array.from(thead.querySelectorAll<HTMLTableCellElement>('th')).forEach((cell) => {
    const score = scorer(normalizeText(cell.textContent));
    if (score < 0) return;
    const rect = cell.getBoundingClientRect();
    if (rect.width < 2) return;
    const next = { left: rect.left, right: rect.right, score };
    if (!best || next.score > best.score || (next.score === best.score && next.left > best.left)) best = next;
  });

  return best;
};

const findCellByRange = (row: HTMLTableRowElement, range: ColumnRange | null) => {
  if (!range) return null;
  let best: HTMLTableCellElement | null = null;
  let bestOverlap = 0;

  Array.from(row.cells).forEach((cell) => {
    const rect = cell.getBoundingClientRect();
    if (rect.width < 2) return;
    const overlap = Math.min(rect.right, range.right) - Math.max(rect.left, range.left);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = cell;
    }
  });
  return bestOverlap > 1 ? best : null;
};

const isBusinessRow = (row: HTMLTableRowElement) => {
  if (row.classList.contains('nmc-kpi-original-summary-row')) return false;
  if (row.classList.contains('nmc-policy-quarter-empty-separator')) return false;
  const text = normalizeText(row.textContent);
  if (!text) return false;
  if (/^(?:TONG CONG|TONG THUONG|TONG TIEN|TONG BONUS)\b/.test(text)) return false;
  return true;
};

const findPrimaryTarget = (): FilterTarget | null => {
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname !== '/quan-ly' || !SUPPORTED_SHEETS.has(params.get('sheet') || '')) return null;
  if (document.documentElement.getAttribute('data-kpi-embed') !== '1') return null;

  const seen = new Set<HTMLTableElement>();
  const candidates: Array<{ root: HTMLElement; table: HTMLTableElement; score: number }> = [];
  document.querySelectorAll<HTMLElement>(ROOT_SELECTOR).forEach((root) => {
    const table = root.querySelector<HTMLTableElement>('table:not([data-nmc-kpi-mirror-table])');
    if (!table || seen.has(table)) return;
    seen.add(table);
    const rect = table.getBoundingClientRect();
    if (rect.width < 160 || rect.height < 40 || getComputedStyle(table).display === 'none') return;
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).filter(isBusinessRow).length;
    if (!rows) return;
    const hasGroup = Boolean(getHeaderRange(table, groupHeaderScore));
    const hasName = Boolean(getHeaderRange(table, nameHeaderScore));
    const score = rows * 1000 + (hasGroup ? 250 : 0) + (hasName ? 250 : 0) + Math.min(rect.width, 800);
    candidates.push({ root, table, score });
  });

  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates[0];
  if (!chosen) return null;

  const host = findPosterHost(chosen.root);
  return { root: chosen.root, table: chosen.table, host };
};

const findPosterHost = (root: HTMLElement): HTMLElement | null => {
  const rootRect = root.getBoundingClientRect();
  const marked = Array.from(document.querySelectorAll<HTMLElement>('.nmc-kpi-mobile-poster'))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 180 && rect.height > 80 && rect.bottom <= rootRect.top + 100 && rootRect.top - rect.bottom < 520;
    })
    .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  if (marked) return marked;

  const minWidth = Math.min(260, (window.innerWidth || 360) * 0.55);
  const image = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
    .filter((img) => !img.closest('.nmc-kpi-filter-bar'))
    .filter((img) => {
      const rect = img.getBoundingClientRect();
      return rect.width >= minWidth && rect.height >= 80 && rect.bottom <= rootRect.top + 100 && rootRect.top - rect.bottom < 520;
    })
    .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  return image?.parentElement || null;
};

const getGroupOptions = (table: HTMLTableElement): GroupOption[] => {
  const range = getHeaderRange(table, groupHeaderScore);
  if (!range) return [];
  const options = new Map<string, string>();
  let lastGroup = '';

  Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).forEach((row) => {
    if (!isBusinessRow(row)) return;
    const raw = String(findCellByRange(row, range)?.textContent || '').trim();
    if (raw) lastGroup = raw;
    if (!lastGroup || /^[-–—]+$/.test(lastGroup)) return;
    const key = normalizeText(lastGroup);
    if (key && !options.has(key)) options.set(key, lastGroup);
  });

  return Array.from(options, ([key, label]) => ({ key, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }),
  );
};

const markLegacyFilterRow = (root: HTMLElement) => {
  document.querySelectorAll<HTMLElement>('.nmc-kpi-native-filter-row').forEach((el) => el.classList.remove('nmc-kpi-native-filter-row'));
  const rootTop = root.getBoundingClientRect().top;

  Array.from(document.querySelectorAll<HTMLInputElement>('input')).forEach((input) => {
    if (input.closest('.nmc-kpi-filter-bar, .nmc-kpi-filter-menu')) return;
    const placeholder = normalizeText(input.placeholder);
    if (!/TEN|TVV|MA/.test(placeholder)) return;
    let node: HTMLElement | null = input.parentElement;
    for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
      if (!node.querySelector('button')) continue;
      if (!normalizeText(node.textContent).includes('NHOM')) continue;
      const rect = node.getBoundingClientRect();
      if (rect.height <= 96 && rect.width > 160 && rect.bottom <= rootTop + 32 && rootTop - rect.bottom < 220) {
        node.classList.add('nmc-kpi-native-filter-row');
        break;
      }
    }
  });
};

const pulseSummaryRefresh = () => {
  const pulse = document.createElement('span');
  pulse.hidden = true;
  pulse.className = 'nmc-kpi-filter-pulse';
  document.body.appendChild(pulse);
  requestAnimationFrame(() => pulse.remove());
};

export function KpiEmbeddedFilterBar() {
  const [target, setTarget] = useState<FilterTarget | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);
  const applyTimerRef = useRef<number>(0);

  const selectedCount = selectedGroups.size;
  const selectedLabel = useMemo(() => {
    if (!selectedCount) return 'Tất cả';
    if (selectedCount === 1) {
      const key = Array.from(selectedGroups)[0];
      return groups.find((item) => item.key === key)?.label || '1 nhóm';
    }
    return `${selectedCount} nhóm`;
  }, [groups, selectedCount, selectedGroups]);

  useEffect(() => {
    let timer = 0;
    let currentTable: HTMLTableElement | null = null;

    const discover = () => {
      timer = 0;
      const next = findPrimaryTarget();
      if (!next) {
        setTarget(null);
        return;
      }

      markLegacyFilterRow(next.root);
      if (next.host) next.host.classList.add('nmc-kpi-filter-poster-host');
      setTarget((previous) => {
        if (previous?.host && previous.host !== next.host) previous.host.classList.remove('nmc-kpi-filter-poster-host');
        return previous?.table === next.table && previous?.host === next.host ? previous : next;
      });

      const nextGroups = getGroupOptions(next.table);
      setGroups((previous) => {
        const same = previous.length === nextGroups.length && previous.every((item, index) => item.key === nextGroups[index]?.key && item.label === nextGroups[index]?.label);
        return same ? previous : nextGroups;
      });
      setSelectedGroups((previous) => {
        if (currentTable !== next.table) {
          currentTable = next.table;
          return new Set();
        }
        const valid = new Set(nextGroups.map((item) => item.key));
        const kept = new Set(Array.from(previous).filter((key) => valid.has(key)));
        return kept.size === previous.size ? previous : kept;
      });
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(discover, 90);
    };

    discover();
    const observer = new MutationObserver((mutations) => {
      const external = mutations.some((mutation) => {
        const el = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return !el?.closest('.nmc-kpi-filter-bar, .nmc-kpi-filter-menu, .nmc-kpi-filter-pulse, .nmc-kpi-sticky-header-overlay, .nmc-kpi-fixed-summary-bar');
      });
      if (external) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      document.querySelectorAll<HTMLElement>('.nmc-kpi-native-filter-row').forEach((el) => el.classList.remove('nmc-kpi-native-filter-row'));
      document.querySelectorAll<HTMLElement>('.nmc-kpi-filter-poster-host').forEach((el) => el.classList.remove('nmc-kpi-filter-poster-host'));
    };
  }, []);

  useEffect(() => {
    if (!target?.table) return;
    window.clearTimeout(applyTimerRef.current);
    applyTimerRef.current = window.setTimeout(() => {
      const table = target.table;
      if (!table.isConnected) return;
      const groupRange = getHeaderRange(table, groupHeaderScore);
      const nameRange = getHeaderRange(table, nameHeaderScore);
      const q = normalizeText(query);
      let lastGroup = '';
      let lastName = '';

      Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr')).forEach((row) => {
        if (!isBusinessRow(row)) {
          row.removeAttribute('data-nmc-kpi-filter-hidden');
          return;
        }

        const rawGroup = String(findCellByRange(row, groupRange)?.textContent || '').trim();
        const rawName = String(findCellByRange(row, nameRange)?.textContent || '').trim();
        if (rawGroup) lastGroup = rawGroup;
        if (rawName) lastName = rawName;

        const groupKey = normalizeText(lastGroup);
        const groupMatch = !selectedGroups.size || selectedGroups.has(groupKey);
        const nameMatch = !q || normalizeText(lastName).includes(q);
        if (groupMatch && nameMatch) row.removeAttribute('data-nmc-kpi-filter-hidden');
        else row.setAttribute('data-nmc-kpi-filter-hidden', '1');
      });

      pulseSummaryRefresh();
    }, 35);

    return () => window.clearTimeout(applyTimerRef.current);
  }, [query, selectedGroups, target]);

  const toggleGroup = (key: string) => {
    setSelectedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleMenu = () => {
    const rect = groupButtonRef.current?.getBoundingClientRect() || null;
    setMenuRect(rect);
    setMenuOpen((value) => !value);
  };

  if (!target?.host || !target.host.isConnected) return null;

  const bar = (
    <div className="nmc-kpi-filter-bar" data-nmc-kpi-filter-bar="1">
      <button ref={groupButtonRef} type="button" className="nmc-kpi-filter-group-button" onClick={toggleMenu} aria-expanded={menuOpen}>
        <span className="nmc-kpi-filter-group-copy"><small>NHÓM</small><strong>{selectedLabel}</strong></span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      <label className="nmc-kpi-filter-search">
        <Search size={14} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên TVV" aria-label="Tìm tên TVV" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X size={13} /></button>}
      </label>
    </div>
  );

  const menu = menuOpen && menuRect ? createPortal(
    <>
      <button className="nmc-kpi-filter-menu-backdrop" type="button" aria-label="Đóng bộ lọc nhóm" onClick={() => setMenuOpen(false)} />
      <div
        className="nmc-kpi-filter-menu"
        style={{
          left: Math.max(8, Math.min(menuRect.left, window.innerWidth - Math.max(220, menuRect.width) - 8)),
          top: Math.min(menuRect.bottom + 5, window.innerHeight - 250),
          width: Math.max(220, menuRect.width),
        }}
      >
        <button type="button" className="nmc-kpi-filter-menu-all" onClick={() => setSelectedGroups(new Set())}>
          <span className={!selectedCount ? 'is-checked' : ''}>{!selectedCount && <Check size={13} />}</span>
          Tất cả nhóm
        </button>
        <div className="nmc-kpi-filter-menu-list">
          {groups.map((group) => {
            const checked = selectedGroups.has(group.key);
            return (
              <button key={group.key} type="button" onClick={() => toggleGroup(group.key)}>
                <span className={checked ? 'is-checked' : ''}>{checked && <Check size={13} />}</span>
                <strong>{group.label}</strong>
              </button>
            );
          })}
        </div>
        <div className="nmc-kpi-filter-menu-footer">
          <span>{selectedCount ? `Đã chọn ${selectedCount} nhóm` : 'Đang xem tất cả nhóm'}</span>
          <button type="button" onClick={() => setMenuOpen(false)}>Xong</button>
        </div>
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
      {createPortal(bar, target.host)}
      {menu}
      <style>{`
        html[data-kpi-embed='1'] .nmc-kpi-filter-poster-host {
          position: relative !important;
        }
        html[data-kpi-embed='1'] .nmc-kpi-native-filter-row {
          display: none !important;
        }
        html[data-kpi-embed='1'] tr[data-nmc-kpi-filter-hidden='1'] {
          display: none !important;
        }
        .nmc-kpi-filter-bar {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 180;
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 42px;
          padding: 5px 7px;
          background: linear-gradient(180deg, rgba(19, 35, 47, .94), rgba(10, 24, 34, .98));
          border-top: 1px solid rgba(126, 190, 195, .72);
          box-shadow: 0 -7px 18px rgba(0, 0, 0, .34), inset 0 1px rgba(255,255,255,.08);
          color: #eef8f8;
          font-family: inherit;
        }
        .nmc-kpi-filter-group-button {
          min-width: 0;
          width: 43%;
          height: 32px;
          padding: 3px 7px 3px 9px;
          border: 1px solid rgba(151, 188, 194, .52);
          border-radius: 5px;
          background: linear-gradient(180deg, rgba(58, 77, 89, .96), rgba(34, 52, 64, .98));
          color: #f4fbfb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
          box-shadow: inset 0 1px rgba(255,255,255,.09), 0 2px 5px rgba(0,0,0,.24);
        }
        .nmc-kpi-filter-group-copy { min-width: 0; display: flex; align-items: baseline; gap: 5px; }
        .nmc-kpi-filter-group-copy small { color: #7de7d5; font-size: 8px; line-height: 1; font-weight: 800; letter-spacing: .08em; }
        .nmc-kpi-filter-group-copy strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; line-height: 1; }
        .nmc-kpi-filter-search {
          min-width: 0;
          flex: 1 1 auto;
          height: 32px;
          padding: 0 7px;
          border: 1px solid rgba(151, 188, 194, .52);
          border-radius: 5px;
          background: rgba(238, 245, 246, .98);
          display: flex;
          align-items: center;
          gap: 5px;
          color: #315261;
          box-shadow: inset 0 1px 2px rgba(25, 43, 52, .13), 0 2px 5px rgba(0,0,0,.18);
        }
        .nmc-kpi-filter-search input {
          min-width: 0;
          width: 100%;
          height: 28px !important;
          padding: 0 !important;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          color: #193543 !important;
          font-size: 11px !important;
          font-weight: 650 !important;
          box-shadow: none !important;
        }
        .nmc-kpi-filter-search input::placeholder { color: #718792 !important; opacity: 1; }
        .nmc-kpi-filter-search > button { display: grid; place-items: center; flex: 0 0 22px; height: 22px; border: 0; background: transparent; color: #59717d; }
        .nmc-kpi-filter-menu-backdrop { position: fixed; inset: 0; z-index: 2147482890; border: 0; background: rgba(0,0,0,.14); }
        .nmc-kpi-filter-menu {
          position: fixed;
          z-index: 2147482900;
          max-height: min(52vh, 330px);
          overflow: hidden;
          border: 1px solid rgba(110, 181, 183, .68);
          border-radius: 7px;
          background: linear-gradient(180deg, #263946, #172a35);
          box-shadow: 0 14px 34px rgba(0,0,0,.48), inset 0 1px rgba(255,255,255,.08);
          color: #eff8f8;
        }
        .nmc-kpi-filter-menu-all,
        .nmc-kpi-filter-menu-list > button {
          width: 100%;
          min-height: 34px;
          padding: 5px 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          border-bottom: 1px solid rgba(165, 196, 199, .11);
          background: transparent;
          color: inherit;
          text-align: left;
          font-size: 11px;
        }
        .nmc-kpi-filter-menu-all > span,
        .nmc-kpi-filter-menu-list > button > span {
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(182, 211, 211, .55);
          border-radius: 4px;
          background: rgba(7, 22, 31, .42);
        }
        .nmc-kpi-filter-menu-all > span.is-checked,
        .nmc-kpi-filter-menu-list > button > span.is-checked { background: #35ccb2; border-color: #70ead5; color: #08231f; }
        .nmc-kpi-filter-menu-list { max-height: min(38vh, 238px); overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        .nmc-kpi-filter-menu-list strong { font-size: 11px; font-weight: 700; }
        .nmc-kpi-filter-menu-footer { height: 36px; padding: 5px 7px 5px 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: #a9c6ca; font-size: 9px; }
        .nmc-kpi-filter-menu-footer button { height: 26px; padding: 0 12px; border: 1px solid rgba(99, 232, 206, .7); border-radius: 5px; background: #35ccb2; color: #092821; font-size: 10px; font-weight: 850; }
        @media (max-width: 640px) {
          .nmc-kpi-filter-bar { min-height: 40px; padding: 4px 5px; gap: 4px; }
          .nmc-kpi-filter-group-button { width: 44%; height: 31px; padding-left: 7px; padding-right: 5px; }
          .nmc-kpi-filter-search { height: 31px; padding-left: 6px; padding-right: 5px; }
          .nmc-kpi-filter-group-copy small { font-size: 7px; }
          .nmc-kpi-filter-group-copy strong, .nmc-kpi-filter-search input { font-size: 10px !important; }
        }
      `}</style>
    </>
  );
}
