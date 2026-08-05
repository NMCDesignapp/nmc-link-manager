export function ProgramTableStickyHeaders() {
  return (
    <style>{`
      [data-policy-table] table,
      [data-saoviet-table] table,
      [data-clb-saoviet-table] table {
        border-collapse: separate;
        border-spacing: 0;
      }

      [data-policy-table] thead,
      [data-saoviet-table] thead,
      [data-clb-saoviet-table] thead {
        position: static !important;
      }

      [data-policy-table] thead th,
      [data-saoviet-table] thead th,
      [data-clb-saoviet-table] thead th {
        position: sticky !important;
        top: 0 !important;
        z-index: 35 !important;
        background-clip: padding-box;
        box-shadow: 0 2px 0 rgba(15, 23, 42, 0.22);
      }

      [data-policy-table],
      [data-saoviet-table],
      [data-clb-saoviet-table] {
        isolation: isolate;
      }
    `}</style>
  );
}
