const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/clb-sao-viet-post-assessment.tsx');
const marker = '// nmc-clb-post-assessment-entry-title-v1';

if (!fs.existsSync(filePath)) {
  throw new Error(`Không tìm thấy ${filePath}`);
}

let source = fs.readFileSync(filePath, 'utf8');
if (source.includes(marker)) {
  console.log('✓ CLB post-assessment entry title already applied.');
  process.exit(0);
}

const replacements = [
  [
    "  assessment: { year: number; month: number; label: string };",
    "  assessment: { year: number; month: number; label: string; entryPeriodLabel?: string };",
  ],
  [
    "  const calc = data.calculations || {};",
    `  const calc = data.calculations || {};\n  ${marker}\n  const entryPeriodLabel = data.assessment.entryPeriodLabel\n    || (calc.giaNhapTVV?.months || []).map((item: any) => String(item?.label || '')).filter(Boolean).join(' - ')\n    || '3 tháng liền trước';`,
  ],
  [
    "    'DS THÀNH VIÊN CLB SAO VIỆT SAU ĐỢT XÉT',",
    "    `DS THÀNH VIÊN CLB SAO VIỆT SAU ĐỢT XÉT ${label}` ,",
  ],
  [
    "    `Đợt xét: ${label} • SV 2025/SV 2026 là thành viên mặc định và được giữ nguyên ghi chú`,",
    "    `Kỳ lấy số liệu: ${entryPeriodLabel}` ,",
  ],
  [
    "    [6, 16, 20, 14, 28, 18, 34],\n  );",
    `    [6, 16, 20, 14, 28, 18, 34],\n  );\n\n  const dsSheet = wb.Sheets.DS;\n  if (dsSheet?.A2) {\n    dsSheet.A2.s = {\n      ...(dsSheet.A2.s || {}),\n      font: { ...(dsSheet.A2.s?.font || {}), bold: false, italic: true },\n    };\n  }`,
  ],
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) {
    throw new Error(`Không tìm thấy mẫu cần cập nhật trong ${filePath}: ${from.slice(0, 90)}`);
  }
  source = source.replace(from, to);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('✓ CLB post-assessment Excel title/period applied.');
