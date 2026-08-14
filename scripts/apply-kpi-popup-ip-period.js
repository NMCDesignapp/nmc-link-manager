const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/kpi/page.tsx');
let source = fs.readFileSync(filePath, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
source = source.replace(/\r\n/g, '\n');

function replaceRequired(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    throw new Error(`[KPI popup] Không tìm thấy đoạn cần sửa: ${label}`);
  }
  source = source.replace(from, to);
}

replaceRequired(
  `    // IP per month per TVV (months 3-9) — tính trực tiếp từ TẤT CẢ hợp đồng trong năm
    // theo agentCode, KHÔNG lọc qua finalContracts. Lý do: dữ liệu hợp đồng đôi khi
    // thiếu maBanNhom (trống) → nếu lọc qua finalContracts thì IP của TVV sẽ bị thiếu.
    // IP = sum của contract.pdt10DT theo tháng doanh số (issueDate, fallback effectiveDate).
    // Nếu pdt10DT = 0 → để 0 (không fallback sang fyp hay số khác).
    const months37 = [3, 4, 5, 6, 7, 8, 9];`,
  `    // IP per month per TVV (months 6-12) — tính trực tiếp từ TẤT CẢ hợp đồng trong năm
    // theo agentCode, KHÔNG lọc qua finalContracts. Lý do: dữ liệu hợp đồng đôi khi
    // thiếu maBanNhom (trống) → nếu lọc qua finalContracts thì IP của TVV sẽ bị thiếu.
    // IP = sum của contract.pdt10DT theo tháng doanh số (issueDate, fallback effectiveDate).
    // Nếu pdt10DT = 0 → để 0 (không fallback sang fyp hay số khác).
    const months37 = [6, 7, 8, 9, 10, 11, 12];`,
  'đổi kỳ IP chi tiết nhóm/AD từ tháng 3-9 sang tháng 6-12',
);

fs.writeFileSync(filePath, eol === '\r\n' ? source.replace(/\n/g, '\r\n') : source, 'utf8');
console.log('✓ KPI popup: giữ TLHT = AFYP/KH và hiển thị IP tháng 6-12.');
