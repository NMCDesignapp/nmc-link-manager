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

/* nmc-kpi-embedded-desktop-tables-v1
 * Trong iframe KPI, chỉ vùng bảng được cuộn. Nếu cả trang /quan-ly cùng cuộn,
 * thead sticky sẽ nổi lên trên poster + bộ lọc và tạo đúng lỗi desktop đã gặp.
 */
@media (min-width: 768px) {
  html[data-kpi-embed='1'],
  html[data-kpi-embed='1'] body {
    height: 100% !important;
    overflow: hidden !important;
  }

  html[data-kpi-embed='1'] body > div:first-child {
    height: 100% !important;
    min-height: 0 !important;
  }

  html[data-kpi-embed='1'] .nmc-management-skin {
    height: 100% !important;
    min-height: 0 !important;
  }

  html[data-kpi-embed='1'] .nmc-management-content {
    flex: 1 1 0% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    padding: 8px !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] {
    min-height: 0 !important;
    height: 100% !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] > div {
    height: 100% !important;
    min-height: 0 !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] {
    display: none !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-desktop] {
    display: flex !important;
    flex: 1 1 0% !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    gap: 8px;
    scrollbar-gutter: stable;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] .saoviet-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] .clbsv-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] .policy-detail-table-wrapper {
    min-height: 0 !important;
    overflow: auto !important;
    overscroll-behavior: contain;
    scrollbar-gutter: stable both-edges;
    position: relative;
    isolation: isolate;
    contain: paint;
    border-radius: 4px;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] .saoviet-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] .clbsv-detail-table-wrapper {
    flex: 1 1 0% !important;
    min-height: 0 !important;
    overflow: auto !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-desktop] .saoviet-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-desktop] .clbsv-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-desktop] .policy-detail-table-wrapper {
    flex: 0 0 auto !important;
    min-height: auto !important;
    overflow: visible !important;
    contain: none;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] table {
    border-collapse: separate;
    border-spacing: 0;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] thead th {
    position: sticky !important;
    top: 0 !important;
    z-index: 25 !important;
    white-space: normal;
    line-height: 1.15;
    vertical-align: middle;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] tbody tr:nth-child(even) td {
    filter: brightness(.985);
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] tbody tr:hover td {
    filter: brightness(.95);
  }
}

/* nmc-kpi-embedded-mobile-scroll-v1
 * KPI tách mở /quan-ly trong iframe toàn màn hình. Ở mobile, main trước đây
 * dùng overflow-hidden nhưng không truyền chiều cao còn lại xuống detail shell,
 * khiến bảng chi tiết bị cắt và không còn vùng nhận thao tác vuốt. Giữ khung
 * iframe cố định, rồi giao quyền cuộn cho detail content/table bên trong.
 */
@media (max-width: 767px) {
  html[data-kpi-embed='1'],
  html[data-kpi-embed='1'] body {
    height: 100% !important;
    overflow: hidden !important;
  }

  html[data-kpi-embed='1'] body > div:first-child,
  html[data-kpi-embed='1'] .nmc-management-skin {
    height: 100% !important;
    min-height: 0 !important;
  }

  html[data-kpi-embed='1'] .nmc-management-content {
    flex: 1 1 0% !important;
    height: 100% !important;
    min-height: 0 !important;
    overflow: hidden !important;
    padding: 0 !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] {
    min-height: 0 !important;
    height: 100% !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-shell] > div {
    min-height: 0 !important;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] {
    display: flex !important;
    flex: 1 1 0% !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] .saoviet-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] .clbsv-detail-table-wrapper,
  html[data-kpi-embed='1'] [data-nmc-kpi-detail-mobile] .policy-detail-table-wrapper {
    flex: 1 1 0% !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
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
