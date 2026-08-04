'use client';

import { useEffect } from 'react';

const EXCEL_CONNECTED = 'Excel trên máy tính đang kết nối';
const EXCEL_DISCONNECTED = 'Excel trên máy tính chưa kết nối';
const GOOGLE_ENABLED = 'Google Sheets đang bật';
const LAST_SYNC_PREFIX = 'Lần gần nhất:';

type SyncStatusResponse = {
  source?: 'data-hub' | 'google';
  googleEnabled?: boolean;
  dataHubOnline?: boolean;
  lastSyncAt?: string;
  lastResult?: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isValidSyncTime(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

function isLatestDataHubRunSuccessful(lastResult: unknown) {
  if (typeof lastResult !== 'string' || !lastResult.trim()) return false;
  try {
    const results = JSON.parse(lastResult) as unknown;
    return Array.isArray(results)
      && results.length > 0
      && results.every((result) => (
        !!result
        && typeof result === 'object'
        && (result as { ok?: unknown }).ok === true
      ));
  } catch {
    return false;
  }
}

function getSyncHealth(status: SyncStatusResponse) {
  const hasSuccessfulSyncTime = isValidSyncTime(status.lastSyncAt);

  if (status.source === 'google') {
    return status.googleEnabled === true && hasSuccessfulSyncTime;
  }

  return status.source === 'data-hub'
    && status.dataHubOnline === true
    && hasSuccessfulSyncTime
    && isLatestDataHubRunSuccessful(status.lastResult);
}

function applyCompactSyncStatus(root: ParentNode, syncHealthy: boolean) {
  const spans = root.querySelectorAll<HTMLSpanElement>('main span');

  spans.forEach((span) => {
    const text = normalizeText(span.textContent);

    if (text === EXCEL_CONNECTED || text === EXCEL_DISCONNECTED || text === GOOGLE_ENABLED) {
      const isGoogle = text === GOOGLE_ENABLED;
      const isDisconnected = text === EXCEL_DISCONNECTED;

      span.classList.remove(
        'nmc-sync-source-icon--google',
        'nmc-sync-source-icon--excel',
        'nmc-sync-source-icon--offline',
      );
      span.classList.add(
        'nmc-sync-source-icon',
        isGoogle ? 'nmc-sync-source-icon--google' : 'nmc-sync-source-icon--excel',
      );
      if (isDisconnected || !syncHealthy) span.classList.add('nmc-sync-source-icon--offline');

      span.setAttribute('aria-label', isGoogle ? 'Nguồn Google Sheets' : 'Nguồn Excel trên máy tính');
      span.setAttribute('title', isGoogle ? 'Google Sheets' : 'Excel trên máy tính');

      const statusShell = span.parentElement;
      if (statusShell) {
        statusShell.classList.add('nmc-sync-status-shell');
        statusShell.dataset.syncHealth = syncHealthy ? 'healthy' : 'unhealthy';
      }

      const indicator = span.previousElementSibling;
      if (indicator instanceof HTMLElement) indicator.classList.add('nmc-sync-status-hidden');
      return;
    }

    if (text.startsWith(LAST_SYNC_PREFIX)) {
      const value = normalizeText(text.slice(LAST_SYNC_PREFIX.length));
      const displayValue = value && value !== 'chưa có dữ liệu' ? value : '—';

      span.classList.remove('nmc-sync-time-only--healthy', 'nmc-sync-time-only--unhealthy');
      span.classList.add(
        'nmc-sync-time-only',
        syncHealthy ? 'nmc-sync-time-only--healthy' : 'nmc-sync-time-only--unhealthy',
      );
      span.dataset.syncTime = displayValue;
      span.setAttribute(
        'aria-label',
        displayValue !== '—'
          ? `${syncHealthy ? 'Đồng bộ thành công' : 'Đồng bộ đang mất kết nối hoặc có lỗi'}; lần gần nhất: ${displayValue}`
          : 'Chưa có lần đồng bộ thành công',
      );
      span.setAttribute(
        'title',
        syncHealthy
          ? `Đã đồng bộ thành công lúc ${displayValue}`
          : `Mất kết nối hoặc lượt đồng bộ gần nhất có lỗi. Lần thành công gần nhất: ${displayValue}`,
      );

      const separator = span.previousElementSibling;
      if (separator instanceof HTMLElement && normalizeText(separator.textContent) === '•') {
        separator.classList.add('nmc-sync-status-hidden');
      }
    }
  });
}

export function CompactSyncStatus() {
  useEffect(() => {
    let frame = 0;
    let syncHealthy = false;
    let stopped = false;

    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (!stopped) applyCompactSyncStatus(document, syncHealthy);
      });
    };

    const refreshHealth = async () => {
      try {
        const response = await fetch('/api/sync-source', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const status = await response.json() as SyncStatusResponse;
        syncHealthy = getSyncHealth(status);
      } catch {
        syncHealthy = false;
      }
      apply();
    };

    apply();
    void refreshHealth();

    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    const statusTimer = window.setInterval(() => {
      void refreshHealth();
    }, 10_000);

    return () => {
      stopped = true;
      observer.disconnect();
      window.clearInterval(statusTimer);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style>{`
      .nmc-sync-status-hidden {
        display: none !important;
      }

      .nmc-sync-status-shell {
        min-height: 22px !important;
        padding: 0 2px !important;
        border-color: transparent !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        color: #e5e7eb !important;
        gap: 8px !important;
      }

      .nmc-sync-source-icon {
        position: relative;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        min-width: 20px;
        padding: 0 !important;
        border: 1px solid currentColor;
        border-radius: 5px;
        font-size: 0 !important;
        line-height: 1 !important;
        opacity: .95;
      }

      .nmc-sync-source-icon--excel::after {
        content: 'EX';
        font-size: 8px;
        line-height: 1;
        font-weight: 900;
        letter-spacing: -.35px;
      }

      .nmc-sync-source-icon--google::after {
        content: '';
        width: 12px;
        height: 12px;
        background: currentColor;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.2' d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='2.2' d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'/%3E%3C/svg%3E") center / contain no-repeat;
      }

      .nmc-sync-source-icon--offline {
        opacity: .72;
      }

      .nmc-sync-time-only {
        display: inline-flex !important;
        align-items: center;
        gap: 7px;
        min-width: 0;
        font-size: 0 !important;
        white-space: nowrap;
      }

      .nmc-sync-time-only::before {
        content: attr(data-sync-time);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 10px;
        line-height: 1.25;
        font-weight: 600;
        letter-spacing: .01em;
      }

      .nmc-sync-time-only::after {
        content: '';
        display: block;
        width: 7px;
        height: 7px;
        min-width: 7px;
        border-radius: 9999px;
        background: #9ca3af;
      }

      .nmc-sync-time-only--healthy::after {
        background: #22c55e;
        box-shadow: 0 0 7px rgba(34, 197, 94, .75);
      }

      .nmc-sync-time-only--unhealthy::after {
        background: #9ca3af;
        box-shadow: none;
      }

      @media (min-width: 640px) {
        .nmc-sync-time-only::before {
          font-size: 11px;
        }
      }
    `}</style>
  );
}
