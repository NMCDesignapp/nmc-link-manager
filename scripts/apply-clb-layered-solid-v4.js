const fs = require('fs');

const TARGETS = [
  'src/app/clb-sao-viet/page.tsx',
  'src/components/clb-sao-viet-retention-tvv.tsx',
  'src/components/clb-sao-viet-retention-tn.tsx',
  'src/components/clb-sao-viet-retention-ttn.tsx',
  'src/components/clb-sao-viet-entry-simple.tsx',
  'src/components/clb-sao-viet-entry-ttn.tsx',
  'src/components/clb-sao-viet-post-assessment.tsx',
];

function replaceAll(source, from, to) {
  return source.split(from).join(to);
}

function pageLayers(source, file) {
  if (file !== 'src/app/clb-sao-viet/page.tsx') return source;

  // Mỗi tầng dùng một màu đặc khác nhau để tránh cảm giác xanh-đen chồng xanh-đen.
  source = replaceAll(source, 'bg-[#05100c]', 'bg-[#07131d]'); // nền trang: navy
  source = replaceAll(source, 'border border-[#315443] bg-[#0b1c15]', 'border border-[#365b72] bg-[#102a3d]'); // header: navy sáng
  source = replaceAll(source, 'border border-[#3b6553] bg-[#10271e]', 'border border-[#627888] bg-[#20394b]'); // bộ chọn kỳ: slate
  source = replaceAll(source, 'border border-[#80691b] bg-[#211c09]', 'border border-[#a1842b] bg-[#403413]'); // kỳ xét chung: nâu vàng

  // Khung thư mục: rêu; thanh tiêu đề: teal; vùng chứa mục: xám sáng.
  source = replaceAll(source, 'border border-[#8a701a] bg-[#07140f]', 'border border-[#8c7730] bg-[#1e2a22]');
  source = replaceAll(source, 'bg-[#123728]', 'bg-[#155c58]');
  source = replaceAll(source, 'hover:bg-[#174632]', 'hover:bg-[#1b6d67]');
  source = replaceAll(source, 'border-t border-[#315443] bg-[#06110d]', 'border-t border-[#87948b] bg-[#dce2de]');

  // Mục con: steel-blue; khi mở thì phần nội dung chuyển sang trắng ngà.
  source = replaceAll(source, 'border border-[#315b49] bg-[#0d2118]', 'border border-[#6d8594] bg-[#284b61]');
  source = replaceAll(source, 'bg-[#0f271d]', 'bg-[#2e566d]');
  source = replaceAll(source, 'hover:bg-[#17402f]', 'hover:bg-[#39677f]');
  source = replaceAll(source, 'border-t border-[#315b49] bg-[#081710]', 'border-t border-[#aeb9b2] bg-[#f5f1e8]');

  // Loading/placeholder cũng tách khỏi nền tối.
  source = replaceAll(source, 'border-t border-[#315b49] bg-[#081710]', 'border-t border-[#aeb9b2] bg-[#f5f1e8]');
  source = replaceAll(source, 'border border-[#315443] bg-[#0a1913]', 'border border-[#81958a] bg-[#d8e2dc]');
  source = replaceAll(source, 'text-[#aebdb6]', 'text-[#40564b]');

  return source;
}

function contentCards(source) {
  // Thẻ thống kê dùng màu solid bão hòa, mỗi loại một màu riêng.
  const replacements = [
    ['bg-[#102019] p-2', 'bg-[#335b72] p-2'],
    ['bg-[#102019] p-3', 'bg-[#335b72] p-3'],
    ['bg-[#102019] p-4', 'bg-[#335b72] p-4'],
    ['bg-[#09120f] p-2', 'bg-[#335b72] p-2'],
    ['bg-[#09120f] p-3', 'bg-[#335b72] p-3'],
    ['bg-[#0f2b20] p-2', 'bg-[#156443] p-2'],
    ['bg-[#0f2b20] p-3', 'bg-[#156443] p-3'],
    ['bg-[#0f2b20] p-4', 'bg-[#156443] p-4'],
    ['bg-[#2b1718] p-2', 'bg-[#843a40] p-2'],
    ['bg-[#2b1718] p-3', 'bg-[#843a40] p-3'],
    ['bg-[#2b1718] p-4', 'bg-[#843a40] p-4'],
    ['bg-[#112631] p-2', 'bg-[#2d6480] p-2'],
    ['bg-[#112631] p-3', 'bg-[#2d6480] p-3'],
    ['bg-[#21192c] p-2', 'bg-[#654d7d] p-2'],
    ['bg-[#21192c] p-3', 'bg-[#654d7d] p-3'],
  ];
  for (const [from, to] of replacements) source = replaceAll(source, from, to);

  // Chữ trên các card màu đậm phải sáng rõ, không dùng pastel mờ.
  source = replaceAll(source, 'text-[#9eaea6]', 'text-[#edf4f0]');
  source = replaceAll(source, 'text-[#a8b8b0]', 'text-[#edf4f0]');
  source = replaceAll(source, 'text-[#8fc8af]', 'text-[#d7f4e4]');
  source = replaceAll(source, 'text-[#a7d9c4]', 'text-[#d7f4e4]');
  source = replaceAll(source, 'text-[#e8acae]', 'text-[#ffe1e2]');
  source = replaceAll(source, 'text-[#efb9bb]', 'text-[#ffe1e2]');
  source = replaceAll(source, 'text-[#b7d9e8]', 'text-[#e1f4fc]');
  source = replaceAll(source, 'text-[#d1c0e2]', 'text-[#f1e8f8]');

  // Panel điều kiện xét: nâu vàng đặc, khác hẳn thống kê lẫn nền item.
  source = replaceAll(source, 'bg-[#0b1511] p-4', 'bg-[#4a3b16] p-4');
  source = replaceAll(source, 'bg-[#0b1511] p-3', 'bg-[#4a3b16] p-3');
  source = replaceAll(source, 'text-[#d0dad5]', 'text-[#f4f0df]');
  source = replaceAll(source, 'text-[#c0cdc7]', 'text-[#eee8d4]');
  source = replaceAll(source, 'text-[#b1c0b9]', 'text-[#ded7c2]');

  return source;
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
  assertNoTransparencyOutsideButtons(source, file);
  fs.writeFileSync(file, source, 'utf8');
  console.log(`✓ CLB layered solid v4 applied: ${file}`);
}

console.log('✓ CLB Sao Việt: tách lớp nền solid rõ ràng — navy / slate / teal / xám sáng / steel-blue / trắng ngà / màu trạng thái.');
