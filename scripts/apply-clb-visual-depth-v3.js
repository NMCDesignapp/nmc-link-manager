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

function refineDetailTables(source) {
  return source.replace(/<table\b[\s\S]*?<\/table>/g, (table) => {
    let next = table;

    // Mảnh hơn và tối hơn: 0.5px thay vì border 1px màu mint sáng.
    next = replaceAll(next, '[&_th]:!border-[#b9d4c6]', '[&_th]:!border-[#527969] [&_th]:!border-[0.5px]');
    next = replaceAll(next, '[&_td]:!border-[#c7ddd2]', '[&_td]:!border-[#78998d] [&_td]:!border-[0.5px]');
    next = replaceAll(next, 'border border-[#b9d4c6]', 'border-[0.5px] border-[#527969]');
    next = replaceAll(next, 'border border-[#c7ddd2]', 'border-[0.5px] border-[#78998d]');
    next = replaceAll(next, 'border border-[#d2e7dc]', 'border-[0.5px] border-[#527969]');
    next = replaceAll(next, 'border border-[#d8e7df]', 'border-[0.5px] border-[#78998d]');

    // Các trạng thái trên nền trắng phải dùng màu chữ đậm, không dùng mint/pastel sáng.
    next = replaceAll(next, 'text-emerald-200', 'text-[#075f38]');
    next = replaceAll(next, 'text-emerald-100', 'text-[#075f38]');
    next = replaceAll(next, 'text-[#137333]', 'text-[#075f38]');
    next = replaceAll(next, 'text-[#176b4a]', 'text-[#075f38]');
    next = replaceAll(next, 'text-sky-100', 'text-[#145b73]');
    next = replaceAll(next, 'text-violet-100', 'text-[#583b78]');
    next = replaceAll(next, 'text-amber-100', 'text-[#705300]');
    next = replaceAll(next, 'text-[#9eaea6]', 'text-[#586b62]');
    next = replaceAll(next, 'text-[#a8b8b0]', 'text-[#586b62]');

    // Giữ nền đạt/chưa đạt màu đặc nhưng tăng tương phản chữ.
    next = replaceAll(next, 'bg-[#dff3e7]', 'bg-[#e5f3ea]');
    next = replaceAll(next, 'bg-[#e6f6eb]', 'bg-[#e3f2e8]');
    next = replaceAll(next, 'bg-[#fce8e6]', 'bg-[#f7e4e1]');

    return next;
  });
}

function refineMainPage(source, file) {
  if (file !== 'src/app/clb-sao-viet/page.tsx') return source;

  // Nền trang đặc, tối và đồng nhất; các panel nổi bằng chênh tone + hard shadow màu đặc.
  source = replaceAll(source, 'relative z-10 min-h-screen bg-[#07100d] text-white', 'relative z-10 min-h-screen bg-[#05100c] text-white');

  source = replaceAll(
    source,
    'flex flex-col gap-4 border-b border-[#5f4f25] pb-5 sm:flex-row sm:items-center sm:justify-between',
    'flex flex-col gap-4 border border-[#315443] bg-[#0b1c15] px-3 py-3 shadow-[0_5px_0_#020805] sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-4'
  );

  // Khối chọn năm/đợt có nền riêng, tách khỏi header.
  source = replaceAll(
    source,
    'flex items-center gap-2 rounded-lg border border-[#2f4a3f] bg-[#102019] px-3 py-1.5',
    'flex items-center gap-2 rounded-lg border border-[#3b6553] bg-[#10271e] px-3 py-1.5 shadow-[0_2px_0_#020805]'
  );

  source = replaceAll(
    source,
    'mt-4 border border-[#5f4f25] bg-[#1b1a10] px-4 py-3 text-xs leading-5 text-[#b1c0b9]',
    'mt-4 border border-[#80691b] bg-[#211c09] px-4 py-3 text-xs leading-5 text-[#d3d8d5] shadow-[0_4px_0_#020805]'
  );

  // Thư mục lớn: viền vàng đậm, header xanh đặc, hard shadow tạo độ nổi nhưng không alpha.
  source = replaceAll(
    source,
    'mt-5 overflow-hidden border border-[#6e5922] bg-[#0b1511] shadow-none',
    'mt-5 overflow-hidden border border-[#8a701a] bg-[#07140f] shadow-[0_5px_0_#020805]'
  );
  source = replaceAll(
    source,
    'flex w-full items-center justify-between bg-[#102019] px-3 py-2.5 text-left transition hover:bg-[#173328] sm:px-5 sm:py-3',
    'flex w-full items-center justify-between bg-[#123728] px-3 py-2.5 text-left transition hover:bg-[#174632] sm:px-5 sm:py-3'
  );
  source = replaceAll(
    source,
    'space-y-2 border-t border-[#2f4a3f] p-2.5 sm:p-3',
    'space-y-2 border-t border-[#315443] bg-[#06110d] p-2.5 sm:p-3'
  );

  // Mỗi mục con là một panel riêng, nổi rõ hơn trên nền thư mục.
  source = replaceAll(
    source,
    'overflow-hidden border border-[#2f4a3f] bg-[#0e1915]',
    'overflow-hidden border border-[#315b49] bg-[#0d2118] shadow-[0_2px_0_#020805]'
  );
  source = replaceAll(
    source,
    'flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[#102019]',
    'flex w-full items-center justify-between bg-[#0f271d] px-4 py-3 text-left transition hover:bg-[#17402f]'
  );
  source = replaceAll(
    source,
    'border-t border-[#2f4a3f] bg-[#0a1712] px-2 pb-2 sm:px-4 sm:pb-3',
    'border-t border-[#315b49] bg-[#081710] px-2 pb-2 sm:px-4 sm:pb-3'
  );

  source = replaceAll(
    source,
    'border-t border-[#2f4a3f] bg-[#09120f] px-4 py-5 text-center text-xs text-[#9eaea6]',
    'border-t border-[#315b49] bg-[#081710] px-4 py-4 text-center text-xs text-[#b8c6c0]'
  );

  // Placeholder poster cũng dùng panel đặc thay vì nét đứt phẳng.
  source = replaceAll(
    source,
    'mt-5 border border-dashed border-[#2f4a3f] bg-[#0d1713] p-4 text-center text-xs text-[#91a39a]',
    'mt-5 border border-[#315443] bg-[#0a1913] p-4 text-center text-xs text-[#aebdb6] shadow-[0_3px_0_#020805]'
  );

  return source;
}

function assertNoTransparencyOutsideButtons(source, file) {
  const withoutButtons = source.replace(/<button\b[\s\S]*?<\/button>/g, '');
  const patterns = [
    { label: 'Tailwind alpha color', regex: /\b(?:bg|text|border|fill|stroke|from|via|to)-[^\s"'`{}]+\/(?:\d+|\[[^\]]+\])/g },
    { label: 'rgba()', regex: /rgba\s*\(/g },
    { label: 'transparent', regex: /\btransparent\b/g },
    { label: 'opacity utility', regex: /\bopacity-\d+\b/g },
  ];
  const violations = [];
  for (const pattern of patterns) {
    const matches = withoutButtons.match(pattern.regex) || [];
    for (const match of matches.slice(0, 8)) violations.push(`${pattern.label}: ${match}`);
  }
  if (violations.length > 0) {
    throw new Error(`[CLB visual v3] ${file} còn màu trong suốt ngoài button:\n- ${violations.join('\n- ')}`);
  }
}

for (const file of TARGETS) {
  if (!fs.existsSync(file)) throw new Error(`[CLB visual v3] Không tìm thấy ${file}`);
  let source = fs.readFileSync(file, 'utf8');
  source = refineDetailTables(source);
  source = refineMainPage(source, file);
  assertNoTransparencyOutsideButtons(source, file);
  fs.writeFileSync(file, source, 'utf8');
  console.log(`✓ CLB visual depth v3 applied: ${file}`);
}

console.log('✓ CLB Sao Việt: viền bảng 0.5px tối hơn, chữ ĐẠT đậm, panel chính nổi khối bằng màu đặc.');
