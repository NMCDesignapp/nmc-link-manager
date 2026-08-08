const fs = require('fs');
const path = require('path');

const kpiPagePath = path.resolve(__dirname, '../src/app/kpi/page.tsx');
if (!fs.existsSync(kpiPagePath)) {
  throw new Error('[KPI linked loader] Không tìm thấy src/app/kpi/page.tsx');
}

let source = fs.readFileSync(kpiPagePath, 'utf8');
const oldMainIframe = ': `/quan-ly?sheet=${kpiSheet}&admin=1`';
const newMainIframe = ': `/quan-ly?sheet=${kpiSheet}&admin=1&from=kpi`';

if (source.includes(oldMainIframe)) {
  source = source.replace(oldMainIframe, newMainIframe);
} else if (!source.includes(newMainIframe)) {
  throw new Error('[KPI linked loader] Không tìm thấy URL iframe main app để bổ sung from=kpi');
}

fs.writeFileSync(kpiPagePath, source, 'utf8');
console.log('✓ KPI linked pages: main app truyền from=kpi, chỉ giữ popup loading ngang.');
