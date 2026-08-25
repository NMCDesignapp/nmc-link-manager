import type { ReactNode } from 'react'

const KPI_MOBILE_HEADER_OVERRIDES = `
/* nmc-black-wood-background-v1 */
/* Nền gỗ đen do người dùng chọn; giữ nguyên các surface nội dung. */
html,
body {
  min-height: 100%;
  background-color: #080909;
  background-image:
    linear-gradient(180deg, rgba(1, 5, 8, .08), rgba(1, 5, 8, .22) 55%, rgba(1, 5, 8, .42)),
    url('/nmc-black-wood-bg.jpg');
  background-repeat: repeat;
  background-position: center top;
  background-size: 776px auto;
  background-attachment: fixed;
}

html body .kpi-app.kpi-app {
  min-height: 100vh;
  position: relative;
  box-sizing: border-box;
  padding-bottom: 100px;
  isolation: isolate;
  background-color: #080909 !important;
  background-image:
    linear-gradient(180deg, rgba(1, 5, 8, .08), rgba(1, 5, 8, .22) 55%, rgba(1, 5, 8, .42)),
    url('/nmc-black-wood-bg.jpg') !important;
  background-repeat: repeat !important;
  background-position: center top !important;
  background-size: 776px auto !important;
  background-attachment: fixed !important;
}

/* Loại bỏ các lớp vector cũ của loader; nhịp tim NC mới được vẽ ở .kpi-app. */
html body [aria-label="Đang tải dữ liệu KPI"]::before,
html body [aria-label="Đang tải dữ liệu KPI"]::after,
html body [aria-label="Tải dữ liệu gặp lỗi"]::before,
html body [aria-label="Tải dữ liệu gặp lỗi"]::after {
  content: none !important;
  display: none !important;
}

@keyframes nmc-heartbeat-nc-pulse {
  0%, 100% { filter: brightness(.94); }
  50% { filter: brightness(1.16); }
}

/* Hai đường nhịp tim chạy từ cạnh màn hình vào tâm, tạo chữ NC ở giữa nét. */
html body .kpi-app.kpi-app::before,
html body .kpi-app.kpi-app::after {
  content: '' !important;
  display: block !important;
  position: absolute;
  z-index: 0;
  width: min(56vw, 860px);
  height: min(18vh, 180px);
  pointer-events: none;
  opacity: .52;
  background: center / 100% 100% no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 760 180'%3E%3Cdefs%3E%3Cfilter id='g' x='-15%25' y='-60%25' width='130%25' height='220%25'%3E%3CfeGaussianBlur stdDeviation='4.5' result='b'/%3E%3CfeMerge%3E%3CfeMergeNode in='b'/%3E%3CfeMergeNode in='SourceGraphic'/%3E%3C/feMerge%3E%3C/filter%3E%3C/defs%3E%3Cg fill='none' stroke-linecap='round' stroke-linejoin='round' filter='url(%23g)'%3E%3Cpath d='M0 90 H85 L105 90 L125 70 L145 110 L168 38 L192 138 L216 68 L236 90 H280 L300 125 L300 55 L360 125 L360 55 H388 M470 60 C430 48 398 64 398 90 C398 116 430 132 470 120 L495 90 H760' stroke='%232aa8ff' stroke-width='10' opacity='.16'/%3E%3Cpath d='M0 90 H85 L105 90 L125 70 L145 110 L168 38 L192 138 L216 68 L236 90 H280 L300 125 L300 55 L360 125 L360 55 H388 M470 60 C430 48 398 64 398 90 C398 116 430 132 470 120 L495 90 H760' stroke='%237beaff' stroke-width='2.8'/%3E%3Cpath d='M0 96 H82 M500 96 H760' stroke='%232a9cff' stroke-width='1.2' opacity='.5'/%3E%3C/g%3E%3C/svg%3E");
  animation: nmc-heartbeat-nc-pulse 2.4s ease-in-out infinite;
}

html body .kpi-app.kpi-app::before { top: 10px; right: 0; bottom: auto; left: auto; }
html body .kpi-app.kpi-app::after {
  top: auto;
  right: auto;
  bottom: 10px;
  left: 0;
}
html body .kpi-app.kpi-app > .app-wrap { position: relative; z-index: 1; }

@media (prefers-reduced-motion: reduce) {
  html body .kpi-app.kpi-app::before,
  html body .kpi-app.kpi-app::after { animation: none; }
}

/* Màn khởi động dùng cùng nền gỗ, không kéo giãn texture. */
html body [aria-label="Đang tải dữ liệu KPI"],
html body [aria-label="Tải dữ liệu gặp lỗi"] {
  background-color: #080909 !important;
  background-image:
    linear-gradient(180deg, rgba(1, 5, 8, .18), rgba(1, 5, 8, .38)),
    url('/nmc-black-wood-bg.jpg') !important;
  background-repeat: repeat !important;
  background-position: center top !important;
  background-size: 776px auto !important;
  background-attachment: fixed !important;
}

/* Ba trang nhúng từ KPI dùng liền mạch cùng nền gỗ, kể cả lúc iframe đang tải. */
html body .kpi-app.kpi-app .kpi-embed-overlay,
html body .kpi-app.kpi-app .kpi-embed-body,
html body .kpi-app.kpi-app .kpi-embed-iframe,
html body .kpi-app.kpi-app .kpi-embed-loader {
  background-color: #080909 !important;
  background-image:
    linear-gradient(180deg, rgba(1, 5, 8, .18), rgba(1, 5, 8, .34)),
    url('/nmc-black-wood-bg.jpg') !important;
  background-repeat: repeat !important;
  background-position: center top !important;
  background-size: 776px auto !important;
  background-attachment: fixed !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader {
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

/* Loader dùng chung cho Thi đua / Chính sách / CLB, tự chứa để standalone không
   phải nạp toàn bộ stylesheet Main (tránh làm lộ cả layout mobile trên desktop). */
@keyframes nmc-linked-heartbeat-draw {
  0% { clip-path: inset(0 100% 0 0); opacity: .38; }
  68% { clip-path: inset(0 0 0 0); opacity: 1; }
  86%, 100% { clip-path: inset(0 0 0 0); opacity: .28; }
}

html body .kpi-app.kpi-app .kpi-embed-loader {
  display: grid !important;
  place-items: center !important;
  padding: 18px !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader::before,
html body .kpi-app.kpi-app .kpi-embed-loader::after {
  content: none !important;
  display: none !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader > span {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 9px !important;
  width: min(88vw, 420px) !important;
  min-height: 302px !important;
  overflow: hidden !important;
  padding: 27px 28px 25px !important;
  border: 1.5px solid rgba(45, 211, 255, .82) !important;
  border-radius: 24px !important;
  color: #f3f7ff !important;
  font-size: 14px !important;
  background: linear-gradient(145deg, rgba(9, 16, 20, .97), rgba(9, 12, 14, .98)) !important;
  box-shadow: 0 0 22px rgba(14, 175, 255, .22), inset 0 0 32px rgba(15, 127, 223, .08) !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader-card::before,
html body .kpi-app.kpi-app .kpi-embed-loader-card::after {
  content: none !important;
  display: none !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader-logo {
  display: block !important;
  width: 96px !important;
  height: 96px !important;
  flex: 0 0 96px !important;
  border: 0 !important;
  border-radius: 50% !important;
  clip-path: circle(48% at 50% 50%);
  background: url('/kpi-tech-logo.webp') center / 118% 118% no-repeat !important;
  box-shadow: 0 0 28px rgba(95, 214, 255, .42), 0 0 48px rgba(78, 230, 169, .22) !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader-card > strong {
  color: #fff !important;
  font-size: clamp(22px, 3vw, 27px) !important;
  font-weight: 900 !important;
  line-height: 1.12 !important;
  letter-spacing: -.02em !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader-heartbeat {
  position: relative !important;
  display: block !important;
  width: min(72vw, 280px) !important;
  height: 64px !important;
  flex: 0 0 64px !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader-heartbeat::before,
html body .kpi-app.kpi-app .kpi-embed-loader-heartbeat::after {
  content: '' !important;
  display: block !important;
  position: absolute !important;
  inset: 0 !important;
  background: center / 100% 100% no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 80'%3E%3Cpath d='M2 40 H48 L62 40 L76 19 L92 64 L110 28 L126 40 H278' fill='none' stroke='%2372e9ff' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
}

html body .kpi-app.kpi-app .kpi-embed-loader-heartbeat::before { opacity: .2 !important; }
html body .kpi-app.kpi-app .kpi-embed-loader-heartbeat::after {
  filter: drop-shadow(0 0 5px rgba(70, 220, 255, .88));
  animation: nmc-linked-heartbeat-draw 1.65s ease-in-out infinite;
}

html body .kpi-app.kpi-app .kpi-embed-loader-card > em {
  color: #cbd5e1 !important;
  font-size: 14px !important;
  line-height: 1.2 !important;
  font-style: italic !important;
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
    background-color: #080909 !important;
    background-image:
      linear-gradient(180deg, rgba(1, 5, 8, .08), rgba(1, 5, 8, .24) 55%, rgba(1, 5, 8, .42)),
      url('/nmc-black-wood-bg.jpg') !important;
    background-repeat: repeat !important;
    background-position: center top !important;
    background-size: 100% auto !important;
    background-attachment: scroll !important;
  }

  html body .kpi-app.kpi-app {
    overflow-x: clip !important;
    padding-bottom: 76px !important;
    background-size: 100% auto !important;
    background-position: center top !important;
    background-attachment: scroll !important;
  }

  html body .kpi-app.kpi-app::before,
  html body .kpi-app.kpi-app::after {
    width: 94vw;
    height: 128px;
    opacity: .40;
  }

  html body .kpi-app.kpi-app::before {
    top: 92px;
    z-index: 2;
    height: 72px;
    opacity: .34;
  }
  html body .kpi-app.kpi-app::after { bottom: 4px; }

  html body .kpi-app.kpi-app .kpi-embed-loader > span {
    width: min(94vw, 360px) !important;
    min-height: 276px !important;
    padding: 23px 20px 21px !important;
    border-radius: 20px !important;
  }

  html body .kpi-app.kpi-app .kpi-embed-loader-logo {
    width: 84px !important;
    height: 84px !important;
    flex-basis: 84px !important;
  }

  html body .kpi-app.kpi-app .kpi-embed-loader-card > strong {
    font-size: clamp(20px, 6vw, 24px) !important;
  }

  html body .kpi-app.kpi-app .kpi-embed-loader-heartbeat {
    width: min(76vw, 248px) !important;
    height: 58px !important;
    flex-basis: 58px !important;
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

  /* Chi tiết Ban Nhóm và Kế hoạch Khung: có nền và ghim giống tiêu đề KPI chính. */
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
      {children}
    </>
  )
}
