const fs = require('fs');

const TARGETS = [
  'src/app/clb-sao-viet/page.tsx',
  'src/components/clb-sao-viet-retention-tvv.tsx',
  'src/components/clb-sao-viet-retention-tn.tsx',
  'src/components/clb-sao-viet-retention-ttn.tsx',
  'src/components/clb-sao-viet-entry-simple.tsx',
  'src/components/clb-sao-viet-entry-ttn.tsx',
];

function replaceAll(source, from, to) {
  return source.split(from).join(to);
}

function pageLayers(source, file) {
  if (file !== 'src/app/clb-sao-viet/page.tsx') return source;

  // 1. Nền trang: navy rất đậm.
  source = replaceAll(source, 'bg-[#05100c]', 'bg-[#07131d]');

  // 2. Header chính: xanh navy sáng hơn nền trang.
  source = replaceAll(source, 'border border-[#315443] bg-[#0b1c15]', 'border border-[#34536a] bg-[#10283a]');

  // 3. Ô chọn kỳ: xanh slate riêng, không cùng màu header.
  source = replaceAll(source, 'border border-[#3b6553] bg-[#10271e]', 'border border-[#556878] bg-[#1b3446]');

  // 4. Kỳ xét dùng chung: vàng nâu đặc.
  source = replaceAll(source, 'border border-[#80691b] bg-[#211c09]', 'border border-[#9c7c22] bg-[#3a310e]');

  // 5. Khung thư mục: xanh rêu đậm; header thư mục: teal khác hẳn.
  source = replaceAll(source, 'border border-[#8a701a] bg-[#07140f]', 'border border-[#8b762d] bg-[#17241d]');
  source = replaceAll(source, 'bg-[#123728]', 'bg-[#155c58]');
  source = replaceAll(source, 'hover:bg-[#174632]', 'hover:bg-[#1a6b65]');
  source = replaceAll(source, 'border-t border-[#315443] bg-[#06110d]', 'border-t border-[#6d7b6f] bg-[#dfe5df]');

  // 6. Mục con: tiêu đề kem sáng, nội dung trắng ngà — tách hoàn toàn khỏi khung tối.
  source = replaceAll(source, 'border border-[#315b49] bg-[#0d2118]', 'border border-[#a9b3a8] bg-[#f6f1e3]');
  source = replaceAll(source, 'bg-[#0f271d]', 'bg-[#f2ead6]');
  source = replaceAll(source, 'hover:bg-[#17402f]', 'hover:bg-[#e8ddc1]');
  source = replaceAll(source, 'border-t border-[#315b49] bg-[#081710]', 'border-t border-[#b7c1b7] bg-[#fbfaf5]');

  // Text của tiêu đề mục con trên nền sáng.
  source = source.replace(/(bg-\[#f2ead6\][^\"]*)text-white/g, '$1text-[#24352d]');
  source = source.replace(/(bg-\[#f2ead6\][^\"]*)text-amber-100/g, '$1text-[#59430b]');

  // Poster placeholder: xám xanh sáng, không cùng màu nền trang.
  source = replaceAll(source, 'border border-[#315443] bg-[#0a1913]', 'border border-[#82958a] bg-[#d9e3de]');
  source = replaceAll(source, 'text-[#aebdb6]', 'text-[#40564b]');

  return source;
}

function contentCards(source) {
  // Vùng thống kê: nền sáng đặc, chữ tối rõ. Mỗi trạng thái có một màu riêng.
  const replacements = [
    ['bg-[#102019] p-2', 'bg-[#e7edf2] p-2'],
    ['bg-[#102019] p-3', 'bg-[#e7edf2] p-3'],
    ['bg-[#102019] p-4', 'bg-[#e7edf2] p-4'],
    ['bg-[#09120f] p-2', 'bg-[#e7edf2] p-2'],
    ['bg-[#09120f] p-3', 'bg-[#e7edf2] p-3'],
    ['bg-[#0f2b20] p-2', 'bg-[#dcefe3] p-2'],
    ['bg-[#0f2b20] p-3', 'bg-[#dcefe3] p-3'],
    ['bg-[#0f2b20] p-4', 'bg-[#dcefe3] p-4'],
    ['bg-[#2b1718] p-2', 'bg-[#f1dddd] p-2'],
    ['bg-[#2b1718] p-3', 'bg-[#f1dddd] p-3'],
    ['bg-[#2b1718] p-4', 'bg-[#f1dddd] p-4'],
    ['bg-[#112631] p-2', 'bg-[#dce9f1] p-2'],
    ['bg-[#112631] p-3', 'bg-[#dce9f1] p-3'],
    ['bg-[#21192c] p-2', 'bg-[#e8e0ef] p-2'],
    ['bg-[#21192c] p-3', 'bg-[#e8e0ef] p-3'],
  ];
  for (const [from, to] of replacements) source = replaceAll(source, from, to);

  // Text trong thẻ thống kê sáng -> tối tương phản cao.
  source = replaceAll(source, 'text-white', 'text-[#17251f]');
  source = replaceAll(source, 'text-[#9eaea6]', 'text-[#4c5f55]');
  source = replaceAll(source, 'text-[#a8b8b0]', 'text-[#4c5f55]');
  source = replaceAll(source, 'text-[#8fc8af]', 'text-[#17643f]');
  source = replaceAll(source, 'text-[#a7d9c4]', 'text-[#17643f]');
  source = replaceAll(source, 'text-[#e8acae]', 'text-[#8b2f36]');
  source = replaceAll(source, 'text-[#efb9bb]', 'text-[#8b2f36]');
  source = replaceAll(source, 'text-[#b7d9e8]', 'text-[#235d78]');
  source = replaceAll(source, 'text-[#d1c0e2]', 'text-[#62477c]');

  // Panel điều kiện xét: vàng kem sáng, chữ tối. Chỉ áp vùng section, không áp popup bảng.
  source = replaceAll(source, 'border border-[#8b6d22] bg-[#0b1511] p-4', 'border border-[#b49335] bg-[#fff3cf] p-4');
  source = replaceAll(source, 'border border-[#6e5922] bg-[#0b1511] p-4', 'border border-[#b49335] bg-[#fff3cf] p-4');
  source = replaceAll(source, 'border border-[#5f4f25] bg-[#0b1511] p-4', 'border border-[#b49335] bg-[#fff3cf] p-4');
  source = replaceAll(source, 'text-[#f6dc96]', 'text-[#5a4300]');
  source = replaceAll(source, 'text-[#d0dad5]', 'text-[#405047]');
  source = replaceAll(source, 'text-[#c0cdc7]', 'text-[#405047]');
  source = replaceAll(source, 'text-[#b1c0b9]', 'text-[#526159]');

  // Các icon/giá trị đạt/chưa đạt trên card sáng.
  source = replaceAll(source, 'text-emerald-200', 'text-[#0b6b42]');
  source = replaceAll(source, 'text-emerald-300', 'text-[#0b6b42]');
  source = replaceAll(source, 'text-rose-200', 'text-[#982f36]');
  source = replaceAll(source, 'text-rose-300', 'text-[#982f36]');
  source = replaceAll(source, 'text-sky-200', 'text-[#1f6380]');
  source = replaceAll(source, 'text-violet-200', 'text-[#6a4a83]');
  source = replaceAll(source, 'text-amber-100', 'text-[#5a4300]');
  source = replaceAll(source, 'text-amber-200', 'text-[#5a4300]');

  return source;
}

function keepButtonsReadable(source) {
  // Việc đổi text-white sang tối ở trên không được làm các nút solid tối mất tương phản.
  return source.replace(/<button\b[\s\S]*?<\/button>/g, (button) => {
    let next = button;
    if (/bg-\[#239a69\]|bg-emerald|bg-amber|bg-\[#155c58\]|bg-\[#123728\]/.test(next)) {
      next = replaceAll(next, 'text-[#17251f]', 'text-white');
    }
    return next;
  });
}

function assertNoTransparencyOutsideButtons(source, file) {
  const withoutButtons = source.replace(/<button\b[\s\S]*?<\/button>/g, '');
  const patterns = [
    /\b(?:bg|text|border|fill|stroke|from|via|to)-[^\s"'`{}]+\/(?:\d+|\[[^\]]+\])/g,
    /rgba\s*\(/g,
    /\btransparent\b/g,
    /\bopacity-\d+\b/g,
  ];
  for (const regex of patterns) {
    const hits = withoutButtons.match(regex) || [];
    if (hits.length) throw new Error(`[CLB layered solid v4] ${file} còn màu trong suốt ngoài button: ${hits.slice(0, 5).join(', ')}`);
  }
}

for (const file of TARGETS) {
  if (!fs.existsSync(file)) throw new Error(`[CLB layered solid v4] Không tìm thấy ${file}`);
  let source = fs.readFileSync(file, 'utf8');
  source = pageLayers(source, file);
  source = contentCards(source);
  source = keepButtonsReadable(source);
  assertNoTransparencyOutsideButtons(source, file);
  fs.writeFileSync(file, source, 'utf8');
  console.log(`✓ CLB layered solid v4 applied: ${file}`);
}

console.log('✓ CLB Sao Việt: các lớp nền đã tách màu rõ ràng — navy / teal / kem / trắng / pastel solid.');
