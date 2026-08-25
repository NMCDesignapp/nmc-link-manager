import type { ReactNode } from 'react';
import { CompactSyncStatus } from './sync-status-compact';

const KPI_EMBED_LOADER_OVERRIDES = `
/*
 * Khi /quan-ly chạy trong iframe của KPI, parent KPI đã có popup loading ngang.
 * Ẩn hai loader nội bộ (mounted guard + sheet data guard) để tránh nhiều lớp loading
 * chồng lên nhau. Khi mở /quan-ly độc lập, các loader này vẫn hoạt động bình thường.
 */
html[data-kpi-embed='1'] .nmc-kpi-embedded-internal-loader,
html.nmc-kpi-linked-page .nmc-kpi-embedded-internal-loader,
body.nmc-kpi-linked-page .nmc-kpi-embedded-internal-loader {
  display: none !important;
  animation: none !important;
}

/* Ba trang mở từ KPI dùng nền gỗ đen đã chốt, không ảnh hưởng /quan-ly độc lập. */
html[data-kpi-embed='1'],
html[data-kpi-embed='1'] body,
html.nmc-kpi-linked-page,
html.nmc-kpi-linked-page body {
  min-height: 100%;
  background-color: #080909 !important;
  background-image:
    linear-gradient(180deg, rgba(1, 5, 8, .16), rgba(1, 5, 8, .38)),
    url('/nmc-black-wood-bg.jpg') !important;
  background-repeat: repeat !important;
  background-position: center top !important;
  background-size: 776px auto !important;
  background-attachment: fixed !important;
}

@media (max-width: 720px) {
  html[data-kpi-embed='1'],
  html[data-kpi-embed='1'] body,
  html.nmc-kpi-linked-page,
  html.nmc-kpi-linked-page body {
    background-size: 100% auto !important;
    background-attachment: scroll !important;
  }
}
`;

const KPI_EMBED_DETECTOR = `
(function () {
  try {
    var params = new URLSearchParams(window.location.search || '');
    var isKpiEmbed = params.get('from') === 'kpi' || window.self !== window.top;
    if (!isKpiEmbed) return;
    document.documentElement.setAttribute('data-kpi-embed', '1');
    document.documentElement.classList.add('nmc-kpi-linked-page');
    if (document.body) document.body.classList.add('nmc-kpi-linked-page');
  } catch (_) {}
})();
`;

export default function QuanLyTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: KPI_EMBED_DETECTOR }} />
      <style dangerouslySetInnerHTML={{ __html: KPI_EMBED_LOADER_OVERRIDES }} />
      <CompactSyncStatus />
      {children}
    </>
  );
}
