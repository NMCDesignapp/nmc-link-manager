const fs = require('fs');

const file = 'src/app/thi-dua-chau/page.tsx';
const original = fs.readFileSync(file, 'utf8');
const eol = original.includes('\r\n') ? '\r\n' : '\n';
let source = original.replace(/\r\n/g, '\n');
const marker = 'nmc-contest-combined-top-ranking-v3';

if (!source.includes(marker)) {
  const from = "            row.push(cIdx === 0 ? rewardNote : '');";
  const to = "            row.push(cIdx === 0 ? (getCombinedTopNote(`nyd:${n.nydCode}`) || rewardNote) : '');";
  if (!source.includes(from)) throw new Error('[combined-top-v3] Missing expanded NTD Excel note anchor');
  source = source.replace(from, to);
  source = source.replace("'use client';", `'use client';\n\n// ${marker}`);
  fs.writeFileSync(file, source.replace(/\n/g, eol), 'utf8');
  console.log('✓ combined TOP note added to expanded NTD Excel rows');
}
