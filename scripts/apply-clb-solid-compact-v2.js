const fs = require('fs');

const TARGETS = [
  'src/app/clb-sao-viet/page.tsx',
  'src/components/clb-sao-viet-retention-tvv.tsx',
  'src/components/clb-sao-viet-retention-tn.tsx',
  'src/components/clb-sao-viet-retention-ttn.tsx',
  'src/components/clb-sao-viet-entry-simple.tsx',
  'src/components/clb-sao-viet-entry-ttn.tsx',
];

const MARKER = 'nmc-clb-solid-compact-v2';

function replaceAll(source, from, to) {
  return source.split(from).join(to);
}

function applySharedSolidPalette(source) {
  const replacements = [
    // Neutral borders / surfaces outside main action buttons.
    ['border-white/10', 'border-[#2f4a3f]'],
    ['border-amber-300/15', 'border-[#5f4f25]'],
    ['border-amber-300/20', 'border-[#6e5922]'],
    ['border-amber-300/25', 'border-[#6e5922]'],
    ['border-emerald-400/20', 'border-[#2f6e56]'],
    ['border-rose-400/20', 'border-[#7c3b3f]'],
    ['border-sky-400/20', 'border-[#315d72]'],
    ['border-violet-400/20', 'border-[#5d4875]'],
    ['border-violet-300/30', 'border-[#6a5480]'],

    ['bg-white/[0.035]', 'bg-[#102019]'],
    ['bg-white/[0.02]', 'bg-[#0d1713]'],
    ['bg-black/10', 'bg-[#09120f]'],
    ['bg-black/15', 'bg-[#09120f]'],
    ['bg-black/20', 'bg-[#08110e]'],
    ['bg-black/25', 'bg-[#102019]'],
    ['bg-black/70', 'bg-[#020706]'],
    ['bg-black/75', 'bg-[#020706]'],
    ['bg-black/80', 'bg-[#020706]'],
    ['bg-[#0b1511]/95', 'bg-[#0b1511]'],
    ['bg-amber-300/[0.035]', 'bg-[#1b1a10]'],
    ['bg-emerald-400/[0.055]', 'bg-[#0f2b20]'],
    ['bg-emerald-400/[0.06]', 'bg-[#0f2b20]'],
    ['bg-emerald-400/[0.07]', 'bg-[#dff3e7]'],
    ['bg-rose-400/[0.05]', 'bg-[#2b1718]'],
    ['bg-sky-400/[0.05]', 'bg-[#112631]'],
    ['bg-violet-400/[0.05]', 'bg-[#21192c]'],
    ['bg-violet-400/[0.08]', 'bg-[#eee7f7]'],
    ['bg-violet-300/10', 'bg-[#241c31]'],

    // Readable solid text colors.
    ['text-white/35', 'text-[#91a39a]'],
    ['text-white/40', 'text-[#9eaea6]'],
    ['text-white/45', 'text-[#a8b8b0]'],
    ['text-white/50', 'text-[#b1c0b9]'],
    ['text-white/55', 'text-[#b9c7c0]'],
    ['text-white/60', 'text-[#c0cdc7]'],
    ['text-white/65', 'text-[#c7d3cd]'],
    ['text-white/70', 'text-[#d0dad5]'],
    ['text-white/75', 'text-[#d7dfdb]'],
    ['text-white/80', 'text-[#dee5e1]'],
    ['text-white/85', 'text-[#e6ebe8]'],
    ['text-amber-100/80', 'text-[#f6dc96]'],
    ['text-emerald-100/45', 'text-[#8fc8af]'],
    ['text-emerald-100/55', 'text-[#a7d9c4]'],
    ['text-emerald-100/60', 'text-[#b4e1ce]'],
    ['text-rose-100/55', 'text-[#efb9bb]'],
    ['text-rose-100/60', 'text-[#f2c4c5]'],
    ['text-sky-100/55', 'text-[#b7d9e8]'],
    ['text-violet-100/55', 'text-[#d1c0e2]'],
    ['fill-amber-300/20', 'fill-[#f2bd3f]'],
    ['focus:border-amber-400/60', 'focus:border-[#d3a62c]'],
  ];

  for (const [from, to] of replacements) source = replaceAll(source, from, to);

  // Do not use translucent decorative gradients on CLB cards.
  source = source.replace(/bg-gradient-to-b\s+from-[^\s"]+\s+via-[^\s"]+\s+to-transparent/g, 'bg-[#d4a72c]');
  // Remove alpha-based shadows from CLB surfaces.
  source = source.replace(/shadow-\[[^\]]*rgba\([^\)]*\)[^\]]*\]/g, 'shadow-none');
  // Detail-table secondary lines inherit an explicit solid text color, so opacity is unnecessary.
  source = source.replace(/\sopacity-(?:40|50|60|70|75|80)/g, '');
  return source;
}

function compactTables(source) {
  // Natural-width tables keep STT / code / status columns from becoming as wide as name columns.
  source = replaceAll(source, 'min-w-[1040px] w-full table-fixed', 'min-w-[820px] w-max min-w-full table-auto');
  source = replaceAll(source, 'min-w-[1120px] w-full table-fixed', 'min-w-[860px] w-max min-w-full table-auto');
  source = replaceAll(source, 'min-w-[1420px] w-full table-fixed', 'min-w-[1020px] w-max min-w-full table-auto');
  source = replaceAll(source, 'min-w-[1580px] w-full table-fixed', 'min-w-[1160px] w-max min-w-full table-auto');

  source = replaceAll(
    source,
    'bg-white text-[11px] [&_th]:!border-[#d2e7dc] [&_th]:!px-2 [&_th]:!py-2 [&_td]:!border-[#d8e7df] [&_td]:!bg-transparent [&_td]:!px-2 [&_td]:!py-1.5 [&_td]:!text-[#183548]',
    'bg-white text-[10px] [&_th]:!whitespace-nowrap [&_th]:!border-[#b9d4c6] [&_th]:!px-1.5 [&_th]:!py-1.5 [&_td]:!whitespace-nowrap [&_td]:!border-[#c7ddd2] [&_td]:!bg-white [&_td]:!px-1.5 [&_td]:!py-1 [&_td]:!text-[#102a22]'
  );

  // Entry tables were already solid but still too roomy.
  source = replaceAll(source, 'bg-white text-[11px]', 'bg-white text-[10px]');
  source = replaceAll(source, 'border border-[#d2e7dc] px-2 py-2', 'border border-[#b9d4c6] px-1.5 py-1.5 whitespace-nowrap');
  source = replaceAll(source, 'border border-[#d8e7df] px-2 py-1.5', 'border border-[#c7ddd2] px-1.5 py-1 whitespace-nowrap');
  source = replaceAll(source, 'text-[#183548]', 'text-[#102a22]');
  source = replaceAll(source, 'text-[#48695a]', 'text-[#2f5948]');
  source = replaceAll(source, 'text-[#6b7f74]', 'text-[#4b6558]');
  source = replaceAll(source, 'text-[#6b8a79]', 'text-[#4f7462]');

  // Tighten status cells / result badges.
  source = replaceAll(source, 'px-2 py-0.5 text-[10px] font-black', 'px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap');
  source = replaceAll(source, 'text-base font-black', 'text-sm font-black');
  source = replaceAll(source, 'text-lg font-black', 'text-sm font-black');
  source = replaceAll(source, 'mt-1 text-[10px]', 'mt-0.5 text-[9px]');
  return source;
}

for (const file of TARGETS) {
  if (!fs.existsSync(file)) throw new Error(`[CLB solid compact] Không tìm thấy ${file}`);
  let source = fs.readFileSync(file, 'utf8');

  // Remove the translucent decorative page overlay entirely; the page already has a solid base background.
  if (file === 'src/app/clb-sao-viet/page.tsx') {
    source = source.replace(
      /\n\s*<div\n\s*className="fixed inset-0 pointer-events-none"\n\s*style=\{\{[\s\S]*?\}\}\n\s*\/>\n/,
      '\n'
    );
  }

  source = applySharedSolidPalette(source);
  source = compactTables(source);

  // Solid detail modal shell: no translucent backdrop or alpha shadow.
  source = replaceAll(source, 'bg-[#020706] p-3 sm:p-5', 'bg-[#020706] p-2 sm:p-3');
  source = replaceAll(source, 'h-[82vh] w-[min(96vw,1380px)]', 'h-[84vh] w-[min(98vw,1440px)]');

  if (!source.includes(MARKER)) {
    source = `${source.trimEnd()}\n\n// ${MARKER}\n`;
  }

  fs.writeFileSync(file, source, 'utf8');
  console.log(`✓ CLB solid/compact v2 applied: ${file}`);
}

console.log('✓ CLB Sao Việt: màu đặc + bảng compact đã được áp dụng; nút thao tác chính giữ nguyên thiết kế riêng.');
