#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Keep the two prominent KPI actions aligned with the six-button navigation width.
// Shared source only: standalone receives the exact same KPI page via sync-kpi-source.js.
const root = path.resolve(__dirname, '..');
const filePath = path.join(root, 'src', 'app', 'kpi', 'page.tsx');
const MARKER = '/* nmc-kpi-main-action-widths-v1 */';

if (!fs.existsSync(filePath)) {
  throw new Error(`Không tìm thấy ${filePath}`);
}

let source = fs.readFileSync(filePath, 'utf8');

if (source.includes(MARKER)) {
  console.log('✓ KPI main actions: Tiến độ khu vực + Đăng ký mục tiêu đã rộng bằng cụm 6 nút.');
  process.exit(0);
}

const anchor = `.kpi-app .target-reg-actions .target-reg-btn { min-width: 0; }\n`;
if (!source.includes(anchor)) {
  throw new Error('Không tìm thấy anchor target-reg-actions để áp dụng chiều rộng KPI.');
}

const override = `${anchor}${MARKER}\n/* Hai cụm hành động chính dùng toàn bộ chiều rộng cùng nhịp với nav-grid 6 nút. */\n.kpi-app .region-divider.is-collapse-btn { width: 100%; padding-left: 0; padding-right: 0; }\n.kpi-app .region-divider.is-collapse-btn::before,\n.kpi-app .region-divider.is-collapse-btn::after { display: none; }\n.kpi-app .region-divider.is-collapse-btn .region-divider-title {\n  width: 100%;\n  flex: 1 1 100%;\n  justify-content: center;\n  text-align: center;\n}\n.kpi-app .target-reg-section {\n  width: 100%;\n  grid-template-columns: minmax(0, 1fr);\n}\n.kpi-app .target-reg-section::before,\n.kpi-app .target-reg-section::after { display: none; }\n.kpi-app .target-reg-actions { width: 100%; }\n.kpi-app .target-reg-actions .target-reg-btn { flex: 1 1 0; }\n`;

source = source.replace(anchor, override);
fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ KPI main actions: Tiến độ khu vực + Đăng ký mục tiêu đã rộng bằng cụm 6 nút.');
