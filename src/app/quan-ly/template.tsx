import type { ReactNode } from 'react';
import { CompactSyncStatus } from './sync-status-compact';

const KPI_EMBED_LOADER_OVERRIDES = `
/*
 * Khi /quan-ly chạy trong iframe của KPI, parent KPI đã có popup loading ngang.
 * Ẩn hai loader nội bộ (mounted guard + sheet data guard) để tránh 3 lớp loading
 * chồng lên nhau. Khi mở /quan-ly độc lập, các loader này vẫn hoạt động bình thường.
 */
html[data-kpi-embed='1'] .nmc-kpi-embedded-internal-loader,
html.nmc-kpi-linked-page .nmc-kpi-embedded-internal-loader,
body.nmc-kpi-linked-page .nmc-kpi-embedded-internal-loader {
  display: none !important;
  animation: none !important;
}
`;

export default function QuanLyTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KPI_EMBED_LOADER_OVERRIDES }} />
      <CompactSyncStatus />
      {children}
    </>
  );
}
