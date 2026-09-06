const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [
  ['Main calendar CSS', 'public/kpi-calendar-navy-light-v17.css'],
  ['Standalone calendar CSS', 'kpi-app/public/kpi-calendar-navy-light-v17.css'],
  ['Main layout', 'src/app/layout.tsx'],
  ['Standalone layout', 'kpi-app/src/app/layout.tsx'],
];

for (const [label, rel] of checks) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) throw new Error(`${label}: missing ${rel}`);
}

const mainCss = fs.readFileSync(path.join(root, 'public/kpi-calendar-navy-light-v17.css'), 'utf8');
const standaloneCss = fs.readFileSync(path.join(root, 'kpi-app/public/kpi-calendar-navy-light-v17.css'), 'utf8');
if (mainCss !== standaloneCss) throw new Error('Main and standalone calendar CSS are not identical');

for (const rel of ['src/app/layout.tsx', 'kpi-app/src/app/layout.tsx']) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!src.includes('/kpi-calendar-navy-light-v17.css?v=20260906-1')) {
    throw new Error(`${rel}: calendar theme stylesheet is not wired`);
  }
}

const requiredSelectors = [
  '#view-calendar .cal-filter',
  '#view-calendar .cal-scope-filter',
  '#view-calendar .cal-wrap',
  '#view-calendar .cal-head',
  '#view-calendar .cal-row',
  '#view-calendar .cal-day',
  '#view-calendar .cal-text',
  '#view-calendar .cal-owner',
  '.cal-modal-head',
];
for (const selector of requiredSelectors) {
  if (!mainCss.includes(selector)) throw new Error(`Missing selector: ${selector}`);
}
if (!mainCss.includes('background: var(--cal-paper)')) throw new Error('Calendar board must remain light');

console.log('✓ Kế hoạch khung v17: light board + flat navy controls wired for Main KPI and KPI standalone.');
