const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'kpi-calendar-navy-light-v17.css');
const target = path.join(root, 'kpi-app', 'public', 'kpi-calendar-navy-light-v17.css');

if (!fs.existsSync(source)) throw new Error(`Missing source: ${source}`);
const css = fs.readFileSync(source, 'utf8');
if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== css) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, css, 'utf8');
  console.log('✓ Synced Kế hoạch khung calendar theme to KPI standalone.');
} else {
  console.log('✓ Kế hoạch khung calendar theme already in sync.');
}
