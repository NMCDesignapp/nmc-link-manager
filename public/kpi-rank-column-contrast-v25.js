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

  const tierFromText = (value) => {
    const text = normalize(value);
    if (/HANG\s*BACH\s*KIM|\bBACH\s*KIM\b|PLATINUM/.test(text)) return 'platinum';
    if (/HANG\s*KIM\s*CUONG|\bKIM\s*CUONG\b|DIAMOND/.test(text)) return 'diamond';
    if (/HANG\s*VANG|\bVANG\b|GOLD/.test(text)) return 'gold';
    return '';
  };

  const clearMarks = (table) => {
    table.querySelectorAll('[data-nmc-rank-group]').forEach((cell) => {
      delete cell.dataset.nmcRankGroup;
      delete cell.dataset.nmcRankLevel;
      delete cell.dataset.nmcRankEdge;
    });
  };

  const buildGrid = (thead) => {
    const grid = [];
    const metas = [];
    Array.from(thead.rows).forEach((row, rowIndex) => {
      if (!grid[rowIndex]) grid[rowIndex] = [];
      let col = 0;
      Array.from(row.cells).forEach((cell) => {
        while (grid[rowIndex][col]) col += 1;
        const colSpan = Math.max(1, cell.colSpan || 1);
        const rowSpan = Math.max(1, cell.rowSpan || 1);
        const meta = { cell, rowIndex, start: col, end: col + colSpan - 1, tier: tierFromText(cell.textContent || '') || cell.dataset.nmcTier || '' };
        metas.push(meta);
        for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
          if (!grid[r]) grid[r] = [];
          for (let c = col; c < col + colSpan; c += 1) grid[r][c] = meta;
        }
        col += colSpan;
      });
    });
    return { grid, metas };
  };

  const markTable = (table) => {
    if (!(table instanceof HTMLTableElement) || !table.tHead) return;
    clearMarks(table);

    const { grid, metas } = buildGrid(table.tHead);
    const columnCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
    if (!columnCount) return;

    const columnTiers = Array.from({ length: columnCount }, (_, column) => {
      let tier = '';
      for (let row = 0; row < grid.length; row += 1) {
        const meta = grid[row] && grid[row][column];
        if (meta && meta.tier) tier = meta.tier;
      }
      return tier;
    });

    const ranges = [];
    let start = 0;
    while (start < columnCount) {
      const tier = columnTiers[start];
      let end = start;
      while (end + 1 < columnCount && columnTiers[end + 1] === tier) end += 1;
      if (tier) ranges.push({ tier, start, end });
      start = end + 1;
    }

    if (!ranges.length) return;

    metas.forEach((meta) => {
      const range = ranges.find((item) => meta.start >= item.start && meta.end <= item.end);
      if (!range) return;
      meta.cell.dataset.nmcRankGroup = range.tier;
      const ownTier = tierFromText(meta.cell.textContent || '');
      meta.cell.dataset.nmcRankLevel = ownTier ? 'parent' : 'child';
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
            cell.dataset.nmcRankGroup = range.tier;
            cell.dataset.nmcRankLevel = 'body';
            if (cellStart === range.start) cell.dataset.nmcRankEdge = 'left';
            if (cellEnd === range.end) cell.dataset.nmcRankEdge = cell.dataset.nmcRankEdge === 'left' ? 'both' : 'right';
          }
          column += span;
        });
      });
    });
  };

  const markAll = () => document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
    root.querySelectorAll('table').forEach(markTable);
  });

  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(markAll), 120);
  };

  const start = () => {
    markAll();
    window.setTimeout(markAll, 250);
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return Boolean(target && target.closest?.(ROOT_SELECTOR)) || Array.from(mutation.addedNodes || []).some((node) => node instanceof Element && (node.matches?.(ROOT_SELECTOR) || node.querySelector?.(ROOT_SELECTOR)));
      })) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
