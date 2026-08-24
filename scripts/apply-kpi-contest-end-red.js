#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'src', 'components', 'kpi-contest-notice.tsx'),
  path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx'),
];
const MARKER = '/* nmc-kpi-contest-end-red-v1 */';
const ANCHOR = '        @media (max-width: 560px) {';
const override = `        ${MARKER}\n        .kpi-contest-end {\n          border-color: rgba(255, 92, 92, .86) !important;\n          background: linear-gradient(135deg, #a51420 0%, #7f0f19 58%, #520911 100%) !important;\n          box-shadow: 0 0 18px rgba(239, 68, 68, .18), inset 0 1px 0 rgba(255,255,255,.08) !important;\n        }\n        .kpi-contest-end span { color: #ffd983 !important; }\n        .kpi-contest-end strong { color: #fff4e8 !important; }\n        .kpi-contest-end-today {\n          background: linear-gradient(135deg, #bb1723 0%, #8e101b 58%, #5b0a12 100%) !important;\n        }\n`;

let patched = 0;
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  const original = fs.readFileSync(filePath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  let source = original.replace(/\r\n/g, '\n');
  if (!source.includes('data-kpi-contest-popup="true"')) continue;
  if (source.includes(MARKER)) continue;
  if (!source.includes(ANCHOR)) throw new Error(`Không tìm thấy anchor CSS để đổi nền ngày kết thúc tại ${filePath}`);
  source = source.replace(ANCHOR, `${override}${ANCHOR}`);
  if (!source.includes(MARKER)) throw new Error(`Không áp dụng được nền đỏ ngày kết thúc tại ${filePath}`);
  fs.writeFileSync(filePath, source.replace(/\n/g, newline), 'utf8');
  patched += 1;
}

console.log(`✓ KPI contest notice: nền khối KẾT THÚC THI ĐUA chuyển đỏ (${patched} file(s) cập nhật).`);
