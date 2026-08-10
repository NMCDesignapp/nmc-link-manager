const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function updateFile(relativePath, transform) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const normalizedSource = source.replace(/\r\n/g, '\n');
  const next = transform(normalizedSource);
  if (next === normalizedSource) {
    console.log(`• ${relativePath} đã đúng quy tắc Excel, không cần sửa lại`);
    return;
  }
  fs.writeFileSync(filePath, next.replace(/\n/g, newline), 'utf8');
  console.log(`✓ Đã cập nhật ${relativePath}`);
}

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  // A later build step renames this local to avoid a duplicate declaration.
  // Treat that final form as already applied so repeated builds stay idempotent.
  const postProcessedTo = to.replaceAll('detailHeaders', 'sourceDetailHeaders');
  if (postProcessedTo !== to && source.includes(postProcessedTo)) return source;
  const ntdDateLayoutApplied = source.includes(
    "...(includeEligibilityDates ? [itemIndex === 0 ? (item.detail?.recruiterEffectiveDate ?? '') : ''] : [])",
  ) && source.includes(
    "...(includeEligibilityDates ? [item.detail?.startDate ?? ''] : [])",
  );
  const isPreLayoutNtdDateBlock = to.includes('includeEligibilityDates') && (
    to.includes("item.detail?.recruiterEffectiveDate ?? '', item.detail?.startDate")
    || (to.includes("'TVV'") && !to.includes('item.tvv'))
  );
  if (ntdDateLayoutApplied && isPreLayoutNtdDateBlock) return source;
  if (!source.includes(from)) {
    throw new Error(`[Contest Excel] Không tìm thấy đoạn cần sửa: ${label}`);
  }
  return source.replace(from, to);
}

updateFile('src/app/thi-dua-chau/page.tsx', (initial) => {
  let source = initial;

  source = replaceRequired(
    source,
    `    const expSecIP = showSecondaryTotalColumn && secondaryTotalIPMin > 0;`,
    `    const expSecIP = showSecondaryTotalColumn && secondaryTotalIPMin > 0;\n\n    // Hai cột phục vụ kiểm tra điều kiện NTD: ngày hiệu lực chức vụ của người\n    // tuyển dụng và ngày bắt đầu làm việc của TVV được tính vào chương trình.\n    const includeEligibilityDateColumns = filterByEffectiveDate && (targetType === 'nyd' || targetType === 'nhom');\n    const recruiterEffectiveDateMap = new Map<string, string>();\n    for (const recruiter of ntdCandidates) {\n      if (recruiter.agentCode && recruiter.ngayHieuLuc) {\n        recruiterEffectiveDateMap.set(recruiter.agentCode, recruiter.ngayHieuLuc);\n      }\n    }\n    const recruiterEffectiveDateFor = (recruiterCode: string): string => {\n      const date = recruiterEffectiveDateMap.get(recruiterCode);\n      return date ? formatDate(date) : '';\n    };`,
    'khai báo cột ngày kiểm tra điều kiện',
  );

  source = replaceRequired(
    source,
    `      const detailHeaders = ['STT', 'Ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP', 'AD', 'TÍNH LƯỢT 3 tr', 'MÃ ĐL TD', 'THƯỞNG'];`,
    `      const detailHeaders = ['STT', 'Ban', 'Nhóm', 'Mã Ban/Nhóm', 'Mã ĐL', 'Tên', 'Chức vụ', 'Ngày bắt đầu làm việc', ...(includeEligibilityDateColumns ? ['Ngày hiệu lực chức vụ NTD'] : []), 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP', 'AD', 'TÍNH LƯỢT 3 tr', 'MÃ ĐL TD', 'THƯỞNG'];`,
    'tiêu đề ngày hiệu lực chức vụ trong sheet chi tiết',
  );

  source = replaceRequired(
    source,
    `            c.ngayBatDauLamViec ? formatDate(c.ngayBatDauLamViec) : '',\n            c.contractNumber || '',`,
    `            c.ngayBatDauLamViec ? formatDate(c.ngayBatDauLamViec) : '',\n            ...(includeEligibilityDateColumns ? [recruiterEffectiveDateFor(c.maDaiLyTD || c.recruiterCode || '')] : []),\n            c.contractNumber || '',`,
    'giá trị ngày hiệu lực chức vụ trong sheet chi tiết',
  );

  source = replaceRequired(
    source,
    `    XLSX.writeFile(wb, \`ket_qua_thi_dua_\${new Date().toISOString().slice(0, 10)}.xlsx\`);`,
    `    const safeContestFileName = (contestTitle || '')\n      .trim()\n      .replace(/[\\\\/:*?\"<>|]/g, '_')\n      .replace(/\\s+/g, ' ')\n      .replace(/[. ]+$/g, '')\n      .slice(0, 120)\n      .trim();\n    const exportFileName = safeContestFileName\n      ? \`\${safeContestFileName}.xlsx\`\n      : \`ket_qua_thi_dua_\${new Date().toISOString().slice(0, 10)}.xlsx\`;\n    XLSX.writeFile(wb, exportFileName);`,
    'tên file theo tên chương trình',
  );

  return source;
});

updateFile('src/lib/xlsx-contest-wrapper.ts', (initial) => {
  let source = initial;

  source = replaceRequired(
    source,
    `  position: string;\n  contractNumber: string;\n  effectiveDate: CellValue;`,
    `  position: string;\n  startDate: CellValue;\n  recruiterEffectiveDate: CellValue;\n  contractNumber: string;\n  effectiveDate: CellValue;`,
    'kiểu dữ liệu ngày xét điều kiện',
  );

  source = replaceRequired(
    source,
    `  const positionIdx = findHeader(headers, ['Chức vụ']);\n  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);`,
    `  const positionIdx = findHeader(headers, ['Chức vụ']);\n  const startDateIdx = findHeader(headers, ['Ngày bắt đầu làm việc', 'Ngày BĐLV']);\n  const recruiterEffectiveDateIdx = findHeader(headers, ['Ngày hiệu lực chức vụ NTD', 'Ngày hiệu lực chức vụ']);\n  const contractIdx = findHeader(headers, ['Số hợp đồng', 'Số HĐ']);`,
    'đọc cột ngày từ sheet chi tiết',
  );

  source = replaceRequired(
    source,
    `    position: positionIdx >= 0 ? text(row[positionIdx]) : '',\n    contractNumber: contractIdx >= 0 ? text(row[contractIdx]) : '',`,
    `    position: positionIdx >= 0 ? text(row[positionIdx]) : '',\n    startDate: startDateIdx >= 0 ? row[startDateIdx] : '',\n    recruiterEffectiveDate: recruiterEffectiveDateIdx >= 0 ? row[recruiterEffectiveDateIdx] : '',\n    contractNumber: contractIdx >= 0 ? text(row[contractIdx]) : '',`,
    'lưu giá trị ngày từ sheet chi tiết',
  );

  source = replaceRequired(
    source,
    `function buildNTDResult(matrix: Matrix, details: DetailRecord[]) {`,
    `function buildNTDResult(matrix: Matrix, details: DetailRecord[], includeEligibilityDates = false) {`,
    'tham số ngày cho kết quả NTD',
  );

  source = replaceRequired(
    source,
    `    'STT', 'NHÓM', 'MÃ SỐ NTD', 'HỌ TÊN NTD', 'TVV',\n    ...(includeContract ? contractResultHeaders() : []),`,
    `    'STT', 'NHÓM', 'MÃ SỐ NTD', 'HỌ TÊN NTD',\n    ...(includeEligibilityDates ? ['NGÀY HIỆU LỰC CHỨC VỤ', 'NGÀY BẮT ĐẦU LÀM VIỆC'] : []),\n    'TVV',\n    ...(includeContract ? contractResultHeaders() : []),`,
    'tiêu đề ngày trong kết quả NTD',
  );

  source = replaceRequired(
    source,
    `        itemIndex === 0 ? group.name : '',\n        item.tvv,`,
    `        itemIndex === 0 ? group.name : '',\n        ...(includeEligibilityDates ? [item.detail?.recruiterEffectiveDate ?? '', item.detail?.startDate ?? ''] : []),\n        item.tvv,`,
    'giá trị ngày trong kết quả NTD',
  );

  source = replaceRequired(
    source,
    `function buildGroupResult(matrix: Matrix, details: DetailRecord[]) {`,
    `function buildGroupResult(matrix: Matrix, details: DetailRecord[], includeEligibilityDates = false) {`,
    'tham số ngày cho kết quả nhóm',
  );

  source = replaceRequired(
    source,
    `    'STT', 'NHÓM', 'MÃ SỐ', 'HỌ TÊN', 'CHỨC VỤ',\n    ...(includeContract ? contractResultHeaders() : []),`,
    `    'STT', 'NHÓM', 'MÃ SỐ', 'HỌ TÊN',\n    ...(includeEligibilityDates ? ['NGÀY HIỆU LỰC CHỨC VỤ', 'NGÀY BẮT ĐẦU LÀM VIỆC'] : []),\n    'CHỨC VỤ',\n    ...(includeContract ? contractResultHeaders() : []),`,
    'tiêu đề ngày trong kết quả nhóm',
  );

  source = replaceRequired(
    source,
    `      group.name,\n      group.position || 'Trưởng nhóm',\n      ...(includeContract ? ['', '', '', '', ''] : []),`,
    `      group.name,\n      ...(includeEligibilityDates ? ['', ''] : []),\n      group.position || 'Trưởng nhóm',\n      ...(includeContract ? ['', '', '', '', ''] : []),`,
    'dòng trưởng nhóm có hai cột ngày',
  );

  source = replaceRequired(
    source,
    `        child.detail.agentName,\n        child.detail.position,\n        ...(includeContract ? contractResultValues(child.contract, child.detail) : []),`,
    `        child.detail.agentName,\n        ...(includeEligibilityDates ? [child.detail.recruiterEffectiveDate ?? '', child.detail.startDate ?? ''] : []),\n        child.detail.position,\n        ...(includeContract ? contractResultValues(child.contract, child.detail) : []),`,
    'dòng TVV nhóm có hai cột ngày',
  );

  source = replaceRequired(
    source,
    `  const details = parseDetails(detailMatrix);\n  const headers = resultMatrix[0] || [];`,
    `  const details = parseDetails(detailMatrix);\n  const detailHeaders = detailMatrix[0] || [];\n  const includeEligibilityDates = findHeader(detailHeaders, ['Ngày hiệu lực chức vụ NTD']) >= 0;\n  const headers = resultMatrix[0] || [];`,
    'nhận diện chương trình có điều kiện ngày',
  );

  source = replaceRequired(
    source,
    `  const result = isNTD\n    ? buildNTDResult(resultMatrix, details)\n    : isGroup\n      ? buildGroupResult(resultMatrix, details)`,
    `  const result = isNTD\n    ? buildNTDResult(resultMatrix, details, includeEligibilityDates)\n    : isGroup\n      ? buildGroupResult(resultMatrix, details, includeEligibilityDates)`,
    'truyền cờ ngày vào bộ dựng kết quả',
  );

  source = replaceRequired(
    source,
    `export function writeFile(workbook: any, filename: string, options?: any): any {\n  if (/^ket_qua_thi_dua_/i.test(filename || '')) {`,
    `export function writeFile(workbook: any, filename: string, options?: any): any {\n  const isContestWorkbook = Boolean(\n    existingSheet(workbook, ['Kết quả thi đua', 'Kết quả'])\n    && existingSheet(workbook, ['Chi tiết HĐ', 'Chi tiết']),\n  );\n  if (isContestWorkbook || /^ket_qua_thi_dua_/i.test(filename || '')) {`,
    'nhận diện workbook khi tên file là tên chương trình',
  );

  return source;
});

console.log('✓ Excel thi đua: dùng tên chương trình và bổ sung cột ngày xét điều kiện.');
