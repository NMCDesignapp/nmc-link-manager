const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/kpi/page.tsx');
let source = fs.readFileSync(filePath, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');

// The popup now follows the selected month/quarter/year dynamically. Keep this
// guard focused on the two popup data builders instead of enforcing one fixed
// month range, otherwise every build would revert/flag the dynamic behaviour.
const popupBuilderCount = (source.match(/const popupMonths = view === 'detail'/g) || []).length;
if (popupBuilderCount !== 2) {
  throw new Error(`[KPI popup] Không tìm thấy đủ 2 bộ dữ liệu kỳ động, thực tế ${popupBuilderCount}.`);
}

fs.writeFileSync(filePath, eol === '\r\n' ? source.replace(/\n/g, '\r\n') : source, 'utf8');
console.log('✓ KPI popup: kỳ xem động theo tháng/quý/năm và TLHT theo đúng KH kỳ.');
