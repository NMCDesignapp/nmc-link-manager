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
  };

  const markAll = () => {
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
      root.querySelectorAll('table').forEach(markTable);
    });
  };

  let timer = 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(markAll), 50);
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
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(mutationTouchesTables)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('load', schedule, { once: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
