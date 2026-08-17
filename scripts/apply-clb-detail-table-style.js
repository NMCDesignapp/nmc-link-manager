const fs = require('fs');

const TARGETS = [
  'src/components/clb-sao-viet-retention-tvv.tsx',
  'src/components/clb-sao-viet-retention-tn.tsx',
  'src/components/clb-sao-viet-retention-ttn.tsx',
];

const MARKER = 'nmc-clb-detail-solid-v1';

function replaceAll(source, from, to) {
  return source.split(from).join(to);
}

for (const file of TARGETS) {
  let source = fs.readFileSync(file, 'utf8');
  if (source.includes(MARKER)) {
    console.log(`✓ CLB detail style already applied: ${file}`);
    continue;
  }

  source = replaceAll(
    source,
    'h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-sm font-semibold text-white outline-none transition focus:border-amber-400/60',
    'h-8 rounded-md border border-[#83c9a8] bg-white px-2.5 text-[11px] font-semibold text-[#183548] outline-none transition focus:border-[#239a69]'
  );

  source = replaceAll(source, 'fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4', 'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 sm:p-5');
  source = replaceAll(source, 'fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4', 'fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3 sm:p-5');
  source = replaceAll(source, 'fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4', 'fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 sm:p-5');
  source = replaceAll(source, 'flex h-[94vh] w-full max-w-[1700px] flex-col overflow-hidden border border-amber-300/25 bg-[#08110e] shadow-2xl', `flex h-[82vh] w-[min(96vw,1380px)] flex-col overflow-hidden border border-[#c9dfd4] bg-[#f6fbf8] shadow-[0_18px_48px_rgba(0,0,0,0.48)] ${MARKER}`);
  source = replaceAll(source, 'flex h-[95vh] w-full max-w-[1900px] flex-col overflow-hidden border border-amber-300/25 bg-[#08110e] shadow-2xl', `flex h-[82vh] w-[min(96vw,1380px)] flex-col overflow-hidden border border-[#c9dfd4] bg-[#f6fbf8] shadow-[0_18px_48px_rgba(0,0,0,0.48)] ${MARKER}`);

  source = replaceAll(
    source,
    'flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
    'flex flex-col gap-2 border-b border-[#c9dfd4] bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between'
  );
  source = replaceAll(source, '<h3 className="font-black text-amber-100">', '<h3 className="text-sm font-black text-[#174c37]">');
  source = replaceAll(source, 'mt-1 text-xs text-white/45', 'mt-0.5 text-[10px] text-[#6b7f74]');
  source = replaceAll(source, 'text-white/35" /><input', 'text-[#6b8a79]" /><input');
  source = replaceAll(
    source,
    'h-10 w-full rounded-lg border border-white/10 bg-black/25 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-amber-300/40 sm:w-[270px]',
    'h-8 w-full rounded-md border border-[#83c9a8] bg-white pl-8 pr-2.5 text-[11px] text-[#183548] outline-none placeholder:text-[#8aa092] focus:border-[#239a69] sm:w-[240px]'
  );
  source = replaceAll(source, 'className="bg-[#111915]"', 'className="bg-white text-[#183548]"');
  source = replaceAll(
    source,
    'inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-100',
    'inline-flex h-8 items-center gap-1.5 rounded-md border border-[#1b7f59] bg-[#239a69] px-2.5 text-[10px] font-bold text-white hover:bg-[#1d875d]'
  );
  source = replaceAll(
    source,
    'flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/65',
    'flex h-8 w-8 items-center justify-center rounded-md border border-[#b9d4c6] bg-white text-[#48695a] hover:bg-[#eef7f2]'
  );

  source = replaceAll(source, 'className="flex-1 overflow-auto"', 'className="flex-1 overflow-auto bg-white"');
  source = replaceAll(
    source,
    'min-w-[1180px] w-full border-collapse text-sm',
    'min-w-[1040px] w-full table-fixed border-separate border-spacing-0 bg-white text-[11px] [&_th]:!border-[#d2e7dc] [&_th]:!px-2 [&_th]:!py-2 [&_td]:!border-[#d8e7df] [&_td]:!bg-transparent [&_td]:!px-2 [&_td]:!py-1.5 [&_td]:!text-[#183548]'
  );
  source = replaceAll(
    source,
    'min-w-[1780px] w-full border-collapse text-sm',
    'min-w-[1580px] w-full table-fixed border-separate border-spacing-0 bg-white text-[11px] [&_th]:!border-[#d2e7dc] [&_th]:!px-2 [&_th]:!py-2 [&_td]:!border-[#d8e7df] [&_td]:!bg-transparent [&_td]:!px-2 [&_td]:!py-1.5 [&_td]:!text-[#183548]'
  );
  source = replaceAll(
    source,
    'min-w-[1650px] w-full border-collapse text-sm',
    'min-w-[1420px] w-full table-fixed border-separate border-spacing-0 bg-white text-[11px] [&_th]:!border-[#d2e7dc] [&_th]:!px-2 [&_th]:!py-2 [&_td]:!border-[#d8e7df] [&_td]:!bg-transparent [&_td]:!px-2 [&_td]:!py-1.5 [&_td]:!text-[#183548]'
  );
  source = replaceAll(source, 'sticky top-0 z-20 bg-[#6f4b08] text-[11px] uppercase tracking-wide text-white shadow-md', 'sticky top-0 z-20 bg-[#239a69] text-[9px] uppercase tracking-[0.04em] text-white shadow-none');
  source = replaceAll(source, 'sticky top-0 z-20 bg-[#6f4b08] text-[10px] uppercase tracking-wide text-white shadow-md', 'sticky top-0 z-20 bg-[#239a69] text-[9px] uppercase tracking-[0.04em] text-white shadow-none');
  source = replaceAll(source, 'odd:bg-white/[0.018] even:bg-white/[0.04] hover:bg-amber-300/[0.05]', 'odd:bg-white even:bg-[#f4faf6] hover:bg-[#e6f6eb]');

  source = replaceAll(source, 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200', 'border-[#96d0ae] bg-[#e6f6eb] text-[#137333]');
  source = replaceAll(source, 'border-rose-400/30 bg-rose-400/10 text-rose-200', 'border-[#efb7b2] bg-[#fce8e6] text-[#b3261e]');
  source = replaceAll(source, 'rounded-full border px-2.5 py-1 text-xs font-black', 'rounded-md border px-2 py-0.5 text-[10px] font-black');

  source = replaceAll(source, 'flex h-40 items-center justify-center text-sm text-white/35', 'flex h-32 items-center justify-center bg-white text-[11px] text-[#6b7f74]');
  source = replaceAll(
    source,
    'flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-4 py-2.5 text-xs text-white/45',
    'flex flex-wrap items-center justify-between gap-2 border-t border-[#c9dfd4] bg-[#eef7f2] px-3 py-2 text-[10px] text-[#48695a] [&_strong]:!text-[#176b4a]'
  );

  fs.writeFileSync(file, source, 'utf8');
  console.log(`✓ CLB detail popup solid/tamthu style applied: ${file}`);
}
