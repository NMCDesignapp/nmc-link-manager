const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const mainLayout = read('src/app/layout.tsx');
const standaloneLayout = read('kpi-app/src/app/layout.tsx');
const runtime = read('public/kpi-table-runtime-v27.js');
const css = read('public/kpi-table-runtime-v27.css');

const legacyScripts = [
  'kpi-detail-column-themes-v21.js',
  'kpi-detail-tier-fix-v22.js',
  'kpi-table-global-polish-v24.js',
  'kpi-rank-column-contrast-v25.js',
  'kpi-rank-header-structure-v26.js',
];

for (const [name, layout] of [['main', mainLayout], ['standalone', standaloneLayout]]) {
  if (!layout.includes('kpi-table-runtime-v27.js')) throw new Error(`${name}: v27 runtime missing`);
  if (!layout.includes('kpi-table-runtime-v27.css')) throw new Error(`${name}: v27 CSS missing`);
  for (const script of legacyScripts) {
    if (layout.includes(script)) throw new Error(`${name}: legacy table runtime still loaded: ${script}`);
  }
}

const observerCount = (runtime.match(/new MutationObserver/g) || []).length;
if (observerCount !== 1) throw new Error(`runtime: expected exactly 1 MutationObserver, found ${observerCount}`);
if (!runtime.includes('isPositiveAchieved')) throw new Error('runtime: achieved-state guard missing');
if (!runtime.includes('CHUA DAT|KHONG DAT|CHUA DU|KHONG DU')) throw new Error('runtime: negative-state exclusions missing');
if (!runtime.includes('nmc-header-subline-v27')) throw new Error('runtime: header subline formatting missing');
if (!css.includes("data-nmc-program='quy-tvv'")) throw new Error('css: quy-tvv scope missing');
if (!css.includes("data-nmc-program='quy-tn'")) throw new Error('css: quy-tn scope missing');
if (!css.includes('background: #bbf7d0 !important')) throw new Error('css: full achieved-cell fill missing');

console.log('KPI runtime v27 contract checks passed.');
