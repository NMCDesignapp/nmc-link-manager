import type { ReactNode } from 'react'

const KPI_MOBILE_HEADER_OVERRIDES = `
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

/* Chỉ mobile: ghim tiêu đề, chọn kỳ và băng thông báo khi cuộn. */
@media (max-width: 720px) {
  /* overflow: hidden ở phần thân có thể chặn position: sticky trên trình duyệt mobile. */
  .kpi-app {
    overflow-x: clip !important;
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
      rgba(29, 35, 44, .98) 0%,
      rgba(29, 35, 44, .94) 72%,
      rgba(29, 35, 44, .90) 100%
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
      rgba(248, 195, 64, .42),
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
