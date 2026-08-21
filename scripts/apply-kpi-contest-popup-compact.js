#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'src', 'components', 'kpi-contest-notice.tsx'),
  path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx'),
];

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
];

const DESIGN_MARKER = '/* nmc-kpi-contest-gold-4x3-v1 */';
const REDUCED_MOTION_ANCHOR = '        @media (prefers-reduced-motion: reduce) {';
const designOverrides = `        ${DESIGN_MARKER}\n        .kpi-contest-notice {\n          border-color: rgba(246, 205, 92, .72) !important;\n          background: linear-gradient(145deg, rgba(179, 126, 24, .97), rgba(103, 63, 6, .98)) !important;\n          box-shadow: 0 10px 26px rgba(0, 0, 0, .32), inset 0 1px 0 rgba(255, 239, 181, .16) !important;\n        }\n        .kpi-contest-notice-card { align-items: center; }\n        .kpi-contest-poster-wrap {\n          aspect-ratio: 4 / 3 !important;\n          height: auto !important;\n          padding: 0 !important;\n        }\n        .kpi-contest-poster {\n          width: 100% !important;\n          height: 100% !important;\n          object-fit: fill !important;\n        }\n        .kpi-contest-modal {\n          width: min(560px, calc(100% - 40px)) !important;\n          max-height: calc(100dvh - 72px) !important;\n        }\n        .kpi-contest-modal-poster-stage {\n          width: 100% !important;\n          aspect-ratio: 4 / 3 !important;\n          min-height: 0 !important;\n          height: auto !important;\n        }\n        .kpi-contest-modal-poster {\n          width: 100% !important;\n          height: 100% !important;\n          max-height: none !important;\n          object-fit: fill !important;\n        }\n        @media (max-width: 560px) {\n          .kpi-contest-modal { width: calc(100% - 40px) !important; }\n        }\n`;

let patched = 0;
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let source = fs.readFileSync(filePath, 'utf8');
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
    throw new Error(`Không áp dụng được nền popup compact tại ${filePath}`);
  }
  if (!source.includes(DESIGN_MARKER)) {
    throw new Error(`Không áp dụng được nền vàng/poster 4x3 tại ${filePath}`);
  }
  if (!source.includes('object-fit: fill !important;')) {
    throw new Error(`Không áp dụng được poster kéo giãn không crop tại ${filePath}`);
  }

  if (source !== before) {
    fs.writeFileSync(filePath, source, 'utf8');
    patched += 1;
  }
}

console.log(`✓ KPI contest notice: nền vàng gold; poster 4:3 fill không crop; popup nhỏ hơn (${patched} file(s) cập nhật).`);
