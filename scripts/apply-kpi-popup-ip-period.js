const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/kpi/page.tsx');
let source = fs.readFileSync(filePath, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');

const oldMonths = 'const months37 = [3, 4, 5, 6, 7, 8, 9];';
const newMonths = 'const months37 = [6, 7, 8, 9, 10, 11, 12];';
const oldCount = source.split(oldMonths).length - 1;
const newCount = source.split(newMonths).length - 1;

if (oldCount > 0) source = source.split(oldMonths).join(newMonths);

source = source.replaceAll('months 3-9', 'months 6-12');

const finalCount = source.split(newMonths).length - 1;
if (finalCount !== 2 || (oldCount === 0 && newCount !== 2)) {
  throw new Error(`[KPI popup] Kỳ tháng không đồng nhất: mong đợi 2 bảng tháng 6-12, thực tế ${finalCount}.`);
}

fs.writeFileSync(filePath, eol === '\r\n' ? source.replace(/\n/g, '\r\n') : source, 'utf8');
console.log('✓ KPI popup: giữ TLHT = AFYP/KH và hiển thị IP tháng 6-12.');
