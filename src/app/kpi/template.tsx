import type { ReactNode } from 'react'

const KPI_MOBILE_HEADER_OVERRIDES = `
/* nmc-unified-tech-background-v2 */
/* Nền độ phân giải cao dành riêng cho KPI; giữ nguyên các surface nội dung. */
html,
body {
  background: #050a12;
}

html body .kpi-app.kpi-app {
  min-height: 100vh;
  isolation: isolate;
  background-color: #050a12 !important;
  background-image:
    linear-gradient(180deg, rgba(2, 7, 15, .10), rgba(2, 7, 15, .04) 42%, rgba(2, 7, 15, .16)),
    url('/nmc-tech-bg-v3.webp') !important;
  background-repeat: no-repeat !important;
  background-position: center center !important;
  background-size: cover !important;
  background-attachment: fixed !important;
}

.kpi-app .bg-scene,
.kpi-app .bg-orb {
  display: none !important;
}

/*
 * Không đặt CSS cho màn loading tại đây.
 * Loading KPI được quản lý duy nhất bởi AppLoader + kpi-cyber-room-v4.css.
 * Tránh xung đột kích thước / min-height khiến mobile bị phóng card và lộ skeleton.
 */

/* Nền băng thông báo vàng rõ hơn trên cả desktop và mobile. */
.kpi-app .ctrl-bar.has-notice .kpi-notice-banner {
  background: linear-gradient(
    90deg,
    rgba(255, 226, 116, .96) 0%,
    rgba(248, 195, 64, .96) 48%,
    rgba(255, 226, 116, .96) 100%
  ) !important;
  border-color: rgba(226, 164, 32, .74) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .66),
    0 5px 16px rgba(181, 129, 22, .22) !important;
}

.kpi-app .ctrl-bar.has-notice .kpi-notice-marquee {
  color: #365021 !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, .58) !important;
}

/* Popup chi tiết AD/Nhóm: dùng xanh navy theo màu nhận diện được yêu cầu. */
.kpi-app .adp-header {
  background: #103667 !important;
  border-bottom-color: #0a2447 !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .13),
    0 3px 9px rgba(0, 0, 0, .26) !important;
}

.kpi-app .adp-nhom-btn.on {
  background: #103667 !important;
  border-color: #0a2447 !important;
  box-shadow:
    0 3px 8px rgba(16, 54, 103, .42),
    inset 0 1px 0 rgba(255, 255, 255, .24) !important;
}

/* Chỉ mobile: ghim tiêu đề, chọn kỳ và băng thông báo khi cuộn. */
@media (max-width: 720px) {
  html,
  body {
    background: #050a12 !important;
  }

  html body .kpi-app.kpi-app {
    overflow-x: clip !important;
    background-size: cover !important;
    background-position: center top !important;
    background-attachment: scroll !important;
  }

  .kpi-app #view-main > header {
    position: sticky !important;
    top: 0;
    z-index: 120;
    isolation: isolate;
    width: calc(100% + 32px);
    margin-left: -16px;
    margin-right: -16px;
    padding: 10px 16px 8px;
    background: linear-gradient(
      180deg,
      rgba(2, 16, 34, .98) 0%,
      rgba(2, 16, 34, .94) 72%,
      rgba(2, 16, 34, .90) 100%
    );
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    backdrop-filter: blur(14px) saturate(120%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, .06) inset,
      0 8px 20px rgba(0, 0, 0, .34);
  }

  .kpi-app #view-main > header::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(47, 183, 255, .48),
      transparent
    );
    pointer-events: none;
  }

  .kpi-app #view-main > header .main-header {
    margin: 0;
  }

  .kpi-app #view-main > header .ctrl-bar {
    margin-top: 8px !important;
    margin-bottom: 0;
  }

  /* Chi tiết Ban Nhóm và Kế hoạch Khung: có nền và ghim giống tiêu đề KPI chính. */
  .kpi-app #view-detail.active > .detail-shell > .sub-header,
  .kpi-app #view-calendar.active > .sub-header {
    position: sticky !important;
    top: 0;
    z-index: 120;
    isolation: isolate;
    width: calc(100% + 32px);
    min-height: 58px;
    margin-left: -16px;
    margin-right: -16px;
    padding: 10px 16px !important;
    background: linear-gradient(
      180deg,
      rgba(2, 16, 34, .98) 0%,
      rgba(2, 16, 34, .94) 72%,
      rgba(2, 16, 34, .90) 100%
    ) !important;
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    backdrop-filter: blur(14px) saturate(120%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, .06) inset,
      0 8px 20px rgba(0, 0, 0, .34) !important;
  }

  .kpi-app #view-detail.active > .detail-shell > .sub-header::after,
  .kpi-app #view-calendar.active > .sub-header::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(47, 183, 255, .48),
      transparent
    );
    pointer-events: none;
  }
}
`

export default function KpiTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KPI_MOBILE_HEADER_OVERRIDES }} />
      {children}
    </>
  )
}
