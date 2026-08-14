const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/kpi/page.tsx');
const originalSource = fs.readFileSync(filePath, 'utf8');
const newline = originalSource.includes('\r\n') ? '\r\n' : '\n';
let source = originalSource.replace(/\r\n/g, '\n');

/**
 * Replaces a required source fragment with its updated text.
 * @param {string} from - The source fragment to replace.
 * @param {string} to - The replacement text.
 * @param {string} label - A label identifying the expected source fragment in error messages.
 * @throws {Error} If the source contains neither the replacement text nor the expected fragment.
 */
function replaceRequired(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    throw new Error(`[KPI popup] Không tìm thấy đoạn cần sửa: ${label}`);
  }
  source = source.replace(from, to);
}

replaceRequired(
  `<span className="adp-info-key" title="% hoàn thành">%HT</span>`,
  `<span className="adp-info-key" title="Tỷ trọng IP">TỶ TRỌNG IP</span>`,
  'đổi nhãn %HT thành Tỷ trọng IP',
);

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

fs.writeFileSync(filePath, source.replace(/\n/g, newline), 'utf8');
console.log('✓ KPI popup: đã đổi %HT thành Tỷ trọng IP và hiển thị IP tháng 6-12.');
