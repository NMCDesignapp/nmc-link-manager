(() => {
  'use strict';

  const TABLE_CLASS = 'nmc-kpi-v21-table';
  const ROOTS = [
    { selector: '.clbsv-detail-table-wrapper', theme: 'green' },
    { selector: '.saoviet-detail-table-wrapper', theme: 'green' },
    { selector: '.policy-detail-table-wrapper', theme: 'navy' },
    { selector: '.contest-result-table-wrapper', theme: 'navy' },
    { selector: '#result-table-container', theme: 'navy' },
  ];

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const tierFromText = (value) => {
    const text = normalize(value);
    if (/BACH\s*KIM|PLATINUM/.test(text)) return 'platinum';
    if (/KIM\s*CUONG|DIAMOND/.test(text)) return 'diamond';
    if (/(^|\s)(HANG\s*)?VANG(\s|$)|GOLD/.test(text)) return 'gold';
    return '';
  };

  const isTargetHeader = (value) => {
    const text = normalize(value);
    return /CHI TIEU|MUC TIEU|IP|AFYP|FYP|DOANH SO|DOANH THU|PHI|PDT|NANG SUAT|TY LE|%|SO LUONG|LUOT|HOP DONG|TONG|THUONG|TIEN|KET QUA/.test(text);
  };

  const isPlainHeader = (value, columnIndex) => {
    if (columnIndex < 4) return true;
    const text = normalize(value);
    return /^(STT|TT|#)$|NHOM|MA SO|^MA$|HO TEN|TEN TVV|TEN DAI LY|TEN TN|TEN TTN|CHUC VU|CAP BAC|DON VI|PHONG|BAN |KHU VUC|NGAY|THANG|KY |DOT |GHI CHU/.test(text);
  };

  const isNumericText = (value) => {
    const text = String(value || '').trim();
    if (!text) return false;
    const compact = text
      .replace(/\s/g, '')
      .replace(/[₫đ%]/gi, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(/,(?=\d{3}(\D|$))/g, '')
      .replace(/,/g, '.');
    return /^[-−+]?\d+(?:\.\d+)?(?:tr|ty|k)?$/i.test(compact) || /^\([-+]?\d+(?:[.,]\d+)?\)$/.test(text);
  };

  const isNegativeValue = (value) => {
    const raw = String(value || '').trim();
    const text = normalize(raw);
    if (/^[-−]\s*\d/.test(raw) || /^\(\s*\d/.test(raw)) return true;
    return /(^|\s)(AM|CHUA DAT|KHONG DAT)(\s|$)/.test(text);
  };

  const clearCellAttrs = (cell) => {
    delete cell.dataset.nmcTier;
    delete cell.dataset.nmcTarget;
    delete cell.dataset.nmcIdentity;
    delete cell.dataset.nmcNumeric;
    delete cell.dataset.nmcNegative;
    delete cell.dataset.nmcHeaderLevel;
  };

  const buildHeaderGrid = (table) => {
    const thead = table.tHead;
    if (!thead) return null;
    const rows = Array.from(thead.rows);
    if (!rows.length) return null;

    const grid = [];
    const metas = [];

    rows.forEach((row, rowIndex) => {
      if (!grid[rowIndex]) grid[rowIndex] = [];
      let column = 0;
      Array.from(row.cells).forEach((cell) => {
        while (grid[rowIndex][column]) column += 1;
        const colSpan = Math.max(1, cell.colSpan || 1);
        const rowSpan = Math.max(1, cell.rowSpan || 1);
        const meta = {
          cell,
          rowIndex,
          start: column,
          end: column + colSpan - 1,
          text: cell.textContent || '',
          tier: tierFromText(cell.textContent || ''),
          target: isTargetHeader(cell.textContent || ''),
        };
        metas.push(meta);

        for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
          if (!grid[r]) grid[r] = [];
          for (let c = column; c < column + colSpan; c += 1) grid[r][c] = meta;
        }
        column += colSpan;
      });
    });

    const columnCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
    const columns = Array.from({ length: columnCount }, (_, columnIndex) => {
      let tier = '';
      let target = false;
      let leafText = '';
      for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
        const meta = grid[rowIndex] && grid[rowIndex][columnIndex];
        if (!meta) continue;
        if (meta.tier) tier = meta.tier;
        if (meta.target) target = true;
        leafText = meta.text || leafText;
      }
      if (tier) target = true;
      return { tier, target, leafText };
    });

    metas.forEach((meta) => {
      clearCellAttrs(meta.cell);
      meta.cell.dataset.nmcHeaderLevel = String(meta.rowIndex);
      const spanColumns = columns.slice(meta.start, meta.end + 1);
      const tiers = Array.from(new Set(spanColumns.map((item) => item.tier).filter(Boolean)));
      if (meta.tier) meta.cell.dataset.nmcTier = meta.tier;
      else if (tiers.length === 1) meta.cell.dataset.nmcTier = tiers[0];
      if (meta.target || spanColumns.some((item) => item.target)) meta.cell.dataset.nmcTarget = '1';
    });

    return columns;
  };

  const styleBody = (table, columns) => {
    const tbody = table.tBodies && table.tBodies[0];
    if (!tbody || !columns || !columns.length) return;

    Array.from(tbody.rows).forEach((row) => {
      let columnIndex = 0;
      Array.from(row.cells).forEach((cell) => {
        clearCellAttrs(cell);
        const span = Math.max(1, cell.colSpan || 1);
        const infos = columns.slice(columnIndex, columnIndex + span);
        const info = infos[0] || { tier: '', target: false, leafText: '' };
        const tiers = Array.from(new Set(infos.map((item) => item.tier).filter(Boolean)));
        const tier = tiers.length === 1 ? tiers[0] : info.tier;
        const headerText = info.leafText || '';
        const plain = isPlainHeader(headerText, columnIndex);
        const target = Boolean(tier) || infos.some((item) => item.target);

        if (columnIndex < 4 || plain) cell.dataset.nmcIdentity = '1';
        if (tier) cell.dataset.nmcTier = tier;
        if (target) cell.dataset.nmcTarget = '1';

        const value = cell.textContent || '';
        if (!plain && isNumericText(value)) cell.dataset.nmcNumeric = '1';
        if (target && isNegativeValue(value)) {
          cell.dataset.nmcNegative = '1';
          delete cell.dataset.nmcNumeric;
        }
        columnIndex += span;
      });
    });
  };

  const styleTable = (table, theme) => {
    if (!(table instanceof HTMLTableElement) || !table.tHead) return;
    table.classList.add(TABLE_CLASS);
    table.dataset.nmcTheme = theme;
    const columns = buildHeaderGrid(table);
    styleBody(table, columns);
  };

  const isVisible = (element) => {
    if (!(element instanceof Element)) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const inferActiveTheme = (styledTables) => {
    const visible = styledTables.find((table) => isVisible(table));
    if (visible && visible.dataset.nmcTheme) return visible.dataset.nmcTheme;
    const first = styledTables[0];
    if (first && first.dataset.nmcTheme) return first.dataset.nmcTheme;
    const path = normalize(window.location.pathname);
    if (/CLB|SAO-VIET|SAOVIET/.test(path)) return 'green';
    return 'navy';
  };

  const styleAll = () => {
    const seen = new Set();
    const styledTables = [];

    ROOTS.forEach(({ selector, theme }) => {
      document.querySelectorAll(selector).forEach((root) => {
        root.querySelectorAll('table').forEach((table) => {
          if (seen.has(table)) return;
          seen.add(table);
          styleTable(table, theme);
          styledTables.push(table);
        });
      });
    });

    const activeTheme = inferActiveTheme(styledTables);
    document.querySelectorAll('.nmc-kpi-sticky-header-overlay table, table[data-nmc-kpi-mirror-table="header"]').forEach((table) => {
      if (seen.has(table)) return;
      styleTable(table, activeTheme);
    });
  };

  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(styleAll), 70);
  };

  const mutationTouchesDetailTables = (mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (target && target.closest && target.closest(ROOTS.map((item) => item.selector).join(','))) return true;
    return Array.from(mutation.addedNodes || []).some((node) => {
      if (!(node instanceof Element)) return false;
      if (ROOTS.some((item) => node.matches(item.selector) || node.querySelector(item.selector))) return true;
      return Boolean(node.matches('table') || node.querySelector('table'));
    });
  };

  const start = () => {
    styleAll();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(mutationTouchesDetailTables)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('load', schedule, { once: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
