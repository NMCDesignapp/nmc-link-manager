const fs = require('fs');

const MARKER = 'nmc-contest-combined-top-ranking-v1';

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function write(file, original, source) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(file, source.replace(/\n/g, eol), 'utf8');
}

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`[combined-top] Missing anchor: ${label}`);
  return source.replace(from, to);
}

function replaceAllExact(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`[combined-top] Missing anchor: ${label}`);
  return source.split(from).join(to);
}

function patchSchema() {
  const file = 'prisma/schema.prisma';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes('useTopRanking') && source.includes('topRewardAmounts')) return;
  const re = /(\n\s+topNValueType\s+String[^\n]*\n)/;
  if (!re.test(source)) throw new Error('[combined-top] Missing Contest.topNValueType in Prisma schema');
  source = source.replace(re, `$1  // ${MARKER}: additive TOP ranking attached to the primary IP/AFYP contest\n  useTopRanking     Boolean @default(false)\n  topRewardAmounts String  @default("[]")\n`);
  write(file, original, source);
  console.log('✓ combined TOP fields added to Prisma schema');
}

function patchContestApi() {
  const file = 'src/app/api/contests/route.ts';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(`// ${MARKER}`)) return;

  source = replaceOnce(
    source,
    '  topN: true, topNMinIP: true, topNValueType: true, filterByEffectiveDate: true,',
    '  topN: true, topNMinIP: true, topNValueType: true, useTopRanking: true, topRewardAmounts: true, filterByEffectiveDate: true,',
    'contest summary select',
  );

  const ensureAnchor = `async function ensureTopNValueTypeColumn(): Promise<void> {\n  try {\n    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topNValueType" TEXT NOT NULL DEFAULT \\'ip\\'');\n  } catch (e) {\n    console.warn('[ensureTopNValueTypeColumn] Skipped:', (e as Error)?.message);\n  }\n}\n`;
  const ensureBlock = `${ensureAnchor}\n// ${MARKER}\nasync function ensureCombinedTopRankingColumns(): Promise<void> {\n  try {\n    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "useTopRanking" BOOLEAN NOT NULL DEFAULT false');\n    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topRewardAmounts" TEXT NOT NULL DEFAULT \\'[]\\'');\n  } catch (e) {\n    console.warn('[ensureCombinedTopRankingColumns] Skipped:', (e as Error)?.message);\n  }\n}\n`;
  source = replaceOnce(source, ensureAnchor, ensureBlock, 'combined TOP self-heal function');

  source = replaceAllExact(
    source,
    'ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn()',
    'ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn(), ensureCombinedTopRankingColumns()',
    'contest self-heal calls',
  );

  source = replaceOnce(
    source,
    '      topN, topNMinIP, topNValueType, filterByEffectiveDate,',
    '      topN, topNMinIP, topNValueType, useTopRanking, topRewardAmounts, filterByEffectiveDate,',
    'POST combined TOP destructuring',
  );

  source = replaceOnce(
    source,
    "      topNValueType: topNValueType === 'afyp' ? 'afyp' : 'ip',\n      filterByEffectiveDate: filterByEffectiveDate ?? false,",
    "      topNValueType: topNValueType === 'afyp' ? 'afyp' : 'ip',\n      useTopRanking: useTopRanking ?? false,\n      topRewardAmounts: typeof topRewardAmounts === 'string' ? topRewardAmounts : JSON.stringify(topRewardAmounts || []),\n      filterByEffectiveDate: filterByEffectiveDate ?? false,",
    'POST combined TOP data',
  );

  write(file, original, source);
  console.log('✓ combined TOP persistence wired into /api/contests');
}

function patchCalculator() {
  const file = 'src/lib/contest-calculator.ts';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(`// ${MARKER}`)) return;

  source = replaceOnce(
    source,
    "  topNValueType?: 'ip' | 'afyp'; // Loại chỉ tiêu xét Top N: 'ip' (mặc định) hoặc 'afyp'\n  filterByEffectiveDate?: boolean;",
    "  topNValueType?: 'ip' | 'afyp'; // Loại chỉ tiêu xét Top N: 'ip' (mặc định) hoặc 'afyp'\n  // ${MARKER}: TOP bổ sung; thưởng TOP tách khỏi bonusTiers của điều kiện chính\n  useTopRanking?: boolean;\n  topRewardAmounts: number[];\n  filterByEffectiveDate?: boolean;",
    'ContestConfig combined TOP fields',
  );

  const participantsAnchor = `  let participants: string[] = [];\n  try {\n    const parsed = JSON.parse(raw.participants || '[]');\n    if (Array.isArray(parsed)) participants = parsed;\n  } catch { /* ignore */ }`;
  const participantsReplacement = `  let topRewardAmounts: number[] = [];\n  try {\n    const parsed = JSON.parse(raw.topRewardAmounts || '[]');\n    if (Array.isArray(parsed)) topRewardAmounts = parsed.map((value: unknown) => Math.max(0, Number(value) || 0));\n  } catch { /* ignore */ }\n\n${participantsAnchor}`;
  source = replaceOnce(source, participantsAnchor, participantsReplacement, 'parse topRewardAmounts');

  source = replaceOnce(
    source,
    "    topNValueType: raw.topNValueType === 'afyp' ? 'afyp' : 'ip',\n    filterByEffectiveDate: raw.filterByEffectiveDate ?? false,",
    "    topNValueType: raw.topNValueType === 'afyp' ? 'afyp' : 'ip',\n    useTopRanking: raw.useTopRanking ?? false,\n    topRewardAmounts,\n    filterByEffectiveDate: raw.filterByEffectiveDate ?? false,",
    'parse ContestConfig combined TOP values',
  );

  source = source.replace(
    '// ===== Labels =====',
    `// ${MARKER}\n// Additive TOP ranking is implemented in contest-combined-top-ranking.ts so the\n// live page, saved-result view and Excel export can share exactly one rule set.\n\n// ===== Labels =====`,
  );

  write(file, original, source);
  console.log('✓ contest calculator parses combined TOP configuration');
}

function patchMainPage() {
  const file = 'src/app/thi-dua-chau/page.tsx';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(`// ${MARKER}`)) return;

  source = replaceOnce(
    source,
    "import { expandActivityExportDetails } from '@/lib/contest-export-details';",
    "import { expandActivityExportDetails } from '@/lib/contest-export-details';\nimport { buildCombinedTopRanking, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';",
    'main page combined TOP import',
  );

  source = replaceOnce(
    source,
    "  topNValueType?: 'ip' | 'afyp';\n  filterByEffectiveDate?: boolean;",
    "  topNValueType?: 'ip' | 'afyp';\n  useTopRanking?: boolean;\n  topRewardAmounts?: string;\n  filterByEffectiveDate?: boolean;",
    'SavedContest combined TOP fields',
  );

  source = replaceOnce(
    source,
    "  const [topNValueType, setTopNValueType] = useState<'ip' | 'afyp'>('ip');\n  // Filter by effective date",
    "  const [topNValueType, setTopNValueType] = useState<'ip' | 'afyp'>('ip');\n  // ${MARKER}: TOP bổ sung chạy song song với điều kiện chính; tiền TOP chỉ ghi ở Ghi chú.\n  const [useTopRanking, setUseTopRanking] = useState(false);\n  const [topRewardAmounts, setTopRewardAmounts] = useState<number[]>([1_000_000, 500_000, 300_000]);\n  // Filter by effective date",
    'main page combined TOP state',
  );

  const tierFnsAnchor = `  const addBonusTier = () => setBonusTiers([...bonusTiers, { id: crypto.randomUUID(), minFYP: 0, maxFYP: null, bonusAmount: 0, bonusType: 'money', bonusText: '', bonusPercent: 0 }]);\n  const removeBonusTier = (id: string) => { setBonusTiers(bonusTiers.filter((t) => t.id !== id)); };`;
  const tierFnsReplacement = `${tierFnsAnchor}\n  const updateTopReward = useCallback((index: number, value: number) => {\n    setTopRewardAmounts(prev => {\n      const next = [...prev];\n      while (next.length <= index) next.push(0);\n      next[index] = Math.max(0, Number(value) || 0);\n      return next;\n    });\n  }, []);`;
  source = replaceOnce(source, tierFnsAnchor, tierFnsReplacement, 'top reward editor helper');

  source = replaceOnce(
    source,
    "        topN, topNMinIP, topNValueType,\n        filterByEffectiveDate,",
    "        topN, topNMinIP, topNValueType,\n        useTopRanking: supportsCombinedTopRanking(conditionType) ? useTopRanking : false,\n        topRewardAmounts: JSON.stringify(topRewardAmounts.slice(0, Math.max(0, topN))),\n        filterByEffectiveDate,",
    'save combined TOP config',
  );

  const loadAnchor = `    // Top N mode\n    setTopN(contest.topN ?? 3);\n    setTopNMinIP(contest.topNMinIP ?? 50_000_000);\n    setTopNValueType(contest.topNValueType === 'afyp' ? 'afyp' : 'ip');`;
  const loadReplacement = `${loadAnchor}\n    setUseTopRanking(contest.useTopRanking ?? false);\n    try {\n      const parsedTopRewards = JSON.parse(contest.topRewardAmounts || '[]');\n      setTopRewardAmounts(Array.isArray(parsedTopRewards) && parsedTopRewards.length > 0\n        ? parsedTopRewards.map((value: unknown) => Math.max(0, Number(value) || 0))\n        : [1_000_000, 500_000, 300_000]);\n    } catch {\n      setTopRewardAmounts([1_000_000, 500_000, 300_000]);\n    }`;
  source = replaceOnce(source, loadAnchor, loadReplacement, 'load combined TOP config');

  // Insert a single derived ranking map after the common metric helpers. This map is
  // used by on-screen results and Excel so the rank cannot drift between outputs.
  const groupValueAnchor = `  const getGroupValue = useCallback((g: GroupData): number => {\n    if (conditionType === 'total_afyp' || conditionType === 'per_contract_afyp') return g.totalAFYP;\n    return g.totalFYP;\n  }, [conditionType]);`;
  const rankingBlock = `${groupValueAnchor}\n\n  const combinedTopRankByKey = useMemo(() => {\n    if (!useTopRanking || !supportsCombinedTopRanking(conditionType)) return new Map();\n\n    const passesSecondaryTotals = (rows: Contract[]) => {\n      if (!useSecondaryCondition) return true;\n      const totalAFYP = rows.reduce((sum, row) => sum + row.afyp, 0);\n      const totalIP = rows.reduce((sum, row) => sum + row.pdt10DT, 0);\n      if (secondaryTotalAFYPMin > 0 && totalAFYP < secondaryTotalAFYPMin) return false;\n      if (secondaryTotalIPMin > 0 && totalIP < secondaryTotalIPMin) return false;\n      return true;\n    };\n\n    const candidates: { key: string; value: number; qualified: boolean }[] = [];\n    if (targetType === 'tvv' && isPerContractMode(conditionType)) {\n      for (const contract of perContractDisplayContracts) {\n        const value = getContractValue(contract);\n        const tier = calculateBonus(value).tier;\n        const agentContracts = displayContracts.filter(row => row.agentCode === contract.agentCode);\n        candidates.push({\n          key: \`contract:\${contract.id}\`,\n          value,\n          qualified: Boolean(tier) && passesSecondaryTotals(agentContracts),\n        });\n      }\n    } else if (targetType === 'tvv') {\n      for (const row of tvvTotalRows) {\n        const agentContracts = displayContracts.filter(contract => contract.agentCode === row.agent.agentCode);\n        candidates.push({\n          key: \`tvv:\${row.agent.agentCode}\`,\n          value: row.value,\n          qualified: Boolean(row.tier) && passesSecondaryTotals(agentContracts),\n        });\n      }\n    } else if (targetType === 'nhom') {\n      for (const group of groupedData) {\n        const value = getGroupValue(group);\n        const tier = calculateBonus(value).tier;\n        candidates.push({\n          key: \`nhom:\${group.maNhom}\`,\n          value,\n          qualified: Boolean(tier) && passesSecondaryTotals(group.contracts || []),\n        });\n      }\n    } else if (targetType === 'nyd') {\n      for (const person of nydData) {\n        const value = getNYDContestValue(\n          conditionType,\n          person.recruitFYP,\n          person.ownFYP,\n          person.ownActivityRounds,\n          includeIndividualNTD,\n        );\n        const tier = calculateBonus(value).tier;\n        const personContracts = (person.contracts || displayContracts).filter(contract => (\n          (contract.maDaiLyTD === person.nydCode && contract.agentCode !== person.nydCode)\n          || (includeIndividualNTD && contract.agentCode === person.nydCode)\n        ));\n        candidates.push({\n          key: \`nyd:\${person.nydCode}\`,\n          value,\n          qualified: Boolean(tier) && passesSecondaryTotals(personContracts),\n        });\n      }\n    }\n\n    return buildCombinedTopRanking(candidates, topN, topRewardAmounts);\n  }, [\n    useTopRanking, conditionType, targetType, perContractDisplayContracts, tvvTotalRows, groupedData, nydData,\n    displayContracts, getContractValue, getGroupValue, calculateBonus, includeIndividualNTD, topN, topRewardAmounts,\n    useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin,\n  ]);\n\n  const getCombinedTopNote = useCallback((key: string) => combinedTopRankByKey.get(key)?.note || '', [combinedTopRankByKey]);`;
  source = replaceOnce(source, groupValueAnchor, rankingBlock, 'combined TOP ranking map');

  // Result: for TVV total, TOP note overrides only the Ghi chú cell; primary Thưởng stays untouched.
  const totalNoteAnchor = `            } else {\n              // Non-Top N: giữ nguyên logic cột Ghi chú\n              noteLabel = !effectiveTier && row.remaining !== null\n                ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : \`Cần thêm \${formatNumber(row.remaining)}\`}</span>\n                : !effectiveTier\n                  ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>\n                  : null;\n            }`;
  if (source.includes(totalNoteAnchor)) {
    source = source.replace(totalNoteAnchor, `${totalNoteAnchor}\n            const combinedTopNote = getCombinedTopNote(\`tvv:\${row.agent.agentCode}\`);\n            if (combinedTopNote) {\n              noteLabel = <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{combinedTopNote}</span>;\n            }`);
  }

  // Excel: TVV total result note.
  source = replaceOnce(
    source,
    "            row.push(effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức'));",
    "            row.push(getCombinedTopNote(`tvv:${agent.agentCode}`) || (effectiveTier ? '' : (tier ? 'Chưa đạt ĐKB' : 'Chưa đạt mức')));",
    'TVV total Excel combined TOP note',
  );

  // Excel: NTD reward note is already calculated once per NTD; TOP note should win when present.
  source = replaceAllExact(
    source,
    "rewardNote,\n            );",
    "getCombinedTopNote(`nyd:${n.nydCode}`) || rewardNote,\n            );",
    'NTD Excel combined TOP note',
  );

  // Insert combined TOP config immediately after the primary reward editor.
  const bonusEditorAnchor = `              <BonusTierEditor\n                tiers={bonusTiers}\n                conditionType={conditionType}\n                onUpdate={updateBonusTier}\n                onAdd={addBonusTier}\n                onRemove={removeBonusTier}\n              />`;
  const topConfig = `${bonusEditorAnchor}\n\n              {supportsCombinedTopRanking(conditionType) && !isTopNMode(conditionType) && (\n                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 space-y-3">\n                  <div className="flex items-center justify-between gap-3">\n                    <div className="min-w-0">\n                      <Label className="text-xs font-bold text-rose-300">Kết hợp xét TOP</Label>\n                      <p className="text-[10px] text-rose-200/70 mt-0.5">Chỉ xếp TOP trong số đối tượng đã đạt điều kiện chính; xếp theo đúng {conditionType.includes('afyp') ? 'AFYP' : 'IP'} của bảng này.</p>\n                    </div>\n                    <Checkbox checked={useTopRanking} onCheckedChange={(checked) => setUseTopRanking(Boolean(checked))} className="border-rose-400 data-[state=checked]:bg-rose-500" />\n                  </div>\n                  {useTopRanking && (\n                    <>\n                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">\n                        <div className="space-y-1">\n                          <Label className="text-[10px] text-rose-200">Số hạng xét TOP</Label>\n                          <Input type="number" min={1} max={50} value={topN || ''} onChange={(e) => setTopN(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))} className="h-7 text-xs border-rose-500/30 bg-gray-900 text-white" />\n                        </div>\n                        <div className="rounded-lg border border-rose-500/20 bg-black/10 px-2 py-1.5 text-[10px] text-rose-100/80 flex items-center">Thưởng TOP chỉ hiện trong cột Ghi chú; cột Thưởng vẫn là thưởng điều kiện chính.</div>\n                      </div>\n                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">\n                        {Array.from({ length: Math.max(1, topN) }, (_, index) => (\n                          <div key={index} className="rounded-lg border border-rose-500/20 bg-gray-900/70 p-2">\n                            <Label className="text-[10px] font-bold text-rose-300">{index === 0 ? 'Quán quân' : index === 1 ? 'Á quân' : `TOP ${index + 1}`}</Label>\n                            <div className="relative mt-1">\n                              <Input type="number" min={0} inputMode="numeric" value={topRewardAmounts[index] ?? 0} onChange={(e) => updateTopReward(index, Number(e.target.value) || 0)} className="h-7 pr-7 text-xs border-rose-500/30 bg-gray-950 text-white" />\n                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-rose-300">đ</span>\n                            </div>\n                          </div>\n                        ))}\n                      </div>\n                    </>\n                  )}\n                </div>\n              )}`;
  source = replaceOnce(source, bonusEditorAnchor, topConfig, 'combined TOP config panel');

  source = source.replace("'use client';", `'use client';\n\n// ${MARKER}`);
  write(file, original, source);
  console.log('✓ combined TOP wired into main Thi đua page');
}

function patchSavedContestInline() {
  const file = 'src/components/saved-contest-inline.tsx';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(`// ${MARKER}`)) return;

  source = replaceOnce(
    source,
    "import { useAppData } from '@/lib/app-data-context';",
    "import { useAppData } from '@/lib/app-data-context';\nimport { buildCombinedTopRanking, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';",
    'saved result combined TOP import',
  );

  const nydRowsAnchor = `  const nydResultRows = useMemo(\n    () => computeNYDResultRows(nydData, config),\n    [nydData, config]\n  );`;
  const rankingBlock = `${nydRowsAnchor}\n\n  const combinedTopRankByKey = useMemo(() => {\n    if (!config.useTopRanking || !supportsCombinedTopRanking(config.conditionType)) return new Map();\n    const passesSecondaryTotals = (rows: Contract[]) => {\n      if (!config.useSecondaryCondition) return true;\n      const totalAFYP = rows.reduce((sum, row) => sum + row.afyp, 0);\n      const totalIP = rows.reduce((sum, row) => sum + row.pdt10DT, 0);\n      if ((config.secondaryTotalAFYPMin ?? 0) > 0 && totalAFYP < (config.secondaryTotalAFYPMin ?? 0)) return false;\n      if ((config.secondaryTotalIPMin ?? 0) > 0 && totalIP < (config.secondaryTotalIPMin ?? 0)) return false;\n      return true;\n    };\n    const candidates: { key: string; value: number; qualified: boolean }[] = [];\n    if (config.targetType === 'tvv' && isPerContractMode(config.conditionType)) {\n      for (const row of tvvPerContractRows) {\n        const agentRows = displayContracts.filter(contract => contract.agentCode === row.contract.agentCode);\n        candidates.push({ key: \`contract:\${row.contract.id}\`, value: row.cValue, qualified: Boolean(row.tier) && passesSecondaryTotals(agentRows) });\n      }\n    } else if (config.targetType === 'tvv') {\n      for (const row of tvvTotalRows) {\n        const agentRows = displayContracts.filter(contract => contract.agentCode === row.agent.agentCode);\n        candidates.push({ key: \`tvv:\${row.agent.agentCode}\`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(agentRows) });\n      }\n    } else if (config.targetType === 'nhom') {\n      for (const group of groupedData) {\n        const value = config.conditionType === 'total_afyp' || config.conditionType === 'per_contract_afyp' ? group.totalAFYP : group.totalFYP;\n        const tier = calculateBonusWithTiers(value, config.bonusTiers).tier;\n        candidates.push({ key: \`nhom:\${group.maNhom}\`, value, qualified: Boolean(tier) && passesSecondaryTotals(group.contracts || []) });\n      }\n    } else if (config.targetType === 'nyd') {\n      for (const row of nydResultRows) {\n        const personRows = (row.nyd.contracts || displayContracts).filter(contract => (contract.maDaiLyTD === row.nyd.nydCode && contract.agentCode !== row.nyd.nydCode) || ((config.includeIndividualNTD ?? false) && contract.agentCode === row.nyd.nydCode));\n        candidates.push({ key: \`nyd:\${row.nyd.nydCode}\`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(personRows) });\n      }\n    }\n    return buildCombinedTopRanking(candidates, config.topN ?? 3, config.topRewardAmounts || []);\n  }, [config, displayContracts, groupedData, tvvTotalRows, tvvPerContractRows, nydResultRows]);\n\n  const getCombinedTopNote = (key: string) => combinedTopRankByKey.get(key)?.note || '';`;
  source = replaceOnce(source, nydRowsAnchor, rankingBlock, 'saved result combined TOP ranking map');

  const savedTotalNoteAnchor = `            } else {\n              // Non-Top N: giữ nguyên logic cột Ghi chú\n              noteLabel = !effectiveTier && row.remaining !== null\n                ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : \`Cần thêm \${formatNumber(row.remaining)}\`}</span>\n                : !effectiveTier\n                  ? <span className="text-[10px] italic text-gray-400">{!secondaryPassed && row.tier ? 'Chưa đạt ĐKB' : 'Chưa đạt'}</span>\n                  : null;\n            }`;
  source = replaceOnce(source, savedTotalNoteAnchor, `${savedTotalNoteAnchor}\n            const combinedTopNote = getCombinedTopNote(\`tvv:\${row.agent.agentCode}\`);\n            if (combinedTopNote) noteLabel = <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{combinedTopNote}</span>;`, 'saved TVV total TOP note');

  // Per-contract result Ghi chú: if this contract ranks, display the TOP prize instead of the ordinary empty note.
  const perContractNoteAnchor = `              <TableCell className="whitespace-nowrap">\n                {!row.effectiveTier && row.remaining !== null ? (`;
  source = replaceOnce(source, perContractNoteAnchor, `              <TableCell className="whitespace-nowrap">\n                {getCombinedTopNote(\`contract:\${row.contract.id}\`) ? (\n                  <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-sm"><Crown className="w-4 h-4" />{getCombinedTopNote(\`contract:\${row.contract.id}\`)}</span>\n                ) : !row.effectiveTier && row.remaining !== null ? (`, 'saved per-contract TOP note');

  source = source.replace("'use client';", `'use client';\n\n// ${MARKER}`);
  write(file, original, source);
  console.log('✓ combined TOP wired into saved contest result view');
}

patchSchema();
if (process.argv.includes('--schema-only')) process.exit(0);
patchContestApi();
patchCalculator();
patchMainPage();
patchSavedContestInline();
