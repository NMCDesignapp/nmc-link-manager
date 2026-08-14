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
