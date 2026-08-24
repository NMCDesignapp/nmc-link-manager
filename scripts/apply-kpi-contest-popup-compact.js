#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'src', 'components', 'kpi-contest-notice.tsx'),
  path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx'),
];
const pagePath = path.join(root, 'src', 'app', 'kpi', 'page.tsx');

const replacements = [
  ['          width: min(760px, 100%);', '          width: min(640px, calc(100% - 16px));'],
  ['          max-height: calc(100dvh - 28px);', '          max-height: calc(100dvh - 44px);'],
  ['          min-height: 220px;', '          min-height: 190px;'],
  ['          max-height: 58dvh;', '          max-height: 50dvh;'],
  ['          min-height: 260px;', '          min-height: 220px;'],
  ['          padding: 16px;', '          padding: 13px;'],
  ['          font-size: clamp(18px, 3.8vw, 26px);', '          font-size: clamp(16px, 3.4vw, 23px);'],
  ['          padding: 10px 11px;', '          padding: 8px 9px;'],
  ['          font-size: clamp(20px, 5vw, 28px);', '          font-size: clamp(18px, 4.5vw, 24px);'],
  ["tone: diff <= 3 ? 'today' : 'active'", "tone: diff <= 2 ? 'today' : 'active'"],
];

const DESIGN_MARKER = '/* nmc-kpi-contest-honour-style-v2 */';
const REDUCED_MOTION_ANCHOR = '        @media (prefers-reduced-motion: reduce) {';
const designOverrides = `        ${DESIGN_MARKER}\n        .kpi-contest-notice {\n          border-color: rgba(255,215,107,.22) !important;\n          background:\n            radial-gradient(ellipse at 20% 20%, rgba(255,215,107,.06) 0%, transparent 50%),\n            radial-gradient(ellipse at 80% 60%, rgba(192,132,252,.04) 0%, transparent 50%),\n            linear-gradient(180deg, #0a0e1a 0%, #050810 100%) !important;\n          box-shadow: 0 10px 28px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,215,107,.06), 0 0 18px rgba(255,215,107,.04) !important;\n        }\n        .kpi-contest-eyebrow { color: #ffd76b !important; }\n        .kpi-contest-notice-card { align-items: center; }\n        .kpi-contest-poster-wrap {\n          aspect-ratio: 4 / 3 !important;\n          height: auto !important;\n          padding: 0 !important;\n        }\n        .kpi-contest-poster {\n          width: 100% !important;\n          height: 100% !important;\n          object-fit: fill !important;\n        }\n        .kpi-contest-modal {\n          width: min(560px, calc(100% - 40px)) !important;\n          max-height: calc(100dvh - 72px) !important;\n        }\n        .kpi-contest-modal-poster-stage {\n          width: 100% !important;\n          aspect-ratio: 4 / 3 !important;\n          min-height: 0 !important;\n          height: auto !important;\n        }\n        .kpi-contest-modal-poster {\n          width: 100% !important;\n          height: 100% !important;\n          max-height: none !important;\n          object-fit: fill !important;\n        }\n        @keyframes kpiContestDeadlinePulse {\n          0%, 100% {\n            box-shadow: 0 0 12px rgba(255,150,70,.10), inset 0 1px 0 rgba(255,255,255,.06);\n            border-color: rgba(255,140,77,.72);\n          }\n          50% {\n            box-shadow: 0 0 26px rgba(255,128,46,.34), 0 0 0 1px rgba(255,194,92,.18), inset 0 1px 0 rgba(255,255,255,.10);\n            border-color: rgba(255,190,92,.96);\n          }\n        }\n        @keyframes kpiContestDeadlineTextPulse {\n          0%, 100% { opacity: 1; transform: scale(1); text-shadow: 0 0 6px rgba(255,210,110,.16); }\n          50% { opacity: .72; transform: scale(1.035); text-shadow: 0 0 14px rgba(255,190,80,.78); }\n        }\n        .kpi-contest-end-today {\n          animation: kpiContestDeadlinePulse 1.8s ease-in-out infinite !important;\n        }\n        .kpi-contest-end-today strong {\n          display: inline-block !important;\n          transform-origin: left center;\n          animation: kpiContestDeadlineTextPulse 1.35s ease-in-out infinite !important;\n          color: #fff0a8 !important;\n        }\n        @media (max-width: 560px) {\n          .kpi-contest-modal { width: calc(100% - 40px) !important; }\n        }\n        @media (prefers-reduced-motion: reduce) {\n          .kpi-contest-end-today,\n          .kpi-contest-end-today strong { animation: none !important; }\n        }\n`;

const LAYOUT_MARKER = '/* nmc-kpi-mobile-section-rhythm-v1 */';
const LAYOUT_ANCHOR = '.kpi-app .target-reg-actions .target-reg-btn { flex: 1 1 0; }\n';
const layoutOverrides = `${LAYOUT_ANCHOR}${LAYOUT_MARKER}\n/* Mobile: giữ một nhịp dọc 18px giữa 6 nút → Tiến độ → Thông báo → Vinh danh. */\n@media (max-width: 899px) {\n  .kpi-app .region-divider.is-collapse-btn {\n    margin: 18px 0 0 !important;\n  }\n  .kpi-app .region-divider.is-collapse-btn .region-divider-title {\n    border-radius: 9px !important;\n  }\n  .kpi-app .kpi-contest-notice {\n    margin: 18px 0 0 !important;\n  }\n  .kpi-app .banca-imgs-section,\n  .kpi-app .desktop-honour-layout .banca-imgs-section {\n    margin-top: 18px !important;\n  }\n}\n`;

let patched = 0;
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  const original = fs.readFileSync(filePath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  let source = original.replace(/\r\n/g, '\n');
  if (!source.includes('data-kpi-contest-popup="true"')) continue;

  const before = source;
  for (const [from, to] of replacements) {
    source = source.replace(from, to);
  }

  if (!source.includes(DESIGN_MARKER)) {
    if (!source.includes(REDUCED_MOTION_ANCHOR)) {
      throw new Error(`Không tìm thấy điểm gắn thiết kế thông báo thi đua tại ${filePath}`);
    }
    source = source.replace(REDUCED_MOTION_ANCHOR, `${designOverrides}${REDUCED_MOTION_ANCHOR}`);
  }

  if (!source.includes('width: min(640px, calc(100% - 16px));')) {
    throw new Error(`Không giữ được popup compact tại ${filePath}`);
  }
  if (!source.includes(DESIGN_MARKER)) {
    throw new Error(`Không áp dụng được nền theo Vinh Danh tại ${filePath}`);
  }
  if (!source.includes('object-fit: fill !important;')) {
    throw new Error(`Không giữ được poster 4:3 fill không crop tại ${filePath}`);
  }
  if (!source.includes("tone: diff <= 2 ? 'today' : 'active'")) {
    throw new Error(`Không áp dụng được ngưỡng cảnh báo còn 2 ngày tại ${filePath}`);
  }
  if (!source.includes('kpiContestDeadlinePulse')) {
    throw new Error(`Không áp dụng được hiệu ứng cảnh báo ngày kết thúc tại ${filePath}`);
  }

  if (source !== before) {
    fs.writeFileSync(filePath, source.replace(/\n/g, newline), 'utf8');
    patched += 1;
  }
}

if (!fs.existsSync(pagePath)) throw new Error(`Không tìm thấy ${pagePath}`);
const originalPage = fs.readFileSync(pagePath, 'utf8');
const pageNewline = originalPage.includes('\r\n') ? '\r\n' : '\n';
let page = originalPage.replace(/\r\n/g, '\n');
if (!page.includes(LAYOUT_MARKER)) {
  if (!page.includes(LAYOUT_ANCHOR)) {
    throw new Error('Không tìm thấy anchor main-action-widths để cân nhịp mobile KPI.');
  }
  page = page.replace(LAYOUT_ANCHOR, layoutOverrides);
  fs.writeFileSync(pagePath, page.replace(/\n/g, pageNewline), 'utf8');
}
if (!page.includes(LAYOUT_MARKER) && !fs.readFileSync(pagePath, 'utf8').includes(LAYOUT_MARKER)) {
  throw new Error('Không áp dụng được nhịp khoảng cách mobile KPI.');
}

// Apply the final red end-date surface after all popup/notice styles above are present.
require('./apply-kpi-contest-end-red.js');
require('./apply-kpi-contest-urgent-green.js');

console.log(`✓ KPI contest notice: nền theo Vinh Danh; poster 4:3 giữ nguyên; popup compact giữ nguyên; hạn <=2 ngày pulse; mobile spacing 18px + bo Tiến độ 9px (${patched} component file(s) cập nhật).`);
