const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function applyReplacements(relativePath, replacements) {
  const filePath = path.join(root, relativePath);
  const originalSource = fs.readFileSync(filePath, 'utf8');
  const newline = originalSource.includes('\r\n') ? '\r\n' : '\n';
  let source = originalSource.replace(/\r\n/g, '\n');
  let changed = false;

  for (const { from, to, label } of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) {
      throw new Error(`[NTD effective-date rule] Không tìm thấy đoạn cần sửa (${label}) trong ${relativePath}`);
    }
    source = source.split(from).join(to);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, source.replace(/\n/g, newline), 'utf8');
    console.log(`✓ Đã cập nhật ${relativePath}`);
  } else {
    console.log(`• ${relativePath} đã đúng quy tắc >=, không cần sửa lại`);
  }
}

applyReplacements('src/lib/contest-calculator.ts', [
  {
    label: 'mô tả cấu hình',
    from: 'filterByEffectiveDate?: boolean; // true: chỉ tính TVV có ngày LV > ngày hiệu lực chức vụ gần nhất của NTD recruiter',
    to: 'filterByEffectiveDate?: boolean; // true: chỉ tính TVV có ngày LV >= ngày hiệu lực chức vụ gần nhất của NTD recruiter',
  },
  {
    label: 'quy tắc tài liệu',
    from: '- Chỉ giữ contract nếu: TVV.ngayBatDau > NTD.ngayHieuLuc\n *   (tức là TVV bắt đầu làm việc SAU ngày NTD được bổ nhiệm chức vụ hiện tại).',
    to: '- Chỉ giữ contract nếu: TVV.ngayBatDau >= NTD.ngayHieuLuc\n *   (tức là TVV bắt đầu làm việc BẰNG HOẶC SAU ngày NTD được bổ nhiệm chức vụ hiện tại).',
  },
  {
    label: 'chú thích phép so sánh',
    from: '// Chỉ giữ nếu TVV bắt đầu làm việc SAU ngày NTD được bổ nhiệm chức vụ\n    return ngayBatDauTs > ngayHieuLucTs;',
    to: '// Giữ nếu TVV bắt đầu làm việc BẰNG HOẶC SAU ngày NTD được bổ nhiệm chức vụ\n    return ngayBatDauTs >= ngayHieuLucTs;',
  },
]);

applyReplacements('src/app/thi-dua-chau/page.tsx', [
  {
    label: 'mô tả state',
    from: '// Filter by effective date — khi true: chỉ tính TVV có ngày LV (DS TVV) sau ngày hiệu lực chức vụ gần nhất của NTD recruiter',
    to: '// Filter by effective date — khi true: chỉ tính TVV có ngày LV (DS TVV) bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter',
  },
  {
    label: 'mô tả bộ lọc kết quả',
    from: '// Quy tắc: chỉ giữ HĐ của TVV có ngày bắt đầu LV (DS TVV) sau ngày hiệu lực chức vụ gần nhất của NTD recruiter',
    to: '// Quy tắc: chỉ giữ HĐ của TVV có ngày bắt đầu LV (DS TVV) bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter',
  },
  {
    label: 'phép so sánh kết quả',
    from: 'return ngayBatDauTs > ngayHieuLucTs;',
    to: 'return ngayBatDauTs >= ngayHieuLucTs;',
  },
  {
    label: 'chú thích giao diện',
    from: '{/* Filter by effective date — chỉ tính TVV có ngày LV sau ngày hiệu lực chức vụ gần nhất của NTD recruiter */}',
    to: '{/* Filter by effective date — chỉ tính TVV có ngày LV bằng hoặc sau ngày hiệu lực chức vụ gần nhất của NTD recruiter */}',
  },
  {
    label: 'nhãn ô tích',
    from: 'Chỉ tính TVV có ngày LV sau ngày hiệu lực CV gần nhất',
    to: 'Chỉ tính TVV có ngày LV bằng hoặc sau ngày hiệu lực CV gần nhất',
  },
  {
    label: 'hướng dẫn dưới ô tích',
    from: '<b>sau</b> ngày hiệu lực chức vụ gần nhất của NTD đã tuyển dụng họ',
    to: '<b>bằng hoặc sau</b> ngày hiệu lực chức vụ gần nhất của NTD đã tuyển dụng họ',
  },
]);

console.log('✓ Quy tắc NTD đã được chuẩn hóa: ngày bắt đầu làm việc >= ngày hiệu lực chức vụ gần nhất.');
