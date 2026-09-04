const fs = require('fs');

const MARKER = 'nmc-contest-combined-top-ranking-v2';

function patchFile(file, mutate) {
  const original = fs.readFileSync(file, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(MARKER)) return;
  source = mutate(source);
  source = source.replace("'use client';", `'use client';\n\n// ${MARKER}`);
  fs.writeFileSync(file, source.replace(/\n/g, eol), 'utf8');
}

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`[combined-top-v2] Missing anchor: ${label}`);
  return source.replace(from, to);
}

patchFile('src/app/thi-dua-chau/page.tsx', (source) => {
  // Live NTD result: primary reward remains in Thưởng; TOP prize is Ghi chú only.
  source = replaceOnce(
    source,
    `<TableCell className="whitespace-nowrap">{!tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>`,
    `<TableCell className="whitespace-nowrap">{getCombinedTopNote(\`nyd:\${nyd.nydCode}\`) ? <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(\`nyd:\${nyd.nydCode}\`)}</span> : !tier ? <span className="text-[10px] italic text-gray-400">Chưa đạt</span> : null}</TableCell>`,
    'live NTD note',
  );

  // Live group result.
  source = replaceOnce(
    source,
    `<TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : \`Cần thêm \${isActivityRoundMode(conditionType) ? \`\${remaining} lượt\` : formatNumber(remaining)}\`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>`,
    `<TableCell className="whitespace-nowrap">{getCombinedTopNote(\`nhom:\${group.maNhom}\`) ? <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(\`nhom:\${group.maNhom}\`)}</span> : !effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : \`Cần thêm \${isActivityRoundMode(conditionType) ? \`\${remaining} lượt\` : formatNumber(remaining)}\`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>`,
    'live group note',
  );

  // Live per-contract result.
  source = replaceOnce(
    source,
    `<TableCell className="whitespace-nowrap">{!effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : \`Cần thêm \${formatNumber(remaining)}\`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>`,
    `<TableCell className="whitespace-nowrap">{getCombinedTopNote(\`contract:\${contract.id}\`) ? <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(\`contract:\${contract.id}\`)}</span> : !effectiveTier && remaining !== null ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : \`Cần thêm \${formatNumber(remaining)}\`}</span> : !effectiveTier ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span> : null}</TableCell>`,
    'live per-contract note',
  );

  // Excel group, no contracts, phase 2.
  source = replaceOnce(
    source,
    `                groupPhaseRewardNote,\n              );`,
    `                getCombinedTopNote(\`nhom:\${g.maNhom}\`) || groupPhaseRewardNote,\n              );`,
    'group Excel phase note without contracts',
  );

  // Excel group, with contracts, phase 2.
  source = replaceOnce(
    source,
    `                  cIdx === 0 ? groupPhaseRewardNote : '',`,
    `                  cIdx === 0 ? (getCombinedTopNote(\`nhom:\${g.maNhom}\`) || groupPhaseRewardNote) : '',`,
    'group Excel phase note with contracts',
  );

  // Excel group, no contracts, ordinary phase.
  source = replaceOnce(
    source,
    `              row.push(effectiveTier ? formatBonusAmount(effectiveTier, groupMetricValue, g.activityRounds) : '', effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));`,
    `              row.push(effectiveTier ? formatBonusAmount(effectiveTier, groupMetricValue, g.activityRounds) : '', getCombinedTopNote(\`nhom:\${g.maNhom}\`) || (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')));`,
    'group Excel note without contracts',
  );

  // Excel group, with contracts, ordinary phase.
  source = replaceOnce(
    source,
    `                row.push(cIdx === 0 ? (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')) : '');`,
    `                row.push(cIdx === 0 ? (getCombinedTopNote(\`nhom:\${g.maNhom}\`) || (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'))) : '');`,
    'group Excel note with contracts',
  );

  // Excel per-contract phase 2.
  source = replaceOnce(
    source,
    `              phaseRewardNote,\n            );\n            return base;`,
    `              getCombinedTopNote(\`contract:\${c.id}\`) || phaseRewardNote,\n            );\n            return base;`,
    'per-contract Excel phase note',
  );

  // Excel per-contract ordinary.
  source = replaceOnce(
    source,
    `            base.push(effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));`,
    `            base.push(getCombinedTopNote(\`contract:\${c.id}\`) || (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')));`,
    'per-contract Excel note',
  );

  // Excel TVV total phase 2.
  source = replaceOnce(
    source,
    `              phaseRewardNote,\n            );\n            return row;`,
    `              getCombinedTopNote(\`tvv:\${agent.agentCode}\`) || phaseRewardNote,\n            );\n            return row;`,
    'TVV total Excel phase note',
  );

  return source;
});

patchFile('src/components/saved-contest-inline.tsx', (source) => {
  // Saved group result.
  source = replaceOnce(
    source,
    `              <TableCell className="whitespace-nowrap">\n                {!row.effectiveTier ? (\n                  <span className="text-[10px] italic text-gray-400">{!row.secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>\n                ) : null}\n              </TableCell>`,
    `              <TableCell className="whitespace-nowrap">\n                {getCombinedTopNote(\`nhom:\${row.g.maNhom}\`) ? (\n                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(\`nhom:\${row.g.maNhom}\`)}</span>\n                ) : !row.effectiveTier ? (\n                  <span className="text-[10px] italic text-gray-400">{!row.secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>\n                ) : null}\n              </TableCell>`,
    'saved group note',
  );

  // Saved NTD result.
  source = replaceOnce(
    source,
    `              <TableCell className="text-left px-3 whitespace-nowrap">\n                {!row.tier && row.remaining !== null ? (`,
    `              <TableCell className="text-left px-3 whitespace-nowrap">\n                {getCombinedTopNote(\`nyd:\${row.nyd.nydCode}\`) ? (\n                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(\`nyd:\${row.nyd.nydCode}\`)}</span>\n                ) : !row.tier && row.remaining !== null ? (`,
    'saved NTD note',
  );

  return source;
});

console.log('✓ combined TOP notes synchronized for live, saved and Excel outputs');
