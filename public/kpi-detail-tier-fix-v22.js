(() => {
  'use strict';

  const TABLE_SELECTOR = 'table.nmc-kpi-v21-table';
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

  const mode = (values) => {
    if (!values.length) return null;
    const counts = new Map();
    values.forEach((value) => {
      const key = Math.round(value * 10) / 10;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  };

  const metricClass = (value) => {
    const text = normalize(value);
    if (/FYP|AFYP|\bIP\b|DOANH SO|DOANH THU|PHI/.test(text)) return 'production';
    if (/HDC|HOP DONG|HD C|SO LUONG|\bSL\b|TVV/.test(text)) return 'count';
    if (/TY LE|%|TLHT/.test(text)) return 'ratio';
    if (/THUONG|TIEN/.test(text)) return 'reward';
    return 'other';
  };

  const removeInlineTierLabel = (cell, label) => {
    const target = normalize(label);
    const descendants = Array.from(cell.querySelectorAll('*'));
    const exact = descendants.filter((node) => normalize(node.textContent || '') === target);
    if (exact.length) {
      // Prefer the deepest exact node so the criterion wrapper is preserved.
      exact.sort((a, b) => b.querySelectorAll('*').length - a.querySelectorAll('*').length);
      const node = exact[exact.length - 1] || exact[0];
      node.remove();
      return;
    }

    // Fallback for plain-text headers: strip only a leading tier label.
    const raw = String(cell.textContent || '').trim();
    const normalizedRaw = normalize(raw);
    if (normalizedRaw.startsWith(target)) {
      const remaining = raw.replace(/^\s*(HẠNG\s+VÀNG|HẠNG\s+BẠCH\s+KIM|HẠNG\s+KIM\s+CƯƠNG)\s*/i, '').trim();
      if (remaining) cell.textContent = remaining;
    }
  };

  const shouldMergeGroup = (cells, tier) => {
    if (!tier || cells.length < 2) return false;
    if (cells.some((cell) => cell.classList.contains('sv-rank-subcol'))) return true;

    const label = TIER_LABEL[tier] || '';
    const remainders = cells.map((cell) => {
      const text = normalize(cell.textContent || '');
      return text.replace(normalize(label), '').trim();
    });
    const metricKinds = new Set(remainders.map(metricClass).filter((kind) => kind !== 'other'));
    return metricKinds.size >= 2;
  };

  const splitLegacyGroupedHeader = (table) => {
    const thead = table.tHead;
    if (!thead || thead.rows.length !== 1 || table.dataset.nmcTierSplitV22 === '1') return false;

    const oldRow = thead.rows[0];
    const cells = Array.from(oldRow.cells);
    if (!cells.length) return false;

    const groups = [];
    let index = 0;
    while (index < cells.length) {
      const cell = cells[index];
      const tier = cell.dataset.nmcTier || '';
      if (!tier) {
        groups.push({ tier: '', cells: [cell], merge: false });
        index += 1;
        continue;
      }
      const same = [cell];
      let cursor = index + 1;
      while (cursor < cells.length && (cells[cursor].dataset.nmcTier || '') === tier) {
        same.push(cells[cursor]);
        cursor += 1;
      }
      groups.push({ tier, cells: same, merge: shouldMergeGroup(same, tier) });
      index = cursor;
    }

    if (!groups.some((group) => group.merge)) return false;

    const topRow = oldRow.cloneNode(false);
    const childRow = oldRow.cloneNode(false);
    topRow.removeAttribute('style');
    childRow.removeAttribute('style');

    groups.forEach((group) => {
      if (!group.merge) {
        group.cells.forEach((cell) => {
          cell.rowSpan = 2;
          topRow.appendChild(cell);
        });
        return;
      }

      const tier = group.tier;
      const label = TIER_LABEL[tier] || String(group.cells[0].textContent || '').trim();
      const parent = group.cells[0].cloneNode(false);
      parent.removeAttribute('rowspan');
      parent.colSpan = group.cells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan || 1), 0);
      parent.textContent = label;
      parent.dataset.nmcTier = tier;
      parent.dataset.nmcTierParent = '1';
      parent.dataset.nmcHeaderLevel = '0';
      parent.classList.remove('sv-rank-subcol');
      topRow.appendChild(parent);

      group.cells.forEach((cell) => {
        cell.rowSpan = 1;
        cell.dataset.nmcTier = tier;
        cell.dataset.nmcHeaderLevel = '1';
        removeInlineTierLabel(cell, label);
        childRow.appendChild(cell);
      });
    });

    oldRow.replaceWith(topRow);
    thead.appendChild(childRow);
    table.dataset.nmcTierSplitV22 = '1';
    return true;
  };

  const buildHeaderGrid = (table) => {
    const thead = table.tHead;
    if (!thead) return [];
    const grid = [];
    Array.from(thead.rows).forEach((row, rowIndex) => {
      if (!grid[rowIndex]) grid[rowIndex] = [];
      let column = 0;
      Array.from(row.cells).forEach((cell) => {
        while (grid[rowIndex][column]) column += 1;
        const colSpan = Math.max(1, cell.colSpan || 1);
        const rowSpan = Math.max(1, cell.rowSpan || 1);
        for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
          if (!grid[r]) grid[r] = [];
          for (let c = column; c < column + colSpan; c += 1) grid[r][c] = cell;
        }
        column += colSpan;
      });
    });
    return grid;
  };

  const markTierEdges = (table) => {
    table.querySelectorAll('[data-nmc-tier-edge]').forEach((cell) => delete cell.dataset.nmcTierEdge);
    const grid = buildHeaderGrid(table);
    const columnCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
    if (!columnCount) return;

    const columnTiers = Array.from({ length: columnCount }, (_, column) => {
      let tier = '';
      for (let row = 0; row < grid.length; row += 1) {
        const cell = grid[row] && grid[row][column];
        if (cell && cell.dataset.nmcTier) tier = cell.dataset.nmcTier;
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

    ranges.forEach(({ start, end }) => {
      Array.from(table.tHead?.rows || []).forEach((row) => {
        let column = 0;
        Array.from(row.cells).forEach((cell) => {
          const span = Math.max(1, cell.colSpan || 1);
          const cellStart = column;
          const cellEnd = column + span - 1;
          if (cellStart === start) cell.dataset.nmcTierEdge = cell.dataset.nmcTierEdge === 'right' ? 'both' : 'left';
          if (cellEnd === end) cell.dataset.nmcTierEdge = cell.dataset.nmcTierEdge === 'left' ? 'both' : 'right';
          column += span;
        });
      });

      Array.from(table.tBodies || []).forEach((tbody) => {
        Array.from(tbody.rows).forEach((row) => {
          let column = 0;
          Array.from(row.cells).forEach((cell) => {
            const span = Math.max(1, cell.colSpan || 1);
            const cellStart = column;
            const cellEnd = column + span - 1;
            if (cellStart === start) cell.dataset.nmcTierEdge = cell.dataset.nmcTierEdge === 'right' ? 'both' : 'left';
            if (cellEnd === end) cell.dataset.nmcTierEdge = cell.dataset.nmcTierEdge === 'left' ? 'both' : 'right';
            column += span;
          });
        });
      });
    });
  };

  const preserveAndNormalizeNaturalRows = (table) => {
    table.style.removeProperty('--nmc-natural-row-h');
    table.style.removeProperty('--nmc-natural-pad-top');
    table.style.removeProperty('--nmc-natural-pad-bottom');
    delete table.dataset.nmcNaturalRowH;

    const rows = Array.from(table.tBodies || [])
      .flatMap((tbody) => Array.from(tbody.rows))
      .filter((row) => row.cells.length > 1 && row.getBoundingClientRect().height > 0)
      .slice(0, 30);
    if (!rows.length) return;

    const heights = rows.map((row) => row.getBoundingClientRect().height).filter((height) => height >= 18 && height <= 80);
    const targetHeight = mode(heights);
    if (!targetHeight) return;

    const cells = rows.flatMap((row) => Array.from(row.cells)).slice(0, 120);
    const padTop = mode(cells.map((cell) => parseFloat(getComputedStyle(cell).paddingTop) || 0));
    const padBottom = mode(cells.map((cell) => parseFloat(getComputedStyle(cell).paddingBottom) || 0));

    table.style.setProperty('--nmc-natural-row-h', `${targetHeight}px`);
    if (padTop !== null) table.style.setProperty('--nmc-natural-pad-top', `${padTop}px`);
    if (padBottom !== null) table.style.setProperty('--nmc-natural-pad-bottom', `${padBottom}px`);
    table.dataset.nmcNaturalRowH = String(targetHeight);
  };

  const styleTable = (table) => {
    if (!(table instanceof HTMLTableElement) || !table.tHead) return;
    const split = splitLegacyGroupedHeader(table);
    markTierEdges(table);
    preserveAndNormalizeNaturalRows(table);

    // v21 observes the header mutation and refreshes semantic tags. Re-run edges/height once after it settles.
    if (split) {
      window.setTimeout(() => {
        markTierEdges(table);
        preserveAndNormalizeNaturalRows(table);
      }, 140);
    }
  };

  const styleAll = () => document.querySelectorAll(TABLE_SELECTOR).forEach(styleTable);

  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(styleAll), 100);
  };

  const start = () => {
    styleAll();
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        return Boolean(target && (target.matches?.(TABLE_SELECTOR) || target.closest?.(TABLE_SELECTOR))) || Array.from(mutation.addedNodes || []).some((node) => node instanceof Element && (node.matches(TABLE_SELECTOR) || node.querySelector(TABLE_SELECTOR)));
      })) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', schedule, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
