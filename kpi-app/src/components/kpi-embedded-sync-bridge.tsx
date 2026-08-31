'use client';

import { useEffect } from 'react';

type SyncPayload = {
  type: 'nmc-kpi-sync-meta';
  label: string;
  ok: boolean;
};

const TARGET_MONTH_LABEL = '9/2026';

const patchTargetRegistrationCampaign = () => {
  if (!document.querySelector('.kpi-app')) return;
  const selectors = [
    '.target-reg-btn:not(.target-reg-list-btn)',
    '.desktop-target-inline:not(.desktop-target-list-inline)',
    '.tgr-modal-title',
    '.tgr-list-heading-bottom',
  ].join(',');

  document.querySelectorAll<HTMLElement>(selectors).forEach((node) => {
    const text = node.textContent || '';
    if (!/mục tiêu tháng\s+\d{1,2}\/\d{4}/i.test(text)) return;
    node.textContent = text.replace(/tháng\s+\d{1,2}\/\d{4}/i, `Tháng ${TARGET_MONTH_LABEL}`);
  });
};

export function KpiEmbeddedSyncBridge() {
  useEffect(() => {
    let timer = 0;

    const renderInKpiHeader = (payload: SyncPayload) => {
      const title = document.querySelector<HTMLElement>('.kpi-embed-title');
      if (!title) return;
      let badge = title.querySelector<HTMLElement>('.nmc-kpi-sync-inline');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nmc-kpi-sync-inline';
        title.appendChild(badge);
      }
      badge.dataset.ok = payload.ok ? '1' : '0';
      badge.innerHTML = `<i aria-hidden="true"></i><span>${payload.label}</span>`;
    };

    const onMessage = (event: MessageEvent) => {
      const data = event.data as Partial<SyncPayload> | null;
      if (!data || data.type !== 'nmc-kpi-sync-meta' || typeof data.label !== 'string') return;
      renderInKpiHeader({ type: 'nmc-kpi-sync-meta', label: data.label, ok: Boolean(data.ok) });
    };

    const schedulePatch = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(patchTargetRegistrationCampaign, 50);
    };

    window.addEventListener('message', onMessage);
    patchTargetRegistrationCampaign();
    const observer = new MutationObserver(schedulePatch);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
