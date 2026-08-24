#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const templatePath = path.join(root, 'src', 'app', 'kpi', 'template.tsx');
const OLD_MARKER = '/* nmc-unified-tech-background-v1 */';
const MARKER = '/* nmc-unified-tech-background-v2 */';

if (!fs.existsSync(templatePath)) throw new Error(`Không tìm thấy ${templatePath}`);
const original = fs.readFileSync(templatePath, 'utf8');
const newline = original.includes('\r\n') ? '\r\n' : '\n';
let source = original.replace(/\r\n/g, '\n');

const alreadyDesired =
  source.includes(MARKER) &&
  source.includes("url('/nmc-tech-bg-v3.webp') !important;") &&
  source.includes('html body .kpi-app.kpi-app {') &&
  source.includes('background-size: cover !important;') &&
  source.includes('background-attachment: scroll !important;');

if (alreadyDesired) {
  console.log('✓ Unified background: KPI đang dùng nền v3 độ phân giải cao.');
}

if (!alreadyDesired && !source.includes(MARKER) && !source.includes(OLD_MARKER)) {
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
source = source.replace(OLD_MARKER, MARKER);
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

if (!source.includes("url('/nmc-tech-bg-v3.webp') !important;")) throw new Error('Không áp dụng được asset nền KPI mới.');
if (!source.includes('html body .kpi-app.kpi-app {')) throw new Error('Không nâng được độ ưu tiên CSS nền KPI.');
if (!source.includes('background-size: cover !important;')) throw new Error('Không áp dụng được cover cho nền KPI.');
if (!source.includes('background-attachment: scroll !important;')) throw new Error('Không áp dụng được nền scroll-safe trên mobile.');
if (!source.includes(MARKER)) throw new Error('Không ghi được marker nền KPI.');

fs.writeFileSync(templatePath, source.replace(/\n/g, newline), 'utf8');
console.log('✓ Unified background: KPI dùng /nmc-tech-bg-v3.webp, cover, mobile scroll-safe.');
}
