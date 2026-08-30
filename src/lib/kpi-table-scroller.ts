const MOBILE_KPI_QUERY = '(max-width: 640px)';

const clearFlowMarkers = (root: HTMLElement) => {
  root.removeAttribute('data-nmc-kpi-vertical-flow');
  Array.from(root.children).forEach((child) => {
    if (child instanceof HTMLElement) child.removeAttribute('data-nmc-kpi-horizontal-scroller');
  });
};

const prepareMobileFlowScroller = (root: HTMLElement, table: HTMLTableElement) => {
  clearFlowMarkers(root);
  if (!window.matchMedia(MOBILE_KPI_QUERY).matches) return null;
  if (!root.closest('[data-nmc-kpi-detail-stack]')) return null;

  let directChild: HTMLElement = table;
  while (directChild.parentElement && directChild.parentElement !== root) {
    directChild = directChild.parentElement;
  }
  if (directChild === table || directChild.parentElement !== root) return null;

  root.setAttribute('data-nmc-kpi-vertical-flow', '1');
  directChild.setAttribute('data-nmc-kpi-horizontal-scroller', '1');
  return directChild;
};

export const findKpiHorizontalScroller = (root: HTMLElement, table?: HTMLTableElement | null) => {
  const sourceTable = table || root.querySelector<HTMLTableElement>('table:not([data-nmc-kpi-mirror-table])');
  const flowScroller = sourceTable ? prepareMobileFlowScroller(root, sourceTable) : null;
  const candidates = [
    flowScroller,
    root.querySelector<HTMLElement>('[data-nmc-kpi-horizontal-scroller="1"]'),
    root.querySelector<HTMLElement>('[data-slot="table-container"]'),
    root,
  ].filter(Boolean) as HTMLElement[];

  return candidates.find((element) => element.scrollWidth > element.clientWidth + 2) || flowScroller || root;
};
