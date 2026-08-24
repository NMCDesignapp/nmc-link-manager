#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'src', 'app', 'kpi', 'template.tsx');
const OLD_MARKERS = [
  '/* nmc-unified-tech-background-v1 */',
  '/* nmc-unified-tech-background-v2 */',
];
const MARKER = '/* nmc-unified-tech-background-v3 */';
const CONTINUITY_MARKER = '/* nmc-kpi-background-continuity-v1 */';

const ROOT_BACKGROUND = `html,
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
}`;

const CONTINUITY_RULES = `${CONTINUITY_MARKER}
/* Loại bỏ trần/sàn vector cũ để asset v3 chạy liền mạch từ đầu đến cuối màn hình. */
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

/* Màn khởi động dùng đúng nền v3 thay cho nền cyber/vector cũ. */
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
}`;

if (!fs.existsSync(templatePath)) throw new Error(`Không tìm thấy ${templatePath}`);
const original = fs.readFileSync(templatePath, 'utf8');
const newline = original.includes('\r\n') ? '\r\n' : '\n';
let source = original.replace(/\r\n/g, '\n');

const alreadyDesired =
  source.includes(MARKER) &&
  source.includes("url('/nmc-tech-bg-v3.webp') !important;") &&
  source.includes(CONTINUITY_MARKER) &&
  source.includes('content: none !important;') &&
  source.includes('[aria-label="Đang tải dữ liệu KPI"]') &&
  source.includes('html body .kpi-app.kpi-app {') &&
  source.includes('background-size: cover !important;') &&
  source.includes('background-attachment: scroll !important;');

if (alreadyDesired) {
  console.log('✓ Unified background: KPI đang dùng nền v3 độ phân giải cao.');
}

if (!alreadyDesired && !source.includes(MARKER) && !OLD_MARKERS.some((marker) => source.includes(marker))) {
  const required = [
    "url('/kpi-tech-bg.webp')",
    'background-color: #020914 !important;',
    'background-size: 100% 100% !important;',
  ];
  for (const anchor of required) {
    if (!source.includes(anchor)) throw new Error(`Không tìm thấy anchor nền KPI: ${anchor}`);
  }
}

if (!alreadyDesired) {
source = source.replace(
  '/* Nền công nghệ xanh đen dùng chung cho toàn bộ KPI. */',
  `${MARKER}\n/* Nền độ phân giải cao dành riêng cho KPI; giữ nguyên các surface nội dung. */`,
);
for (const oldMarker of OLD_MARKERS) source = source.replace(oldMarker, MARKER);
source = source.replace(
  /html,\nbody \{\n  background: #050a12;\n\}/,
  ROOT_BACKGROUND,
);
source = source.replaceAll('background: #020914;', 'background: #050a12;');
source = source.replace('background-color: #020914 !important;', 'background-color: #050a12 !important;');
source = source.replace(
  'linear-gradient(180deg, rgba(1, 7, 17, .06), rgba(1, 8, 20, .15)),',
  'linear-gradient(180deg, rgba(2, 7, 15, .10), rgba(2, 7, 15, .04) 42%, rgba(2, 7, 15, .16)),',
);
source = source.replace("url('/kpi-tech-bg.webp') !important;", "url('/nmc-tech-bg-v3.webp') !important;");
source = source.replace("url('/nmc-tech-bg-v2.webp') !important;", "url('/nmc-tech-bg-v3.webp') !important;");
source = source.replaceAll('\n.kpi-app {\n', '\nhtml body .kpi-app.kpi-app {\n');
source = source.replace('background-size: 100% 100% !important;', 'background-size: cover !important;');
source = source.replace(
  '    background-position: center top !important;\n  }',
  '    background-position: center top !important;\n    background-attachment: scroll !important;\n  }',
);
if (!source.includes(CONTINUITY_MARKER)) {
  const anchor = '\n.kpi-app .bg-scene,';
  if (!source.includes(anchor)) throw new Error('Không tìm thấy vị trí chèn CSS nền liên tục KPI.');
  source = source.replace(anchor, `\n${CONTINUITY_RULES}\n${anchor}`);
}
source = source.replaceAll('rgba(2, 16, 34, .98)', 'rgba(2, 16, 34, .86)');
source = source.replaceAll('rgba(2, 16, 34, .94)', 'rgba(2, 16, 34, .78)');
source = source.replaceAll('rgba(2, 16, 34, .90)', 'rgba(2, 16, 34, .70)');

if (!source.includes("url('/nmc-tech-bg-v3.webp') !important;")) throw new Error('Không áp dụng được asset nền KPI mới.');
if (!source.includes('html body .kpi-app.kpi-app {')) throw new Error('Không nâng được độ ưu tiên CSS nền KPI.');
if (!source.includes('background-size: cover !important;')) throw new Error('Không áp dụng được cover cho nền KPI.');
if (!source.includes('background-attachment: scroll !important;')) throw new Error('Không áp dụng được nền scroll-safe trên mobile.');
if (!source.includes(CONTINUITY_MARKER)) throw new Error('Không loại bỏ được lớp trần/sàn nền KPI cũ.');
if (!source.includes(MARKER)) throw new Error('Không ghi được marker nền KPI.');

fs.writeFileSync(templatePath, source.replace(/\n/g, newline), 'utf8');
console.log('✓ Unified background: KPI dùng /nmc-tech-bg-v3.webp, cover, mobile scroll-safe.');
}
