import type { ReactNode } from 'react'
import { KpiEntryGate } from '@/components/kpi-entry-gate'

const KPI_MOBILE_HEADER_OVERRIDES = `
/* nmc-unified-tech-background-v3 */
/* Nền độ phân giải cao dành riêng cho KPI; giữ nguyên các surface nội dung. */
html,
body {
  min-height: 100%;
  background-color: #050a12;
  background-image:
    linear-gradient(180deg, rgba(2, 7, 15, .10), rgba(2, 7, 15, .04) 42%, rgba(2, 7, 15, .16)),
    url('/nmc-tech-bg-v3.webp');
  background-repeat: no-repeat;
  background-position: center top;
  background-size: cover;
  background-attachment: fixed;
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

/* nmc-kpi-background-continuity-v1 */
html body .kpi-app.kpi-app::before,
html body .kpi-app.kpi-app::after,
html body [aria-label="Đang tải dữ liệu KPI"]::before,
html body [aria-label="Đang tải dữ liệu KPI"]::after,
html body [aria-label="Tải dữ liệu gặp lỗi"]::before,
html body [aria-label="Tải dữ liệu gặp lỗi"]::after,
html body .kpi-app.kpi-app > .app-wrap::before {
  content: none !important;
  display: none !important;
}

html body [aria-label="Đang tải dữ liệu KPI"],
html body [aria-label="Tải dữ liệu gặp lỗi"] {
  background-color: #050a12 !important;
  background-image:
    linear-gradient(180deg, rgba(2, 7, 15, .10), rgba(2, 7, 15, .04) 42%, rgba(2, 7, 15, .16)),
    url('/nmc-tech-bg-v3.webp') !important;
  background-repeat: no-repeat !important;
  background-position: center top !important;
  background-size: cover !important;
  background-attachment: fixed !important;
}

html body .kpi-app.kpi-app .kpi-embed-overlay,
html body .kpi-app.kpi-app .kpi-embed-body,
html body .kpi-app.kpi-app .kpi-embed-iframe,
html body .kpi-app.kpi-app .kpi-embed-loader {
  background-color: #050a12 !important;
  background-image:
    linear-gradient(180deg, rgba(2, 7, 15, .12), rgba(2, 7, 15, .05) 42%, rgba(2, 7, 15, .18)),
    url('/nmc-tech-bg-v3.webp') !important;
  background-repeat: no-repeat !important;
  background-position: center center !important;
  background-size: cover !important;
  background-attachment: fixed !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

.kpi-app .bg-scene,
.kpi-app .bg-orb {
  display: none !important;
}

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

@media (max-width: 720px) {
  html,
  body {
    background-color: #050a12 !important;
    background-image:
      linear-gradient(180deg, rgba(2, 7, 15, .10), rgba(2, 7, 15, .04) 42%, rgba(2, 7, 15, .16)),
      url('/nmc-tech-bg-v3.webp') !important;
    background-repeat: no-repeat !important;
    background-position: center top !important;
    background-size: cover !important;
    background-attachment: scroll !important;
  }

  html body .kpi-app.kpi-app {
    overflow-x: clip !important;
    background-size: cover !important;
    background-position: center top !important;
    background-attachment: scroll !important;
  }

  html body .kpi-app.kpi-app .kpi-embed-overlay,
  html body .kpi-app.kpi-app .kpi-embed-body,
  html body .kpi-app.kpi-app .kpi-embed-iframe,
  html body .kpi-app.kpi-app .kpi-embed-loader {
    background-position: center top !important;
    background-attachment: scroll !important;
  }

  html body .kpi-app.kpi-app #view-main > header {
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
      rgba(2, 16, 34, .86) 0%,
      rgba(2, 16, 34, .78) 72%,
      rgba(2, 16, 34, .70) 100%
    ) !important;
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

  html body .kpi-app.kpi-app #view-detail.active > .detail-shell > .sub-header,
  html body .kpi-app.kpi-app #view-calendar.active > .sub-header {
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
      rgba(2, 16, 34, .86) 0%,
      rgba(2, 16, 34, .78) 72%,
      rgba(2, 16, 34, .70) 100%
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
      <KpiEntryGate />
      {children}
    </>
  )
}
