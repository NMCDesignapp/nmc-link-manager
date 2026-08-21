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

let patched = 0;
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let source = fs.readFileSync(filePath, 'utf8');
  if (!source.includes('data-kpi-contest-popup="true"')) continue;

  const before = source;
  for (const [from, to] of replacements) {
    source = source.replace(from, to);
  }

  if (!source.includes('width: min(640px, calc(100% - 16px));')) {
    throw new Error(`Không thu nhỏ được popup thi đua tại ${filePath}`);
  }
  if (!source.includes('max-height: 50dvh;')) {
    throw new Error(`Không thu nhỏ được poster trong popup tại ${filePath}`);
  }

  if (source !== before) {
    fs.writeFileSync(filePath, source, 'utf8');
    patched += 1;
  }
}

console.log(`✓ KPI contest popup compact: popup gọn hơn, poster tối đa 50dvh (${patched} file(s) cập nhật).`);
