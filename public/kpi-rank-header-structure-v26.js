(() => {
  'use strict';

  const ROOT_SELECTOR = [
    '.policy-detail-table-wrapper',
    '.saoviet-detail-table-wrapper',
    '.clbsv-detail-table-wrapper',
    '[data-policy-table]',
    '[data-saoviet-table]',
    '[data-clb-saoviet-table]',
    '.contest-result-table-wrapper',
    '#result-table-container',
  ].join(',');

  const TABLE_SELECTOR = `${ROOT_SELECTOR} table, table.nmc-kpi-v21-table`;
  const TIER_LABEL = {
    gold: 'HẠNG VÀNG',
    platinum: 'HẠNG BẠCH KIM',
    diamond: 'HẠNG KIM CƯƠNG',
  };

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

  const removeTierLabel = (cell, tier) => {
    const label = TIER_LABEL[tier] || '';
    const target = normalize(label);
    const nodes = Array.from(cell.querySelectorAll('*'))
      .filter((node) => normalize(node.textContent || '') === target)
      .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);
    if (nodes.length) {
      nodes[0].remove();
      return;
    }

    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const value = String(textNode.nodeValue || '');
      const normalized = normalize(value);
      if (normalized.includes(target)) {
        textNode.nodeValue = value
          .replace(/HẠNG\s+BẠCH\s+KIM/ig, '')
          .replace(/HẠNG\s+KIM\s+CƯƠNG/ig, '')
          .replace(/HẠNG\s+VÀNG/ig, '')
          .replace(/BẠCH\s+KIM/ig, '')
          .replace(/KIM\s+CƯƠNG/ig, '')
          .trim();
        return;
      }
      textNode = walker.nextNode();
    }

    const raw = String(cell.textContent || '').trim();
    const remaining = raw
      .replace(/^\s*(HẠNG\s+BẠCH\s+KIM|HẠNG\s+KIM\s+CƯƠNG|HẠNG\s+VÀNG)\s*/i, '')
      .trim();
    if (remaining) cell.textContent = remaining;
  };

  const splitSingleRowRankHeader = (table) => {
    const thead = table.tHead;
    if (!thead || thead.rows.length !== 1 || table.dataset.nmcRankStructureV26 === '1') return false;

    const oldRow = thead.rows[0];
    const cells = Array.from(oldRow.cells);
    if (!cells.some((cell) => tierFromText(cell.textContent || '') || cell.dataset.nmcTier)) return false;

    const groups = [];
    let index = 0;
    while (index < cells.length) {
      const first = cells[index];
      const tier = first.dataset.nmcTier || tierFromText(first.textContent || '');
      if (!tier) {
        groups.push({ tier: '', cells: [first] });
        index += 1;
        continue;
      }

      const same = [first];
      let cursor = index + 1;
      while (cursor < cells.length) {
        const nextTier = cells[cursor].dataset.nmcTier || tierFromText(cells[cursor].textContent || '');
        if (nextTier !== tier) break;
        same.push(cells[cursor]);
        cursor += 1;
      }
      groups.push({ tier, cells: same });
      index = cursor;
    }

    const topRow = oldRow.cloneNode(false);
    const childRow = oldRow.cloneNode(false);
    topRow.removeAttribute('style');
    childRow.removeAttribute('style');
    topRow.dataset.nmcRankHeaderLevel = 'parent';
    childRow.dataset.nmcRankHeaderLevel = 'child';

    groups.forEach((group) => {
      if (!group.tier) {
        group.cells.forEach((cell) => {
          cell.rowSpan = 2;
          topRow.appendChild(cell);
        });
        return;
      }

      const tier = group.tier;
      const parent = group.cells[0].cloneNode(false);
      parent.removeAttribute('rowspan');
      parent.colSpan = group.cells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan || 1), 0);
      parent.textContent = TIER_LABEL[tier];
      parent.dataset.nmcTier = tier;
      parent.dataset.nmcRankGroup = tier;
      parent.dataset.nmcRankLevel = 'parent';
      parent.style.removeProperty('width');
      parent.style.removeProperty('min-width');
      parent.style.removeProperty('max-width');
      topRow.appendChild(parent);

      group.cells.forEach((cell) => {
        cell.rowSpan = 1;
        cell.dataset.nmcTier = tier;
        cell.dataset.nmcRankGroup = tier;
        cell.dataset.nmcRankLevel = 'child';
        removeTierLabel(cell, tier);
        childRow.appendChild(cell);
      });
    });

    oldRow.replaceWith(topRow);
    thead.appendChild(childRow);
    table.dataset.nmcRankStructureV26 = '1';
    return true;
  };

  const buildGrid = (thead) => {
    const grid = [];
    const metas = [];
    Array.from(thead.rows).forEach((row, rowIndex) => {
      if (!grid[rowIndex]) grid[rowIndex] = [];
      let column = 0;
      Array.from(row.cells).forEach((cell) => {
        while (grid[rowIndex][column]) column += 1;
        const colSpan = Math.max(1, cell.colSpan || 1);
        const rowSpan = Math.max(1, cell.rowSpan || 1);
        const tier = cell.dataset.nmcTier || tierFromText(cell.textContent || '');
        const meta = { cell, rowIndex, start: column, end: column + colSpan - 1, tier };
        metas.push(meta);
        for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
          if (!grid[r]) grid[r] = [];
          for (let c = column; c < column + colSpan; c += 1) grid[r][c] = meta;
        }
        column += colSpan;
      });
    });
    return { grid, metas };
  };

  const markRankColumns = (table) => {
    if (!table.tHead) return;
    table.querySelectorAll('[data-nmc-rank-group]').forEach((cell) => {
      delete cell.dataset.nmcRankGroup;
      delete cell.dataset.nmcRankLevel;
      delete cell.dataset.nmcRankEdge;
    });

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

    metas.forEach((meta) => {
      const range = ranges.find((item) => meta.start >= item.start && meta.end <= item.end);
      if (!range) return;
      meta.cell.dataset.nmcRankGroup = range.tier;
      const ownTier = meta.cell.dataset.nmcTier || tierFromText(meta.cell.textContent || '');
      meta.cell.dataset.nmcRankLevel = meta.rowIndex === 0 && ownTier ? 'parent' : 'child';
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

  const processTable = (table) => {
    if (!(table instanceof HTMLTableElement) || !table.tHead) return;
    splitSingleRowRankHeader(table);
    markRankColumns(table);
  };

  const processAll = () => document.querySelectorAll(TABLE_SELECTOR).forEach(processTable);

  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(processAll), 80);
  };

  const start = () => {
    processAll();
    window.setTimeout(processAll, 220);
    window.setTimeout(processAll, 700);
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        if (target && (target.matches?.(TABLE_SELECTOR) || target.closest?.(ROOT_SELECTOR))) return true;
        return Array.from(mutation.addedNodes || []).some((node) =>
          node instanceof Element && (node.matches?.(TABLE_SELECTOR) || node.querySelector?.(TABLE_SELECTOR) || node.matches?.(ROOT_SELECTOR) || node.querySelector?.(ROOT_SELECTOR))
        );
      })) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();