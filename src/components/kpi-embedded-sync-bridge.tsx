'use client';

import { useEffect } from 'react';

type SyncPayload = {
  type: 'nmc-kpi-sync-meta';
  label: string;
  ok: boolean;
};

const TARGET_MONTH_LABEL = '9/2026';

const formatCompact = (title: string) => {
  const raw = title.replace(/^Lần đồng bộ gần nhất:\s*/i, '').trim();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.replace(/^Lần gần nhất:\s*/i, '');
  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    hour12: false,
  });
};

const findSyncStatus = () => {
  const node = document.querySelector<HTMLElement>('[title^="Lần đồng bộ gần nhất:"]');
  if (!node) return null;
  const title = node.getAttribute('title') || '';
  const ok = /đang kết nối|google sheets/i.test(node.textContent || '') || Boolean(node.querySelector('.bg-emerald-400'));
  return { node, label: formatCompact(title), ok };
};

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

    const publishFromEmbeddedSheet = () => {
      if (window.self === window.top) return;
      if (document.documentElement.getAttribute('data-kpi-embed') !== '1') return;
      const sync = findSyncStatus();
      if (!sync) return;
      sync.node.classList.add('nmc-kpi-sync-relocated');
      const payload: SyncPayload = { type: 'nmc-kpi-sync-meta', label: sync.label, ok: sync.ok };
      window.parent.postMessage(payload, '*');
    };

    const renderInKpiHeader = (payload: SyncPayload) => {
      if (window.self !== window.top) return;
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

    const schedulePublish = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        publishFromEmbeddedSheet();
        patchTargetRegistrationCampaign();
      }, 60);
    };

    window.addEventListener('message', onMessage);
    publishFromEmbeddedSheet();
    patchTargetRegistrationCampaign();

    const observer = new MutationObserver(() => schedulePublish());
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'class'] });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('message', onMessage);
    };
  }, []);

  return null;
}
