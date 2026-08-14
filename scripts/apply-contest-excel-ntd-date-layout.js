const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/lib/xlsx-contest-wrapper.ts');
const originalSource = fs.readFileSync(filePath, 'utf8');
const newline = originalSource.includes('\r\n') ? '\r\n' : '\n';
let source = originalSource.replace(/\r\n/g, '\n');

/**
 * Replaces a required source segment while preventing duplicate application.
 * @param {string} from - The source text to replace.
 * @param {string} to - The replacement text.
 * @param {string} label - A label included in the error when the source text is missing.
 * @throws {Error} If the source text is missing and the replacement text is not already present.
 */
function replaceRequired(from, to, label) {
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    throw new Error(`[Contest Excel NTD] Không tìm thấy đoạn cần sửa: ${label}`);
  }
  source = source.replace(from, to);
}

replaceRequired(
  `    'STT', 'NHÓM', 'MÃ SỐ NTD', 'HỌ TÊN NTD',\n    ...(includeEligibilityDates ? ['NGÀY HIỆU LỰC CHỨC VỤ', 'NGÀY BẮT ĐẦU LÀM VIỆC'] : []),\n    'TVV',`,
  `    'STT', 'NHÓM', 'MÃ SỐ NTD', 'HỌ TÊN NTD',\n    ...(includeEligibilityDates ? ['NGÀY HIỆU LỰC CHỨC VỤ'] : []),\n    'TVV',\n    ...(includeEligibilityDates ? ['NGÀY BẮT ĐẦU LÀM VIỆC'] : []),`,
  'vị trí hai cột ngày của kết quả NTD',
);

replaceRequired(
  `        itemIndex === 0 ? group.name : '',\n        ...(includeEligibilityDates ? [item.detail?.recruiterEffectiveDate ?? '', item.detail?.startDate ?? ''] : []),\n        item.tvv,`,
  `        itemIndex === 0 ? group.name : '',\n        ...(includeEligibilityDates ? [itemIndex === 0 ? (item.detail?.recruiterEffectiveDate ?? '') : ''] : []),\n        item.tvv,\n        ...(includeEligibilityDates ? [item.detail?.startDate ?? ''] : []),`,
  'giá trị ngày theo đúng đối tượng NTD và TVV',
);

replaceRequired(
  `    if (end > start) {\n      for (const col of [0, 1, 2, 3, outputHeaders.length - 1]) {\n        merges.push({ s: { r: start, c: col }, e: { r: end, c: col } });\n      }\n    }`,
  `    if (end > start) {\n      const ntdLevelColumns = [\n        0, 1, 2, 3,\n        ...(includeEligibilityDates ? [4] : []),\n        outputHeaders.length - 1,\n      ];\n      for (const col of ntdLevelColumns) {\n        merges.push({ s: { r: start, c: col }, e: { r: end, c: col } });\n      }\n    }`,
  'gộp ngày hiệu lực chức vụ theo NTD',
);

fs.writeFileSync(filePath, source.replace(/\n/g, newline), 'utf8');
console.log('✓ Excel NTD: gộp ngày hiệu lực chức vụ và đặt ngày bắt đầu làm việc sau tên TVV.');
