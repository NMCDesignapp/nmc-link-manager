const fs = require('fs');
const path = require('path');

// Sao Việt toàn chặng chỉ là lớp hiển thị các chương trình đã lưu từ Trang Thi đua.
// Yêu cầu nghiệp vụ: chương trình có tên bắt đầu bằng "CHỐT" vẫn được lưu ở Thi đua,
// nhưng KHÔNG tự xuất hiện thành card/bảng chi tiết trong Sao Việt toàn chặng.
//
// Patch được chạy ở build-time cho cả Main App và KPI standalone để tránh hai nguồn lệch nhau.
const targets = [
  path.resolve(__dirname, '../src/app/quan-ly/page.tsx'),
  path.resolve(__dirname, '../kpi-app/src/app/quan-ly/page.tsx'),
];

const marker = 'nmc-sao-viet-exclude-chot-v1';
const predicate = `!String(contest?.title || '').trimStart().normalize('NFC').toLocaleUpperCase('vi-VN').startsWith('CHỐT')`;

for (const filePath of targets) {
  if (!fs.existsSync(filePath)) continue;
  let source = fs.readFileSync(filePath, 'utf8');

  if (source.includes(marker)) {
    console.log(`✓ Sao Việt CHỐT filter đã có: ${path.relative(process.cwd(), filePath)}`);
    continue;
  }

  const fromAppData = 'if (appData.contests) setSavedContestsList(appData.contests);';
  const fromFreshFetch = 'if (!cancelled && Array.isArray(contests)) setSavedContestsList(contests);';

  if (!source.includes(fromAppData) || !source.includes(fromFreshFetch)) {
    throw new Error(`[Sao Việt filter] Không tìm thấy đúng 2 điểm nạp saved contests trong ${filePath}`);
  }

  source = source.replace(
    fromAppData,
    `// ${marker}\n    if (appData.contests) setSavedContestsList(appData.contests.filter((contest: any) => ${predicate}));`,
  );

  source = source.replace(
    fromFreshFetch,
    `if (!cancelled && Array.isArray(contests)) {\n          setSavedContestsList(contests.filter((contest: any) => ${predicate}));\n        }`,
  );

  fs.writeFileSync(filePath, source, 'utf8');
  console.log(`✓ Sao Việt: đã loại chương trình bắt đầu bằng CHỐT ở ${path.relative(process.cwd(), filePath)}`);
}
