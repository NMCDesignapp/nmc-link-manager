export function ProgramTableStickyHeaders() {
  return (
    <style>{`
      /*
       * Table của shadcn tự bọc thêm [data-slot="table-container"] với
       * overflow-x:auto. Trên Android WebView, lớp này trở thành scroll ancestor
       * gần nhất của sticky header, trong khi cuộn dọc thực tế nằm ở wrapper bên
       * ngoài. Vì vậy header bị kéo đi. Cho lớp trong overflow visible để cả
       * cuộn ngang và dọc đều do wrapper thật quản lý.
       */
      .policy-detail-table-wrapper,
      .saoviet-detail-table-wrapper,
      .clbsv-detail-table-wrapper {
        position: relative !important;
        overflow: auto !important;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        isolation: isolate;
      }

      .policy-detail-table-wrapper [data-slot="table-container"],
      .saoviet-detail-table-wrapper [data-slot="table-container"] {
        position: static !important;
        width: max-content !important;
        min-width: 100% !important;
        overflow: visible !important;
      }

      /* CLB dùng bảng mật độ cao: không ép container/table giãn hết chiều rộng popup. */
      .clbsv-detail-table-wrapper [data-slot="table-container"] {
        position: static !important;
        width: max-content !important;
        overflow: visible !important;
      }

      .policy-detail-table-wrapper table,
      .saoviet-detail-table-wrapper table {
        width: 100% !important;
        min-width: 100% !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }

      .clbsv-detail-table-wrapper table {
        width: max-content !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
      }

      /* Giữ nguyên toàn bộ các tầng tiêu đề như một khối, kể cả bảng 2 dòng. */
      .policy-detail-table-wrapper thead,
      .saoviet-detail-table-wrapper thead {
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 80 !important;
        transform: translateZ(0);
        box-shadow: 0 2px 5px rgba(15, 23, 42, 0.28);
      }

      /* CLB: dùng đường đổ bóng màu đặc, không alpha. */
      .clbsv-detail-table-wrapper thead {
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 80 !important;
        transform: translateZ(0);
        box-shadow: 0 2px 0 #9dbdaf;
      }

      /* Không để sticky riêng từng ô làm hai tầng tiêu đề chồng lên nhau. */
      .policy-detail-table-wrapper thead th,
      .saoviet-detail-table-wrapper thead th,
      .clbsv-detail-table-wrapper thead th {
        position: static !important;
        z-index: auto !important;
        background-clip: padding-box;
      }

      .policy-detail-table-wrapper tbody,
      .saoviet-detail-table-wrapper tbody,
      .clbsv-detail-table-wrapper tbody {
        position: relative;
        z-index: 1;
      }
    `}</style>
  );
}
