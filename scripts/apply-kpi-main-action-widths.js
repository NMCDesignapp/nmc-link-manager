#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Apply the shared global background first. This script is used by both Main and standalone builds,
// so the KPI template always matches the Main App theme before sync-kpi-source.js copies it.
require('./apply-unified-tech-background.js');

// Keep the two prominent KPI actions aligned with the six-button navigation width.
// Also keep Company calendar responsibility badges compact without changing stored owner data.
// Shared source only: standalone receives the exact same KPI page via sync-kpi-source.js.
const root = path.resolve(__dirname, '..');
const filePath = path.join(root, 'src', 'app', 'kpi', 'page.tsx');
const MARKER = '/* nmc-kpi-main-action-widths-v1 */';
const CAL_LABEL_MARKER = '// nmc-kpi-calendar-owner-short-labels-v1';

if (!fs.existsSync(filePath)) {
  throw new Error(`Không tìm thấy ${filePath}`);
}

let source = fs.readFileSync(filePath, 'utf8');
let changed = false;

if (!source.includes(MARKER)) {
  const anchor = `.kpi-app .target-reg-actions .target-reg-btn { min-width: 0; }\n`;
  if (!source.includes(anchor)) {
    throw new Error('Không tìm thấy anchor target-reg-actions để áp dụng chiều rộng KPI.');
  }

  const override = `${anchor}${MARKER}\n/* Hai cụm hành động chính dùng toàn bộ chiều rộng cùng nhịp với nav-grid 6 nút. */\n.kpi-app .region-divider.is-collapse-btn { width: 100%; padding-left: 0; padding-right: 0; }\n.kpi-app .region-divider.is-collapse-btn::before,\n.kpi-app .region-divider.is-collapse-btn::after { display: none; }\n.kpi-app .region-divider.is-collapse-btn .region-divider-title {\n  width: 100%;\n  flex: 1 1 100%;\n  justify-content: center;\n  text-align: center;\n}\n.kpi-app .target-reg-section {\n  width: 100%;\n  grid-template-columns: minmax(0, 1fr);\n}\n.kpi-app .target-reg-section::before,\n.kpi-app .target-reg-section::after { display: none; }\n.kpi-app .target-reg-actions { width: 100%; }\n.kpi-app .target-reg-actions .target-reg-btn { flex: 1 1 0; }\n`;

  source = source.replace(anchor, override);
  changed = true;
}

// Calendar rooms are applied before this script in Main builds and inside sync-kpi-source.js
// for standalone. Shorten only the DISPLAY labels in the Company aggregate:
// "Phòng PTKD 1" -> "PTKD 1", "Phòng HTKD" -> "HTKD".
// Stored owner values, room routing, filters and edit options remain unchanged.
if (!source.includes(CAL_LABEL_MARKER) && source.includes('const getDisplayOwnersForScope = (ev: CalendarEvent, scope: string): string[] => {')) {
  const returnAnchor = `      return rooms.length > 0 ? Array.from(new Set(rooms)) : ['Công ty'];`;
  if (!source.includes(returnAnchor)) {
    throw new Error('Không tìm thấy điểm hiển thị phụ trách lịch Công ty để rút gọn tên phòng.');
  }
  source = source.replace(
    returnAnchor,
    `      ${CAL_LABEL_MARKER}\n      return (rooms.length > 0 ? Array.from(new Set(rooms)) : ['Công ty'])\n        .map(owner => owner.replace(/^Phòng\\s+/, ''));`,
  );

  const colorAnchor = `    'Phòng HTKD': '#0ea5e9',`;
  if (source.includes(colorAnchor)) {
    source = source.replace(
      colorAnchor,
      `${colorAnchor}\n    // Compact display aliases used only by the Company aggregate view.\n    'PTKD 1': '#16a34a',\n    'PTKD 2': '#15803d',\n    'PTKD 3': '#166534',`,
    );
  }
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, 'utf8');
}

console.log('✓ KPI main actions + calendar responsibility labels: Công ty hiển thị PTKD 1/2/3, HTKD (không đổi dữ liệu lưu).');
