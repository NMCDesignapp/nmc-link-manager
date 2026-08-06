const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/lib/xlsx-contest-wrapper.ts');
let source = fs.readFileSync(filePath, 'utf8');

const from = `  const details = parseDetails(detailMatrix);\n  const detailHeaders = detailMatrix[0] || [];\n  const includeEligibilityDates = findHeader(detailHeaders, ['Ngày hiệu lực chức vụ NTD']) >= 0;\n  const headers = resultMatrix[0] || [];`;
const to = `  const details = parseDetails(detailMatrix);\n  const sourceDetailHeaders = detailMatrix[0] || [];\n  const includeEligibilityDates = findHeader(sourceDetailHeaders, ['Ngày hiệu lực chức vụ NTD']) >= 0;\n  const headers = resultMatrix[0] || [];`;

if (source.includes(to)) {
  console.log('• Biến tiêu đề chi tiết Excel đã đúng');
} else if (source.includes(from)) {
  source = source.replace(from, to);
  fs.writeFileSync(filePath, source, 'utf8');
  console.log('✓ Đã sửa xung đột biến tiêu đề chi tiết Excel');
} else {
  throw new Error('[Contest Excel] Không tìm thấy đoạn biến tiêu đề chi tiết cần sửa');
}
