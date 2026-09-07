const fs = require('fs');

const MARKER = 'nmc-contest-top-eligibility-v1';

function write(file, original, source) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(file, source.replace(/\n/g, eol), 'utf8');
}

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`[top-eligibility] Missing anchor: ${label}`);
  return source.replace(from, to);
}

function patchCalculator() {
  const file = 'src/lib/contest-calculator.ts';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(MARKER)) return;

  source = replaceOnce(
    source,
    "  useTopRanking?: boolean;\n  topRewardAmounts: number[];\n  filterByEffectiveDate?: boolean;",
    "  useTopRanking?: boolean;\n  topRewardAmounts: number[];\n  // ${MARKER}: điều kiện đủ riêng trước khi đưa đối tượng vào pool xét TOP\n  topEligibilityType?: 'none' | 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp';\n  topEligibilityMin?: number;\n  filterByEffectiveDate?: boolean;",
    'ContestConfig eligibility fields',
  );

  const parserAnchor = `  let topRewardAmounts: number[] = [];\n  try {\n    const parsed = JSON.parse(raw.topRewardAmounts || '[]');\n    if (Array.isArray(parsed)) topRewardAmounts = parsed.map((value: unknown) => Math.max(0, Number(value) || 0));\n  } catch { /* ignore */ }`;
  const parserReplacement = `  let topRewardAmounts: number[] = [];\n  let topEligibilityType: 'none' | 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp' = 'none';\n  let topEligibilityMin = 0;\n  try {\n    const parsed = JSON.parse(raw.topRewardAmounts || '[]');\n    if (Array.isArray(parsed)) {\n      // Dữ liệu cũ: chỉ có mảng thưởng TOP, không có điều kiện đủ.\n      topRewardAmounts = parsed.map((value: unknown) => Math.max(0, Number(value) || 0));\n    } else if (parsed && typeof parsed === 'object') {\n      const rewards = Array.isArray(parsed.rewards) ? parsed.rewards : [];\n      topRewardAmounts = rewards.map((value: unknown) => Math.max(0, Number(value) || 0));\n      const rawType = parsed.eligibilityType;\n      if (rawType === 'per_contract_ip' || rawType === 'per_contract_afyp' || rawType === 'total_ip' || rawType === 'total_afyp') {\n        topEligibilityType = rawType;\n      }\n      topEligibilityMin = Math.max(0, Number(parsed.eligibilityMin) || 0);\n    }\n  } catch { /* ignore */ }`;
  source = replaceOnce(source, parserAnchor, parserReplacement, 'combined TOP config parser');

  source = replaceOnce(
    source,
    "    useTopRanking: raw.useTopRanking ?? false,\n    topRewardAmounts,\n    filterByEffectiveDate: raw.filterByEffectiveDate ?? false,",
    "    useTopRanking: raw.useTopRanking ?? false,\n    topRewardAmounts,\n    topEligibilityType,\n    topEligibilityMin,\n    filterByEffectiveDate: raw.filterByEffectiveDate ?? false,",
    'ContestConfig eligibility values',
  );

  write(file, original, source);
  console.log('✓ combined TOP eligibility parsed by contest calculator');
}

function patchMainPage() {
  const file = 'src/app/thi-dua-chau/page.tsx';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(MARKER)) return;

  source = replaceOnce(
    source,
    "import { buildCombinedTopRanking, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';",
    "import { buildCombinedTopRanking, passesCombinedTopEligibility, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';",
    'main page eligibility helper import',
  );

  source = replaceOnce(
    source,
    "  const [useTopRanking, setUseTopRanking] = useState(false);\n  const [topRewardAmounts, setTopRewardAmounts] = useState<number[]>([1_000_000, 500_000, 300_000]);\n  // Filter by effective date",
    "  const [useTopRanking, setUseTopRanking] = useState(false);\n  const [topRewardAmounts, setTopRewardAmounts] = useState<number[]>([1_000_000, 500_000, 300_000]);\n  const [topEligibilityType, setTopEligibilityType] = useState<'none' | 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp'>('none');\n  const [topEligibilityMin, setTopEligibilityMin] = useState(0);\n  // Filter by effective date",
    'main page eligibility state',
  );

  source = replaceOnce(
    source,
    "        topRewardAmounts: JSON.stringify(topRewardAmounts.slice(0, Math.max(0, topN))),",
    "        topRewardAmounts: JSON.stringify({\n          rewards: topRewardAmounts.slice(0, Math.max(0, topN)),\n          eligibilityType: topEligibilityType,\n          eligibilityMin: Math.max(0, Number(topEligibilityMin) || 0),\n        }),",
    'save eligibility inside combined TOP config',
  );

  const loadAnchor = `    setUseTopRanking(contest.useTopRanking ?? false);\n    try {\n      const parsedTopRewards = JSON.parse(contest.topRewardAmounts || '[]');\n      setTopRewardAmounts(Array.isArray(parsedTopRewards) && parsedTopRewards.length > 0\n        ? parsedTopRewards.map((value: unknown) => Math.max(0, Number(value) || 0))\n        : [1_000_000, 500_000, 300_000]);\n    } catch {\n      setTopRewardAmounts([1_000_000, 500_000, 300_000]);\n    }`;
  const loadReplacement = `    setUseTopRanking(contest.useTopRanking ?? false);\n    try {\n      const parsedTopRewards = JSON.parse(contest.topRewardAmounts || '[]');\n      const rewards = Array.isArray(parsedTopRewards)\n        ? parsedTopRewards\n        : (Array.isArray(parsedTopRewards?.rewards) ? parsedTopRewards.rewards : []);\n      setTopRewardAmounts(rewards.length > 0\n        ? rewards.map((value: unknown) => Math.max(0, Number(value) || 0))\n        : [1_000_000, 500_000, 300_000]);\n      const rawEligibilityType = Array.isArray(parsedTopRewards) ? 'none' : parsedTopRewards?.eligibilityType;\n      setTopEligibilityType(rawEligibilityType === 'per_contract_ip' || rawEligibilityType === 'per_contract_afyp' || rawEligibilityType === 'total_ip' || rawEligibilityType === 'total_afyp'\n        ? rawEligibilityType\n        : 'none');\n      setTopEligibilityMin(Array.isArray(parsedTopRewards) ? 0 : Math.max(0, Number(parsedTopRewards?.eligibilityMin) || 0));\n    } catch {\n      setTopRewardAmounts([1_000_000, 500_000, 300_000]);\n      setTopEligibilityType('none');\n      setTopEligibilityMin(0);\n    }`;
  source = replaceOnce(source, loadAnchor, loadReplacement, 'load combined TOP eligibility');

  const candidatesAnchor = `      return true;\n    };\n\n    const candidates: { key: string; value: number; qualified: boolean }[] = [];`;
  const candidatesReplacement = `      return true;\n    };\n\n    const passesTopEligibility = (rows: Contract[], focusContract?: Contract) =>\n      passesCombinedTopEligibility(topEligibilityType, topEligibilityMin, rows, focusContract);\n\n    const candidates: { key: string; value: number; qualified: boolean }[] = [];`;
  source = replaceOnce(source, candidatesAnchor, candidatesReplacement, 'main ranking eligibility helper');

  source = replaceOnce(
    source,
    "        candidates.push({ key: `contract:${contract.id}`, value, qualified: Boolean(tier) && passesSecondaryTotals(agentContracts) });",
    "        candidates.push({ key: `contract:${contract.id}`, value, qualified: Boolean(tier) && passesSecondaryTotals(agentContracts) && passesTopEligibility(agentContracts, contract) });",
    'main per-contract eligibility',
  );
  source = replaceOnce(
    source,
    "        candidates.push({ key: `tvv:${row.agent.agentCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(agentContracts) });",
    "        candidates.push({ key: `tvv:${row.agent.agentCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(agentContracts) && passesTopEligibility(agentContracts) });",
    'main TVV total eligibility',
  );
  source = replaceOnce(
    source,
    "        candidates.push({ key: `nhom:${group.maNhom}`, value, qualified: Boolean(tier) && passesSecondaryTotals(group.contracts || []) });",
    "        candidates.push({ key: `nhom:${group.maNhom}`, value, qualified: Boolean(tier) && passesSecondaryTotals(group.contracts || []) && passesTopEligibility(group.contracts || []) });",
    'main group eligibility',
  );
  source = replaceOnce(
    source,
    "        candidates.push({ key: `nyd:${person.nydCode}`, value, qualified: Boolean(tier) && passesSecondaryTotals(personContracts) });",
    "        candidates.push({ key: `nyd:${person.nydCode}`, value, qualified: Boolean(tier) && passesSecondaryTotals(personContracts) && passesTopEligibility(personContracts) });",
    'main NTD eligibility',
  );

  source = replaceOnce(
    source,
    "    useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin,\n  ]);",
    "    useSecondaryCondition, secondaryTotalAFYPMin, secondaryTotalIPMin, topEligibilityType, topEligibilityMin,\n  ]);",
    'main eligibility dependencies',
  );

  const uiAnchor = `                        <div className="rounded-lg border border-rose-500/20 bg-black/10 px-2 py-1.5 text-[10px] text-rose-100/80 flex items-center">Thưởng TOP chỉ hiện trong cột Ghi chú; cột Thưởng vẫn là thưởng điều kiện chính.</div>\n                      </div>\n                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">`;
  const uiReplacement = `                        <div className="rounded-lg border border-rose-500/20 bg-black/10 px-2 py-1.5 text-[10px] text-rose-100/80 flex items-center">Thưởng TOP chỉ hiện trong cột Ghi chú; cột Thưởng vẫn là thưởng điều kiện chính.</div>\n                      </div>\n                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-amber-400/25 bg-amber-950/10 p-2">\n                        <div className="space-y-1">\n                          <Label className="text-[10px] font-bold text-amber-200">Điều kiện được xét TOP</Label>\n                          <select\n                            value={topEligibilityType}\n                            onChange={(e) => setTopEligibilityType(e.target.value as 'none' | 'per_contract_ip' | 'per_contract_afyp' | 'total_ip' | 'total_afyp')}\n                            className="h-8 w-full rounded-md border border-amber-400/30 bg-gray-950 px-2 text-xs text-white outline-none"\n                          >\n                            <option value="none">Không yêu cầu thêm</option>\n                            <option value="per_contract_ip">IP</option>\n                            <option value="per_contract_afyp">AFYP</option>\n                            <option value="total_ip">Tổng IP</option>\n                            <option value="total_afyp">Tổng AFYP</option>\n                          </select>\n                        </div>\n                        <div className="space-y-1">\n                          <Label className="text-[10px] font-bold text-amber-200">Ngưỡng tối thiểu (≥)</Label>\n                          <div className="relative">\n                            <Input\n                              type="number"\n                              min={0}\n                              inputMode="numeric"\n                              disabled={topEligibilityType === 'none'}\n                              value={topEligibilityType === 'none' ? '' : (topEligibilityMin || '')}\n                              onChange={(e) => setTopEligibilityMin(Math.max(0, Number(e.target.value) || 0))}\n                              placeholder={topEligibilityType === 'none' ? 'Không áp dụng' : 'Nhập ngưỡng'}\n                              className="h-8 pr-8 text-xs border-amber-400/30 bg-gray-950 text-white disabled:opacity-45"\n                            />\n                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-300">đ</span>\n                          </div>\n                        </div>\n                        <p className="sm:col-span-2 text-[10px] leading-4 text-amber-100/70">Chỉ đối tượng đã đạt điều kiện chính và đạt thêm ngưỡng này mới được đưa vào danh sách xét TOP. IP/AFYP là điều kiện theo từng hợp đồng; Tổng IP/Tổng AFYP là tổng của đối tượng.</p>\n                      </div>\n                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">`;
  source = replaceOnce(source, uiAnchor, uiReplacement, 'combined TOP eligibility UI');

  source = source.replace("'use client';", `'use client';\n\n// ${MARKER}`);
  write(file, original, source);
  console.log('✓ combined TOP eligibility wired into main Thi đua page');
}

function patchSavedContestInline() {
  const file = 'src/components/saved-contest-inline.tsx';
  const original = fs.readFileSync(file, 'utf8');
  let source = original.replace(/\r\n/g, '\n');
  if (source.includes(MARKER)) return;

  source = replaceOnce(
    source,
    "import { buildCombinedTopRanking, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';",
    "import { buildCombinedTopRanking, passesCombinedTopEligibility, supportsCombinedTopRanking } from '@/lib/contest-combined-top-ranking';",
    'saved eligibility helper import',
  );

  const candidatesAnchor = `      return true;\n    };\n    const candidates: { key: string; value: number; qualified: boolean }[] = [];`;
  const candidatesReplacement = `      return true;\n    };\n    const passesTopEligibility = (rows: Contract[], focusContract?: Contract) =>\n      passesCombinedTopEligibility(config.topEligibilityType ?? 'none', config.topEligibilityMin ?? 0, rows, focusContract);\n    const candidates: { key: string; value: number; qualified: boolean }[] = [];`;
  source = replaceOnce(source, candidatesAnchor, candidatesReplacement, 'saved ranking eligibility helper');

  source = replaceOnce(
    source,
    "        candidates.push({ key: `contract:${row.contract.id}`, value: row.cValue, qualified: Boolean(row.tier) && passesSecondaryTotals(agentRows) });",
    "        candidates.push({ key: `contract:${row.contract.id}`, value: row.cValue, qualified: Boolean(row.tier) && passesSecondaryTotals(agentRows) && passesTopEligibility(agentRows, row.contract) });",
    'saved per-contract eligibility',
  );
  source = replaceOnce(
    source,
    "        candidates.push({ key: `tvv:${row.agent.agentCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(agentRows) });",
    "        candidates.push({ key: `tvv:${row.agent.agentCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(agentRows) && passesTopEligibility(agentRows) });",
    'saved TVV total eligibility',
  );
  source = replaceOnce(
    source,
    "        candidates.push({ key: `nhom:${group.maNhom}`, value, qualified: Boolean(tier) && passesSecondaryTotals(group.contracts || []) });",
    "        candidates.push({ key: `nhom:${group.maNhom}`, value, qualified: Boolean(tier) && passesSecondaryTotals(group.contracts || []) && passesTopEligibility(group.contracts || []) });",
    'saved group eligibility',
  );
  source = replaceOnce(
    source,
    "        candidates.push({ key: `nyd:${row.nyd.nydCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(personRows) });",
    "        candidates.push({ key: `nyd:${row.nyd.nydCode}`, value: row.value, qualified: Boolean(row.tier) && passesSecondaryTotals(personRows) && passesTopEligibility(personRows) });",
    'saved NTD eligibility',
  );

  source = source.replace("'use client';", `'use client';\n\n// ${MARKER}`);
  write(file, original, source);
  console.log('✓ combined TOP eligibility wired into saved contest results');
}

patchCalculator();
patchMainPage();
patchSavedContestInline();
