(() => {
  'use strict';

  /*
   * KPI table runtime v27
   * One incremental observer replaces the overlapping v21/v22/v24/v25/v26
   * table observers. Existing CSS layers remain in place so this file changes
   * runtime work, not the established table geometry/design language.
   */

  const ROOTS = [
    { selector: '.clbsv-detail-table-wrapper', theme: 'green' },
    { selector: '.saoviet-detail-table-wrapper', theme: 'green' },
    { selector: '.policy-detail-table-wrapper', theme: 'navy' },
    { selector: '.contest-result-table-wrapper', theme: 'navy' },
    { selector: '#result-table-container', theme: 'navy' },
    { selector: '[data-clb-saoviet-table]', theme: 'green' },
    { selector: '[data-saoviet-table]', theme: 'green' },
    { selector: '[data-policy-table]', theme: 'navy' },
  ];

  const ROOT_SELECTOR = ROOTS.map((item) => item.selector).join(',');
  const MIRROR_SELECTOR = '.nmc-kpi-sticky-header-overlay table, table[data-nmc-kpi-mirror-table="header"]';
  const TABLE_CLASS = 'nmc-kpi-v21-table';
  const TIER_LABEL = {
    gold: 'HẠNG VÀNG',
    platinum: 'HẠNG BẠCH KIM',
    diamond: 'HẠNG KIM CƯƠNG',
  };

  const pending = new Map();
  const measuredTables = new WeakSet();
  let rafId = 0;
  let resizeTimer = 0;

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

  const isPositiveAchieved = (value) => {
    const text = normalize(value);
    if (!text || /CHUA DAT|KHONG DAT|CHUA DU|KHONG DU/.test(text)) return false;
    return /(^|[^A-Z0-9])DAT([^A-Z0-9]|$)/.test(text);
  };

  const mode = (values) => {
    if (!values.length) return null;
    const counts = new Map();
    values.forEach((value) => {
      const key = Math.round(value * 10) / 10;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  };

  const isMirrorTable = (table) => Boolean(table.closest('.nmc-kpi-sticky-header-overlay') || table.matches('[data-nmc-kpi-mirror-table="header"]'));

  const isEligibleTable = (table) => {
    if (!(table instanceof HTMLTableElement)) return false;
    return Boolean(table.closest(ROOT_SELECTOR) || table.classList.contains(TABLE_CLASS) || isMirrorTable(table));
  };

  const themeForTable = (table) => {
    if (table.dataset.nmcTheme) return table.dataset.nmcTheme;
    for (const item of ROOTS) {
      if (table.closest(item.selector)) return item.theme;
    }
    const source = Array.from(document.querySelectorAll(`table.${TABLE_CLASS}:not([data-nmc-kpi-mirror-table="header"])`))
      .find((candidate) => !isMirrorTable(candidate) && candidate.dataset.nmcTheme);
    return source?.dataset.nmcTheme || 'navy';
  };

  const programForTable = (table) => {
    if (table.dataset.nmcProgram) return table.dataset.nmcProgram;
    const owner = table.closest('[data-policy-table], [data-saoviet-table], [data-clb-saoviet-table]');
    if (owner) {
      return owner.getAttribute('data-policy-table') || owner.getAttribute('data-saoviet-table') || owner.getAttribute('data-clb-saoviet-table') || '';
    }
    if (isMirrorTable(table)) {
      const visibleSource = Array.from(document.querySelectorAll(`table.${TABLE_CLASS}[data-nmc-program]`)).find((candidate) => {
        if (isMirrorTable(candidate)) return false;
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return visibleSource?.dataset.nmcProgram || '';
    }
    return '';
  };

  const removeTierLabel = (cell, tier) => {
    const label = TIER_LABEL[tier] || '';
    if (!label) return;
    const target = normalize(label);
    const exactNodes = Array.from(cell.querySelectorAll('*'))
      .filter((node) => normalize(node.textContent || '') === target)
      .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length);
    if (exactNodes.length) {
      exactNodes[0].remove();
      return;
    }

    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
      const value = String(textNode.nodeValue || '');
      if (normalize(value).includes(target)) {
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
  };

  const splitSingleRowRankHeader = (table) => {
    const thead = table.tHead;
    if (!thead || thead.rows.length !== 1 || table.dataset.nmcRankStructureV27 === '1') return false;
    const oldRow = thead.rows[0];
    const cells = Array.from(oldRow.cells);
    if (!cells.some((cell) => cell.dataset.nmcTier || tierFromText(cell.textContent || ''))) return false;

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

      const parent = group.cells[0].cloneNode(false);
      parent.removeAttribute('rowspan');
      parent.colSpan = group.cells.reduce((sum, cell) => sum + Math.max(1, cell.colSpan || 1), 0);
      parent.textContent = TIER_LABEL[group.tier];
      parent.dataset.nmcTier = group.tier;
      parent.dataset.nmcRankGroup = group.tier;
      parent.dataset.nmcRankLevel = 'parent';
      parent.style.removeProperty('width');
      parent.style.removeProperty('min-width');
      parent.style.removeProperty('max-width');
      topRow.appendChild(parent);

      group.cells.forEach((cell) => {
        cell.rowSpan = 1;
        cell.dataset.nmcTier = group.tier;
        cell.dataset.nmcRankGroup = group.tier;
        cell.dataset.nmcRankLevel = 'child';
        removeTierLabel(cell, group.tier);
        childRow.appendChild(cell);
      });
    });

    oldRow.replaceWith(topRow);
    thead.appendChild(childRow);
    table.dataset.nmcRankStructureV27 = '1';
    return true;
  };

  const buildHeaderModel = (table) => {
    const thead = table.tHead;
    if (!thead || !thead.rows.length) return null;
    const grid = [];
    const metas = [];

    Array.from(thead.rows).forEach((row, rowIndex) => {
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
          ownTier: cell.dataset.nmcTier || tierFromText(cell.textContent || ''),
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
        if (meta.ownTier) tier = meta.ownTier;
        if (meta.target) target = true;
        leafText = meta.text || leafText;
      }
      return { tier, target: target || Boolean(tier), leafText };
    });

    const ranges = [];
    let start = 0;
    while (start < columnCount) {
      const tier = columns[start]?.tier || '';
      let end = start;
      while (end + 1 < columnCount && (columns[end + 1]?.tier || '') === tier) end += 1;
      if (tier) ranges.push({ tier, start, end });
      start = end + 1;
    }

    return { metas, columns, ranges };
  };

  const setEdge = (cell, side) => {
    if (side === 'left') cell.dataset.nmcRankEdge = cell.dataset.nmcRankEdge === 'right' ? 'both' : 'left';
    if (side === 'right') cell.dataset.nmcRankEdge = cell.dataset.nmcRankEdge === 'left' ? 'both' : 'right';
    cell.dataset.nmcTierEdge = cell.dataset.nmcRankEdge;
  };

  const clearHeaderAttrs = (cell) => {
    delete cell.dataset.nmcTarget;
    delete cell.dataset.nmcHeaderLevel;
    delete cell.dataset.nmcRankGroup;
    delete cell.dataset.nmcRankLevel;
    delete cell.dataset.nmcRankEdge;
    delete cell.dataset.nmcTierEdge;
  };

  const formatHeaderSublines = (table) => {
    if (!table.tHead) return;
    table.tHead.querySelectorAll('th,td').forEach((cell) => {
      cell.querySelectorAll('br').forEach((br) => {
        let node = br.nextSibling;
        while (node && node.nodeType === Node.TEXT_NODE && !String(node.nodeValue || '').trim()) node = node.nextSibling;
        if (!(node instanceof HTMLElement) || !/^(SPAN|SMALL|EM)$/i.test(node.tagName)) return;
        const text = String(node.textContent || '').trim();
        if (!text) return;
        node.classList.add('nmc-header-subline-v27');
        if (!/^\(.*\)$/.test(text)) node.textContent = `(${text})`;
      });
    });
  };

  const applyHeaderModel = (table, model) => {
    if (!model || !table.tHead) return;
    Array.from(table.tHead.rows).forEach((row) => {
      const cells = Array.from(row.cells);
      const empty = cells.length > 0 && cells.every((cell) => normalize(cell.textContent || '') === '');
      if (empty) row.dataset.nmcEmptyHeader = '1';
      else delete row.dataset.nmcEmptyHeader;
    });

    model.metas.forEach((meta) => {
      const cell = meta.cell;
      clearHeaderAttrs(cell);
      cell.dataset.nmcHeaderLevel = String(meta.rowIndex);
      const spanColumns = model.columns.slice(meta.start, meta.end + 1);
      const tiers = Array.from(new Set(spanColumns.map((item) => item.tier).filter(Boolean)));
      const tier = meta.ownTier || (tiers.length === 1 ? tiers[0] : '');
      if (tier) cell.dataset.nmcTier = tier;
      if (meta.target || spanColumns.some((item) => item.target)) cell.dataset.nmcTarget = '1';

      const range = model.ranges.find((item) => meta.start >= item.start && meta.end <= item.end);
      if (range) {
        cell.dataset.nmcRankGroup = range.tier;
        cell.dataset.nmcRankLevel = tierFromText(meta.text) ? 'parent' : 'child';
        if (meta.start === range.start) setEdge(cell, 'left');
        if (meta.end === range.end) setEdge(cell, 'right');
      }
    });
  };

  const clearBodyAttrs = (cell) => {
    delete cell.dataset.nmcTier;
    delete cell.dataset.nmcTarget;
    delete cell.dataset.nmcIdentity;
    delete cell.dataset.nmcNumeric;
    delete cell.dataset.nmcNegative;
    delete cell.dataset.nmcAchieved;
    delete cell.dataset.nmcRankGroup;
    delete cell.dataset.nmcRankLevel;
    delete cell.dataset.nmcRankEdge;
    delete cell.dataset.nmcTierEdge;
  };

  const applyBodyModel = (table, model) => {
    if (!model || isMirrorTable(table)) return;
    Array.from(table.tBodies || []).forEach((tbody) => {
      Array.from(tbody.rows).forEach((row) => {
        let columnIndex = 0;
        Array.from(row.cells).forEach((cell) => {
          clearBodyAttrs(cell);
          const span = Math.max(1, cell.colSpan || 1);
          const infos = model.columns.slice(columnIndex, columnIndex + span);
          const first = infos[0] || { tier: '', target: false, leafText: '' };
          const tiers = Array.from(new Set(infos.map((item) => item.tier).filter(Boolean)));
          const tier = tiers.length === 1 ? tiers[0] : first.tier;
          const headerText = first.leafText || '';
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
          if (isPositiveAchieved(value)) cell.dataset.nmcAchieved = '1';

          const cellStart = columnIndex;
          const cellEnd = columnIndex + span - 1;
          const range = model.ranges.find((item) => cellStart >= item.start && cellEnd <= item.end);
          if (range) {
            cell.dataset.nmcRankGroup = range.tier;
            cell.dataset.nmcRankLevel = 'body';
            if (cellStart === range.start) setEdge(cell, 'left');
            if (cellEnd === range.end) setEdge(cell, 'right');
          }
          columnIndex += span;
        });
      });
    });
  };

  const measureNaturalRows = (table, force) => {
    if (isMirrorTable(table) || (!force && measuredTables.has(table))) return;
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
    measuredTables.add(table);
  };

  const processTable = (table, forceMeasure = false) => {
    if (!isEligibleTable(table) || !table.tHead) return;
    table.classList.add(TABLE_CLASS);
    table.dataset.nmcTheme = themeForTable(table);
    const program = programForTable(table);
    if (program) table.dataset.nmcProgram = program;

    if (!isMirrorTable(table)) splitSingleRowRankHeader(table);
    const model = buildHeaderModel(table);
    if (!model) return;
    applyHeaderModel(table, model);
    applyBodyModel(table, model);
    formatHeaderSublines(table);
    measureNaturalRows(table, forceMeasure);
  };

  const flush = () => {
    rafId = 0;
    const work = Array.from(pending.entries());
    pending.clear();
    work.forEach(([table, options]) => {
      if (table.isConnected) processTable(table, options.measure);
    });
  };

  const enqueue = (table, measure = false) => {
    if (!isEligibleTable(table)) return;
    const existing = pending.get(table);
    pending.set(table, { measure: Boolean(measure || existing?.measure) });
    if (!rafId) rafId = window.requestAnimationFrame(flush);
  };

  const enqueueFromElement = (element, measure = false) => {
    if (!(element instanceof Element)) return;
    if (element instanceof HTMLTableElement) enqueue(element, measure);
    const ownerTable = element.closest('table');
    if (ownerTable) enqueue(ownerTable, measure || /^(TBODY|THEAD|TR)$/i.test(element.tagName));
    element.querySelectorAll('table').forEach((table) => enqueue(table, measure));
  };

  const scanInitial = () => {
    const seen = new Set();
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
      root.querySelectorAll('table').forEach((table) => {
        if (seen.has(table)) return;
        seen.add(table);
        enqueue(table, true);
      });
    });
    document.querySelectorAll(MIRROR_SELECTOR).forEach((table) => enqueue(table, false));
  };

  const start = () => {
    scanInitial();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;
          const table = parent?.closest?.('table');
          if (table) enqueue(table, false);
          return;
        }

        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        if (target) {
          const table = target.closest?.('table');
          if (table) enqueue(table, target.tagName === 'TBODY' || target.tagName === 'THEAD');
        }
        Array.from(mutation.addedNodes || []).forEach((node) => {
          if (node instanceof Element) enqueueFromElement(node, /^(TABLE|TBODY|THEAD|TR)$/i.test(node.tagName));
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        document.querySelectorAll(`table.${TABLE_CLASS}`).forEach((table) => enqueue(table, true));
      }, 140);
    }, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
