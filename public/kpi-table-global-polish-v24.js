(() => {
  'use strict';

  const ROOT_SELECTOR = [
    '.policy-detail-table-wrapper',
    '.saoviet-detail-table-wrapper',
    '.clbsv-detail-table-wrapper',
    '.contest-result-table-wrapper',
    '#result-table-container',
  ].join(',');

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const isPositiveAchieved = (value) => {
    const text = normalize(value);
    if (!text) return false;
    if (/CHUA DAT|KHONG DAT|CHUA DU|KHONG DU/.test(text)) return false;
    return /(^|[^A-Z0-9])DAT([^A-Z0-9]|$)/.test(text);
  };

  const rankFromText = (value) => {
    const text = normalize(value);
    if (/HANG\s*BACH\s*KIM|\bBACH\s*KIM\b|PLATINUM/.test(text)) return 'platinum';
    if (/HANG\s*KIM\s*CUONG|\bKIM\s*CUONG\b|DIAMOND/.test(text)) return 'diamond';
    if (/HANG\s*VANG|\bVANG\b|GOLD/.test(text)) return 'gold';
    return '';
  };

  const markRankGroups = (table) => {
    if (!table.tHead) return;

    table.querySelectorAll('[data-nmc-rank-group]').forEach((cell) => {
      delete cell.dataset.nmcRankGroup;
      delete cell.dataset.nmcRankLevel;
      delete cell.dataset.nmcRankEdge;
    });

    const grid = [];
    const metas = [];
    Array.from(table.tHead.rows).forEach((row, rowIndex) => {
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
          rank: rankFromText(cell.textContent || '') || cell.dataset.nmcTier || '',
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
    const columnRanks = Array.from({ length: columnCount }, (_, column) => {
      let rank = '';
      for (let row = 0; row < grid.length; row += 1) {
        const meta = grid[row] && grid[row][column];
        if (meta && meta.rank) rank = meta.rank;
      }
      return rank;
    });

    const ranges = [];
    let start = 0;
    while (start < columnCount) {
      const rank = columnRanks[start];
      let end = start;
      while (end + 1 < columnCount && columnRanks[end + 1] === rank) end += 1;
      if (rank) ranges.push({ rank, start, end });
      start = end + 1;
    }

    metas.forEach((meta) => {
      const range = ranges.find((item) => meta.start >= item.start && meta.end <= item.end);
      if (!range) return;
      meta.cell.dataset.nmcRankGroup = range.rank;
      meta.cell.dataset.nmcRankLevel = rankFromText(meta.cell.textContent || '') ? 'parent' : 'child';
      if (meta.start === range.start) meta.cell.dataset.nmcRankEdge = 'left';
      if (meta.end === range.end) meta.cell.dataset.nmcRankEdge = meta.cell.dataset.nmcRankEdge === 'left' ? 'both' : 'right';
    });

    Array.from(table.tBodies || []).forEach((tbody) => {
      Array.from(tbody.rows).forEach((row) => {
        let column = 0;
        Array.from(row.cells).forEach((cell) => {
          const span = Math.max(1, cell.colSpan || 1);
          const cellStart = column;
          const cellEnd = column + span - 1;
          const range = ranges.find((item) => cellStart >= item.start && cellEnd <= item.end);
          if (range) {
            cell.dataset.nmcRankGroup = range.rank;
            cell.dataset.nmcRankLevel = 'body';
            if (cellStart === range.start) cell.dataset.nmcRankEdge = 'left';
            if (cellEnd === range.end) cell.dataset.nmcRankEdge = cell.dataset.nmcRankEdge === 'left' ? 'both' : 'right';
          }
          column += span;
        });
      });
    });
  };

  const markTable = (table) => {
    if (!(table instanceof HTMLTableElement)) return;

    if (table.tHead) {
      Array.from(table.tHead.rows).forEach((row) => {
        const cells = Array.from(row.cells);
        const isEmpty = cells.length > 0 && cells.every((cell) => normalize(cell.textContent) === '');
        if (isEmpty) row.dataset.nmcEmptyHeader = '1';
        else delete row.dataset.nmcEmptyHeader;
      });
    }

    Array.from(table.tBodies || []).forEach((tbody) => {
      Array.from(tbody.rows).forEach((row) => {
        Array.from(row.cells).forEach((cell) => {
          if (isPositiveAchieved(cell.textContent)) cell.dataset.nmcAchieved = '1';
          else delete cell.dataset.nmcAchieved;
        });
      });
    });

    markRankGroups(table);
  };

  const markAll = () => {
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
      root.querySelectorAll('table').forEach(markTable);
    });
  };

  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(markAll), 90);
  };

  const mutationTouchesTables = (mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (target && target.closest && target.closest(ROOT_SELECTOR)) return true;
    return Array.from(mutation.addedNodes || []).some((node) => {
      if (!(node instanceof Element)) return false;
      return Boolean(node.matches(ROOT_SELECTOR) || node.querySelector(ROOT_SELECTOR) || node.matches('table') || node.querySelector('table'));
    });
  };

  const start = () => {
    markAll();
    window.setTimeout(markAll, 260);
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(mutationTouchesTables)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('load', schedule, { once: true });
    window.addEventListener('resize', schedule, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
