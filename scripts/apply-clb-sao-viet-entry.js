#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/app/page.tsx');
const commandCenterPath = path.join(process.cwd(), 'src/components/home-command-center.tsx');
if (!fs.existsSync(filePath)) {
  console.error('✗ Không tìm thấy src/app/page.tsx');
  process.exit(1);
}

let source = fs.readFileSync(filePath, 'utf8');
const commandCenterSource = fs.existsSync(commandCenterPath)
  ? fs.readFileSync(commandCenterPath, 'utf8')
  : '';
let changed = false;

// Home mới tách navigation sang HomeCommandCenter. Nếu route CLB đã tồn tại ở đó,
// tuyệt đối không chèn lại theo cấu trúc Main App cũ.
const clbEntryAlreadyExists =
  source.includes("router.push('/clb-sao-viet')") ||
  commandCenterSource.includes("router.push('/clb-sao-viet')");

// Các patch dưới đây chỉ dành cho cấu trúc Main App legacy.
if (!clbEntryAlreadyExists) {
  // Thêm icon Star vào import lucide-react của trang Main App cũ.
  if (!/\bStar\b/.test(source.split("from 'lucide-react'")[0].split('\n').slice(-3).join('\n'))) {
    const oldImport = "Settings, Check, AlertCircle, Link2, Trophy, Database, BarChart3, Lock, Unlock, X, RefreshCw, Bell, Bold, Italic, Underline";
    if (source.includes(oldImport)) {
      source = source.replace(oldImport, `${oldImport}, Star`);
      changed = true;
    }
  }

  // 4 chức năng chính trên cùng một hàng: Thi Đua / Quản Lý / KPI / CLB SV.
  const mobileGrid = 'max-w-lg mx-auto w-full px-4 pb-2 flex-shrink-0 grid grid-cols-3 gap-2';
  if (source.includes(mobileGrid)) {
    source = source.replace(mobileGrid, 'max-w-lg mx-auto w-full px-4 pb-2 flex-shrink-0 grid grid-cols-4 gap-1.5');
    changed = true;
  }

  const desktopGrid = 'w-full px-8 py-3 flex-shrink-0 grid grid-cols-3 gap-2';
  if (source.includes(desktopGrid)) {
    source = source.replace(desktopGrid, 'w-full px-8 py-3 flex-shrink-0 grid grid-cols-4 gap-2');
    changed = true;
  }

  const clbButton = `
          <motion.button
            onClick={() => router.push('/clb-sao-viet')}
            className="py-2.5 md:py-3 rounded-none flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold text-white relative overflow-hidden"
            style={{ background: 'rgba(234,179,8,0.12)', border: '1.5px solid #eab30860', boxShadow: '0 4px 15px rgba(0,0,0,0.5), 0 0 12px rgba(234,179,8,0.2)' }}
            whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.6), 0 0 25px rgba(234,179,8,0.35)' }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <motion.div className="absolute h-[2px] w-[40%]" style={{ background: 'linear-gradient(90deg, transparent, #eab308, transparent)', boxShadow: '0 0 8px #eab30880, 0 0 16px #eab30840', top: -1, left: 0 }} animate={{ x: ['-100%', '300%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} />
            </div>
            <Star className="w-3.5 h-3.5 md:w-4 md:h-4 relative z-10" />
            <span className="relative z-10 md:hidden">CLB SV</span>
            <span className="relative z-10 hidden md:inline">CLB Sao Việt</span>
          </motion.button>`;

  const kpiButtonRegex = /(<motion\.button\s+onClick=\{\(\) => router\.push\('\/kpi'\)\}[\s\S]*?<\/motion\.button>)/g;
  let count = 0;
  source = source.replace(kpiButtonRegex, (match) => {
    count += 1;
    return `${match}${clbButton}`;
  });

  if (count !== 2) {
    console.error(`✗ Không tìm thấy cấu trúc Main App legacy để chèn CLB Sao Việt (${count}/2 nút KPI). Không ghi file.`);
    process.exit(1);
  }
  changed = true;
}

if (changed) {
  fs.writeFileSync(filePath, source, 'utf8');
  console.log('✓ Main App legacy: đã thêm chức năng CLB Sao Việt vào mobile + desktop.');
} else if (clbEntryAlreadyExists) {
  console.log('✓ Main App: route CLB Sao Việt đã tồn tại trong HomeCommandCenter; không thay đổi trang/route CLB.');
} else {
  console.log('✓ Main App: nút CLB Sao Việt đã tồn tại, không cần thay đổi.');
}

// Đồng bộ giao diện popup bảng chi tiết CLB theo bảng Chi tiết Tạm thu.
require('./apply-clb-detail-table-style.js');
// Chuẩn hóa toàn trang CLB: màu đặc, chữ dễ đọc và bảng chi tiết mật độ cao.
require('./apply-clb-solid-compact-v2.js');
// Tinh chỉnh lớp hiển thị cuối: viền bảng mảnh/tối, chữ trạng thái đậm, panel chính nổi khối bằng màu đặc.
require('./apply-clb-visual-depth-v3.js');
// Tách rõ từng tầng nền: navy / slate / teal / sáng / màu trạng thái; không chồng một họ xanh đen.
require('./apply-clb-layered-solid-v4.js');
