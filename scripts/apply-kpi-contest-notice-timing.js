#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src', 'components', 'kpi-contest-notice.tsx');
const standalonePath = path.join(root, 'kpi-app', 'src', 'components', 'kpi-contest-notice.tsx');

if (!fs.existsSync(sourcePath)) throw new Error(`Không tìm thấy ${sourcePath}`);

let source = fs.readFileSync(sourcePath, 'utf8');
source = source.replace('const ROTATE_MS = 7_500;', 'const ROTATE_MS = 5_000;');
source = source.replace(
  'animation: kpiContestNoticeIn .5s cubic-bezier(.22,1,.36,1);',
  'animation: kpiContestNoticeIn .68s cubic-bezier(.22,1,.36,1); will-change: opacity, transform;',
);
source = source.replace(
  'from { opacity: 0; transform: translateX(10px); }\n          to { opacity: 1; transform: translateX(0); }',
  'from { opacity: 0; transform: translateX(12px) scale(.995); }\n          55% { opacity: .96; }\n          to { opacity: 1; transform: translateX(0) scale(1); }',
);

if (!source.includes('const ROTATE_MS = 5_000;')) {
  throw new Error('Không áp dụng được chu kỳ 5 giây cho thông báo thi đua.');
}

fs.writeFileSync(sourcePath, source, 'utf8');
fs.mkdirSync(path.dirname(standalonePath), { recursive: true });
fs.writeFileSync(standalonePath, source, 'utf8');
console.log('✓ KPI contest notice: chuyển chương trình mỗi 5 giây, fade + slide nhẹ và đồng bộ Main/KPI tách.');
