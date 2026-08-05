export function ProgramTableStickyHeaders() {
  return (
    <style>{`
      .policy-detail-table-wrapper,
      .saoviet-detail-table-wrapper,
      .clbsv-detail-table-wrapper {
        position: relative !important;
        min-height: 0 !important;
        overflow-x: auto !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        isolation: isolate;
      }

      [data-policy-table] table,
      [data-saoviet-table] table,
      [data-clb-saoviet-table] table,
      .policy-detail-table-wrapper table,
      .saoviet-detail-table-wrapper table,
      .clbsv-detail-table-wrapper table {
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }

      [data-policy-table] thead,
      [data-saoviet-table] thead,
      [data-clb-saoviet-table] thead,
      .policy-detail-table-wrapper thead,
      .saoviet-detail-table-wrapper thead,
      .clbsv-detail-table-wrapper thead {
        position: sticky !important;
        top: 0 !important;
        z-index: 60 !important;
      }

      [data-policy-table] thead tr,
      [data-saoviet-table] thead tr,
      [data-clb-saoviet-table] thead tr,
      .policy-detail-table-wrapper thead tr,
      .saoviet-detail-table-wrapper thead tr,
      .clbsv-detail-table-wrapper thead tr {
        position: sticky !important;
        top: 0 !important;
        z-index: 60 !important;
      }

      [data-policy-table] thead th,
      [data-saoviet-table] thead th,
      [data-clb-saoviet-table] thead th,
      .policy-detail-table-wrapper thead th,
      .saoviet-detail-table-wrapper thead th,
      .clbsv-detail-table-wrapper thead th {
        position: sticky !important;
        top: 0 !important;
        z-index: 61 !important;
        background-clip: padding-box !important;
        transform: translateZ(0);
        box-shadow: 0 2px 0 rgba(15, 23, 42, 0.28) !important;
      }

      @media (max-width: 767px) {
        .policy-detail-table-wrapper,
        .saoviet-detail-table-wrapper,
        .clbsv-detail-table-wrapper {
          flex: 1 1 0 !important;
          height: 0 !important;
          min-height: 210px !important;
          max-height: calc(100dvh - 285px) !important;
        }
      }
    `}</style>
  );
}
