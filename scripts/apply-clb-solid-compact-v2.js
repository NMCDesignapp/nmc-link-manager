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
    // Neutral borders / surfaces. Main action buttons are intentionally not covered by /30-/35 rules.
    ['border-white/[0.07]', 'border-[#c7ddd2]'],
    ['border-white/10', 'border-[#2f4a3f]'],
    ['border-amber-200/20', 'border-[#b9d4c6]'],
    ['border-amber-300/15', 'border-[#5f4f25]'],
    ['border-amber-300/20', 'border-[#6e5922]'],
    ['border-amber-300/25', 'border-[#6e5922]'],
    ['border-emerald-400/20', 'border-[#2f6e56]'],
    ['border-rose-400/20', 'border-[#7c3b3f]'],
    ['border-sky-400/20', 'border-[#315d72]'],
    ['border-violet-400/20', 'border-[#5d4875]'],

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

    // Readable solid text colors.
    ['text-white/25', 'text-[#82958b]'],
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
    ['text-rose-100/45', 'text-[#e8acae]'],
    ['text-rose-100/55', 'text-[#efb9bb]'],
    ['text-rose-100/60', 'text-[#f2c4c5]'],
    ['text-sky-100/45', 'text-[#a7cede]'],
    ['text-sky-100/55', 'text-[#b7d9e8]'],
    ['text-violet-100/45', 'text-[#c3aed8]'],
    ['text-violet-100/55', 'text-[#d1c0e2]'],
    ['fill-amber-300/20', 'fill-[#f2bd3f]'],
    ['focus:border-amber-400/60', 'focus:border-[#d3a62c]'],
  ];

  for (const [from, to] of replacements) source = replaceAll(source, from, to);

  // Solid non-button error panels.
  source = replaceAll(
    source,
    'border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100',
    'border border-[#8e4b4e] bg-[#351b1d] px-4 py-3 text-sm text-[#ffd9da]'
  );

  // Solid numbered/chapter badges on retention cards. Main action buttons keep their own translucent treatment.
  source = replaceAll(source, 'border border-amber-300/30 bg-amber-300/10 text-lg font-black text-amber-200', 'border border-[#8b6d22] bg-[#32280f] text-lg font-black text-[#f6d77f]');
  source = replaceAll(source, 'border border-emerald-300/30 bg-emerald-300/10 text-lg font-black text-emerald-200', 'border border-[#34795d] bg-[#123427] text-lg font-black text-[#afe4cc]');
  source = replaceAll(source, 'border border-violet-300/30 bg-violet-300/10 text-lg font-black text-violet-200', 'border border-[#6a5480] bg-[#241c31] text-lg font-black text-[#d9c8e9]');

  // Do not use translucent decorative gradients on CLB cards.
  source = source.replace(/bg-gradient-to-b\s+from-[^\s"]+\s+via-[^\s"]+\s+to-transparent/g, 'bg-[#d4a72c]');
  // Remove alpha-based shadows from CLB surfaces.
  source = source.replace(/shadow-\[[^\]]*rgba\([^\)]*\)[^\]]*\]/g, 'shadow-none');
  // Secondary table lines receive explicit solid text colors, so opacity is unnecessary.
  source = source.replace(/\sopacity-(?:40|50|60|70|75|80)/g, '');
  return source;
}

function compactTables(source) {
  // Natural-width tables: columns fit their content instead of being stretched equally by table-fixed/w-full.
  source = replaceAll(source, 'min-w-[1040px] w-full table-fixed', 'min-w-[820px] w-max table-auto');
  source = replaceAll(source, 'min-w-[1120px] w-full table-fixed', 'min-w-[860px] w-max table-auto');
  source = replaceAll(source, 'min-w-[1420px] w-full table-fixed', 'min-w-[1020px] w-max table-auto');
  source = replaceAll(source, 'min-w-[1580px] w-full table-fixed', 'min-w-[1160px] w-max table-auto');

  // Retention tables patched by apply-clb-detail-table-style.js.
  source = replaceAll(
    source,
    'bg-white text-[11px] [&_th]:!border-[#d2e7dc] [&_th]:!px-2 [&_th]:!py-2 [&_td]:!border-[#d8e7df] [&_td]:!bg-transparent [&_td]:!px-2 [&_td]:!py-1.5 [&_td]:!text-[#183548]',
    'bg-white text-[10px] [&_th]:!whitespace-nowrap [&_th]:!border-[#b9d4c6] [&_th]:!px-1.5 [&_th]:!py-1.5 [&_td]:!whitespace-nowrap [&_td]:!border-[#c7ddd2] [&_td]:!bg-white [&_td]:!px-1.5 [&_td]:!py-1 [&_td]:!text-[#102a22]'
  );

  // Entry tables are already light/solid but still too roomy.
  source = replaceAll(source, 'bg-white text-[11px]', 'bg-white text-[10px]');
  source = replaceAll(source, 'border border-[#d2e7dc] px-2 py-2', 'border border-[#b9d4c6] px-1.5 py-1.5 whitespace-nowrap');
  source = replaceAll(source, 'border border-[#d8e7df] px-2 py-1.5', 'border border-[#c7ddd2] px-1.5 py-1 whitespace-nowrap');
  source = replaceAll(source, 'text-[#183548]', 'text-[#102a22]');
  source = replaceAll(source, 'text-[#48695a]', 'text-[#2f5948]');
  source = replaceAll(source, 'text-[#6b7f74]', 'text-[#4b6558]');
  source = replaceAll(source, 'text-[#6b8a79]', 'text-[#4f7462]');

  // Tighten only table result/value cells; do not touch section/page headings.
  source = replaceAll(source, 'px-2 py-0.5 text-[10px] font-black', 'px-1.5 py-0.5 text-[9px] font-black whitespace-nowrap');
  source = replaceAll(source, 'text-center text-lg font-black', 'text-center text-sm font-black');
  source = replaceAll(source, 'text-center text-base font-black', 'text-center text-sm font-black');
  source = replaceAll(source, 'className="mt-1 text-[10px]"', 'className="mt-0.5 text-[9px]"');
  return source;
}

function assertNoTransparencyOutsideButtons(source, file) {
  // The user explicitly allows translucency on buttons in the main interface.
  // Remove all button blocks before auditing the rest of each CLB source file.
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
    throw new Error(`[CLB solid audit] ${file} còn màu/độ trong suốt ngoài button:\n- ${violations.join('\n- ')}`);
  }
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

  // Solid detail modal shell and slightly tighter outer padding.
  source = replaceAll(source, 'bg-[#020706] p-3 sm:p-5', 'bg-[#020706] p-2 sm:p-3');

  assertNoTransparencyOutsideButtons(source, file);

  if (!source.includes(MARKER)) {
    source = `${source.trimEnd()}\n\n// ${MARKER}\n`;
  }

  fs.writeFileSync(file, source, 'utf8');
  console.log(`✓ CLB solid/compact v2 applied: ${file}`);
}

console.log('✓ CLB Sao Việt: màu đặc + bảng compact đã được áp dụng; chỉ button được phép giữ hiệu ứng alpha.');
