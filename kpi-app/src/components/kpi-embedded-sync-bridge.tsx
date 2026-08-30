'use client';

import { useEffect } from 'react';

type SyncPayload = {
  type: 'nmc-kpi-sync-meta';
  label: string;
  ok: boolean;
};

export function KpiEmbeddedSyncBridge() {
  useEffect(() => {
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

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return null;
}
