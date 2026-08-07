import type { ReactNode } from 'react'

const KPI_MOBILE_HEADER_OVERRIDES = `
/* Nền công nghệ xanh đen dùng chung cho toàn bộ KPI và các view liên kết. */
html,
body {
  background: #020914;
}

.kpi-app {
  min-height: 100vh;
  isolation: isolate;
  background-color: #020914 !important;
  background-image:
    linear-gradient(180deg, rgba(1, 7, 17, .06), rgba(1, 8, 20, .15)),
    url('/kpi-tech-bg.webp') !important;
  background-repeat: no-repeat !important;
  background-position: center center !important;
  background-size: 100% 100% !important;
  background-attachment: fixed !important;
}

.kpi-app .bg-scene,
.kpi-app .bg-orb {
  display: none !important;
}

/* Loading khi mở KPI: giữ lifecycle hiện tại, chỉ thay giao diện theo mẫu NC. */
[aria-label="Đang tải dữ liệu KPI"],
[aria-label="Tải dữ liệu gặp lỗi"] {
  background:
    linear-gradient(180deg, rgba(1, 7, 17, .10), rgba(1, 8, 20, .22)),
    url('/kpi-tech-bg.webp') center center / 100% 100% no-repeat !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

[aria-label="Đang tải dữ liệu KPI"] > div,
[aria-label="Tải dữ liệu gặp lỗi"] > div {
  width: min(82vw, 540px) !important;
  max-width: 540px !important;
  min-height: min(68vh, 680px);
  padding: 44px 34px !important;
  border-radius: 34px !important;
  border: 1.5px solid rgba(79, 190, 255, .92) !important;
  background:
    linear-gradient(145deg, rgba(12, 39, 68, .30), rgba(1, 10, 24, .84)),
    radial-gradient(circle at 100% 0%, rgba(25, 160, 255, .12), transparent 34%) !important;
  box-shadow:
    0 0 0 1px rgba(18, 99, 185, .22),
    0 0 28px rgba(20, 152, 255, .28),
    inset 0 0 44px rgba(13, 99, 182, .12) !important;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

[aria-label="Đang tải dữ liệu KPI"] > div > .pointer-events-none.absolute,
[aria-label="Tải dữ liệu gặp lỗi"] > div > .pointer-events-none.absolute {
  background: linear-gradient(90deg, transparent, #29d8ff, transparent) !important;
  box-shadow: 0 0 10px rgba(23, 194, 255, .45);
}

.nmc-kpi-loader-logo-safe {
  width: 168px !important;
  height: 168px !important;
  margin-bottom: 24px !important;
}

.nmc-kpi-loader-logo-safe > .relative {
  width: 154px !important;
  height: 154px !important;
  border-radius: 50% !important;
  box-shadow:
    0 0 0 2px rgba(64, 217, 255, .58),
    0 0 24px rgba(31, 207, 255, .58),
    0 0 46px rgba(18, 99, 255, .28) !important;
}

.nmc-kpi-loader-logo-safe img {
  border-radius: 50% !important;
  object-fit: cover !important;
}

.nmc-kpi-loader-logo-safe-halo {
  inset: -24px !important;
  background: radial-gradient(circle, rgba(24, 218, 255, .56) 0%, rgba(29, 111, 255, .25) 40%, transparent 72%) !important;
}

[aria-label="Đang tải dữ liệu KPI"] h2,
[aria-label="Tải dữ liệu gặp lỗi"] h2 {
  color: #f1f6ff !important;
  font-family: Tahoma, Arial, Helvetica, sans-serif !important;
  font-size: clamp(25px, 5vw, 38px) !important;
  font-weight: 400 !important;
  line-height: 1.2 !important;
  letter-spacing: .01em !important;
  text-shadow: 0 0 18px rgba(77, 167, 255, .18);
}

[aria-label="Đang tải dữ liệu KPI"] h2 + p,
[aria-label="Tải dữ liệu gặp lỗi"] h2 + p {
  margin-top: 8px !important;
  color: #759cd3 !important;
  font-family: Tahoma, Arial, Helvetica, sans-serif !important;
  font-size: clamp(14px, 2.8vw, 20px) !important;
  font-weight: 400 !important;
  line-height: 1.25 !important;
  text-transform: none !important;
  letter-spacing: .01em !important;
}

[aria-label="Đang tải dữ liệu KPI"] h2 + p::after,
[aria-label="Tải dữ liệu gặp lỗi"] h2 + p::after {
  content: '';
  display: block;
  width: min(60vw, 360px);
  height: 1px;
  margin: 31px auto 28px;
  background: linear-gradient(90deg, transparent, rgba(50, 176, 255, .78), transparent);
  box-shadow: 0 0 10px rgba(29, 173, 255, .38);
}

[aria-label="Đang tải dữ liệu KPI"] .mt-7.flex.flex-col {
  margin-top: 0 !important;
  gap: 14px !important;
}

[aria-label="Đang tải dữ liệu KPI"] .h-10.w-10 {
  width: 76px !important;
  height: 76px !important;
  border-width: 8px !important;
  border-color: rgba(30, 96, 164, .36) !important;
  border-top-color: #12e5f4 !important;
  border-right-color: #168cff !important;
  box-shadow:
    0 0 18px rgba(14, 205, 255, .18),
    inset 0 0 12px rgba(14, 205, 255, .08);
}

[aria-label="Đang tải dữ liệu KPI"] .mt-7.flex.flex-col > p {
  color: #eef5ff !important;
  font-family: Tahoma, Arial, Helvetica, sans-serif !important;
  font-size: clamp(15px, 3vw, 20px) !important;
  font-style: normal !important;
  font-weight: 400 !important;
}

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
    background: #020914 !important;
  }

  .kpi-app {
    overflow-x: clip !important;
    background-size: cover !important;
    background-position: center top !important;
  }

  [aria-label="Đang tải dữ liệu KPI"],
  [aria-label="Tải dữ liệu gặp lỗi"] {
    background-size: cover !important;
    background-position: center top !important;
    padding: 18px !important;
  }

  [aria-label="Đang tải dữ liệu KPI"] > div,
  [aria-label="Tải dữ liệu gặp lỗi"] > div {
    width: min(86vw, 500px) !important;
    min-height: min(64vh, 610px);
    padding: 34px 24px !important;
    border-radius: 28px !important;
  }

  .nmc-kpi-loader-logo-safe {
    width: 146px !important;
    height: 146px !important;
    margin-bottom: 20px !important;
  }

  .nmc-kpi-loader-logo-safe > .relative {
    width: 134px !important;
    height: 134px !important;
  }

  [aria-label="Đang tải dữ liệu KPI"] .h-10.w-10 {
    width: 66px !important;
    height: 66px !important;
    border-width: 7px !important;
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
