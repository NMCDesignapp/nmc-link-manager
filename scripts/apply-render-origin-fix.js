#!/usr/bin/env node

/**
 * Render-migration origin fix (2026-11-20).
 *
 * Keep the canonical Render origin in the single production KPI page.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const CANONICAL = "const MAIN_APP_URL = 'https://nc-link.onrender.com';";
const targets = [
  path.join(root, 'src', 'app', 'kpi', 'page.tsx'),
];

let changed = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log('[render-origin-fix] missing, skipped:', path.relative(root, file));
    continue;
  }
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .split('\n')
    .map(line => {
      if (line.includes('const MAIN_APP_URL') && (line.includes('process.env') || line.includes('nc-link.vercel.app'))) {
        return CANONICAL;
      }
      return line;
    })
    .join('\n');
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
    console.log('[render-origin-fix] updated', path.relative(root, file));
  } else {
    console.log('[render-origin-fix] already fixed', path.relative(root, file));
  }
}
console.log('[render-origin-fix] files changed:', changed);
