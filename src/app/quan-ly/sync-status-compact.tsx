'use client';

import { useEffect } from 'react';

const EXCEL_CONNECTED = 'Excel trên máy tính đang kết nối';
const EXCEL_DISCONNECTED = 'Excel trên máy tính chưa kết nối';
const GOOGLE_ENABLED = 'Google Sheets đang bật';
const LAST_SYNC_PREFIX = 'Lần gần nhất:';

function normalizeText(value: string | null | undefined) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function applyCompactSyncStatus(root: ParentNode = document) {
  const spans = root.querySelectorAll<HTMLSpanElement>('main span');

  spans.forEach((span) => {
    const text = normalizeText(span.textContent);

    if (text === EXCEL_CONNECTED || text === EXCEL_DISCONNECTED || text === GOOGLE_ENABLED) {
      const isGoogle = text === GOOGLE_ENABLED;
      const isDisconnected = text === EXCEL_DISCONNECTED;

      span.classList.add(
        'nmc-sync-source-icon',
        isGoogle ? 'nmc-sync-source-icon--google' : 'nmc-sync-source-icon--excel',
      );
      if (isDisconnected) span.classList.add('nmc-sync-source-icon--offline');
      else span.classList.remove('nmc-sync-source-icon--offline');

      span.setAttribute('aria-label', isGoogle ? 'Nguồn Google Sheets' : 'Nguồn Excel trên máy tính');
      span.setAttribute('title', isGoogle ? 'Google Sheets' : 'Excel trên máy tính');

      const indicator = span.previousElementSibling;
      if (indicator instanceof HTMLElement) indicator.classList.add('nmc-sync-status-hidden');
      return;
    }

    if (text.startsWith(LAST_SYNC_PREFIX)) {
      const value = normalizeText(text.slice(LAST_SYNC_PREFIX.length));
      span.classList.add('nmc-sync-time-only');
      span.dataset.syncTime = value && value !== 'chưa có dữ liệu' ? value : '—';
      span.setAttribute(
        'aria-label',
        value && value !== 'chưa có dữ liệu'
          ? `Đồng bộ thành công gần nhất: ${value}`
          : 'Chưa có lần đồng bộ thành công',
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
    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => applyCompactSyncStatus());
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <style>{`
      .nmc-sync-status-hidden {
        display: none !important;
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
        opacity: .82;
      }

      .nmc-sync-time-only {
        min-width: 0;
        font-size: 0 !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .nmc-sync-time-only::after {
        content: attr(data-sync-time);
        font-size: 10px;
        line-height: 1.25;
        font-weight: 600;
        letter-spacing: .01em;
      }

      @media (min-width: 640px) {
        .nmc-sync-time-only::after {
          font-size: 11px;
        }
      }
    `}</style>
  );
}
