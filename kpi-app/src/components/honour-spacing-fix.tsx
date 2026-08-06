export function HonourSpacingFix() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          /* Mobile: khoảng cách từ viền khung tới ảnh đầu/cuối bằng khoảng cách giữa các ảnh. */
          @media (max-width: 640px) {
            .kpi-app .banca-imgs-wall,
            .kpi-app .desktop-honour-layout .banca-imgs-wall {
              width: 100% !important;
              max-width: none !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }

            .kpi-app .honour-tier .honour-image-grid {
              width: 100% !important;
              max-width: none !important;
            }

            .kpi-app .honour-platinum-row,
            .kpi-app .honour-gold-row {
              width: 100% !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              gap: 0 !important;
              justify-content: space-evenly !important;
            }
          }
        `,
      }}
    />
  )
}
