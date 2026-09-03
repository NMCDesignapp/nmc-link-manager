import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import * as calculator from '../src/lib/contest-calculator.ts';
import { expandActivityExportDetails } from '../src/lib/contest-export-details.ts';
import { normalizeContestWorkbook, utils } from '../src/lib/xlsx-contest-wrapper-v2.ts';

const start = new Date();
start.setMonth(start.getMonth() - 1);
const makeContract = (agentCode: string, suffix: string, ip: number, activity: number): calculator.Contract => ({
  id: suffix, contractNumber: suffix, agentCode, agentName: agentCode,
  position: 'TVV', ban: '', nhom: 'Nhom test', maNhom: 'N1',
  leaderAgentCode: 'NTD1', recruiterCode: 'NTD1', maDaiLyTD: 'NTD1',
  startDate: start.toISOString(), ngayBatDauLamViec: start.toISOString(),
  effectiveDate: start.toISOString(), issueDate: start.toISOString(),
  pdt10DT: ip, fyp: ip, afyp: ip, tinhLuot3tr: activity,
});
// Synthetic aggregate: one 13m activity consists of two contracts (8m + 5m).
const contracts = [
  makeContract('A', 'A1', 18_000_000, 18_000_000),
  makeContract('B', 'B1', 12_500_000, 12_500_000),
  makeContract('C', 'C1', 8_000_000, 13_000_000),
  makeContract('C', 'C2', 5_000_000, 0),
  makeContract('NO-PASS', 'X1', 4_000_000, 4_000_000),
];
const structureDates = new Map(contracts.map(c => [c.agentCode, c.startDate]));
const qualifying = (rows: calculator.Contract[]) => calculator.filterQualifyingActivityContracts(
  rows, 12_000_000, 'activity_round_standard_tvvm', 3, 12_000_000, structureDates,
);

test('expands all contracts of qualifying TVVm without adding rounds or unqualified agents', () => {
  const before = JSON.stringify(contracts);
  const rows = expandActivityExportDetails(contracts, qualifying(contracts));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.filter(r => r.contract.agentCode === 'C').map(r => [r.contract.pdt10DT, r.totalIP, r.rounds]),
    [[8_000_000, 13_000_000, 1], [5_000_000, '', '']]);
  assert.equal(rows.reduce((sum, r) => sum + Number(r.rounds), 0), 3);
  assert.equal(JSON.stringify(contracts), before);
});

test('keeps same-name agents separate, blank contract numbers, and empty results', () => {
  const rows = contracts.map(c => ({ ...c, agentName: 'Same name', contractNumber: '' }));
  const output = expandActivityExportDetails(rows, qualifying(rows));
  assert.equal(output.length, 4);
  assert.equal(output.filter(r => r.totalIP !== '').length, 3);
  assert.deepEqual(expandActivityExportDetails(rows, []), []);
});

// Execute the actual export row builder, not a second implementation of its rules.
const source = fs.readFileSync(new URL('../src/app/thi-dua-chau/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let exportBody = '';
let valueHelper = '';
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'getNYDContestValue') {
    valueHelper = node.getText(ast);
  }
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleExport') {
    const fn = node.initializer as ts.ArrowFunction;
    exportBody = fn.body.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const cutoff = exportBody.indexOf("const XLSX = await import('xlsx');");
assert.ok(cutoff > 0, 'export row-builder boundary must exist');
const rowBuilder = ts.transpileModule(
  valueHelper + '\n' + exportBody.slice(1, cutoff) + 'return {headers, rows, merges}; } catch (error) { throw error; }',
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText;

function exportRows(includeOwn = false, usePhase2 = false, conditionType = 'activity_round_standard_tvvm') {
  const own = makeContract('NTD1', 'OWN', 14_000_000, 14_000_000);
  const other = { ...makeContract('OTHER', 'OTHER', 15_000_000, 15_000_000), maDaiLyTD: 'NTD2' };
  const scoped = [...contracts, own, other];
  const dates = new Map([...structureDates, ['NTD1', own.startDate], ['OTHER', other.startDate]]);
  const tiers = [{ id: 'tier', minFYP: 1, maxFYP: null, bonusType: 'money_per_round' as const,
    bonusAmount: 100_000, bonusPercent: 0, bonusText: '' }];
  const scope = {
    ...calculator, expandActivityExportDetails,
    perContractDisplayContracts: scoped, displayContracts: scoped, groupedData: [], tvvTotalRows: [],
    nydData: [{ nydCode: 'NTD1', nydName: 'NTD test', nhom: 'N1', position: 'TTN',
      recruitCount: 3, recruitFYP: 47_500_000, ownFYP: 14_000_000, ownActivityRounds: 1, contracts: scoped }],
    showSecondaryTotalColumn: false, secondaryTotalAFYPMin: 0, secondaryTotalIPMin: 0,
    filterByEffectiveDate: false, targetType: 'nyd', ntdCandidates: [], conditionType,
    luotHDCTThreshold: 12_000_000, luotHDThreshold: 3_000_000,
    topNValueType: 'ip', tvv90MaxMonths: 3, tvv90MinIP: 12_000_000,
    structureStartDateByCode: dates, includeIndividualNTD: includeOwn,
    showRateColumn: false, usePhase2, phase2StartDate: new Date().toISOString(),
    bonusTiers: tiers, bonusTiers2: tiers,
    calculateBonus: (value: number) => calculator.calculateActivityRoundBonusWithTiers(value, tiers),
    checkSecondaryTotalCondition: () => ({ passed: true }),
    formatBonusAmount: (_tier: unknown, _value: number, rounds: number) => rounds * 100_000,
    toast: () => { throw new Error('unexpected empty export'); },
  };
  return new Function(...Object.keys(scope), rowBuilder)(...Object.values(scope));
}

test('actual NTD export includes four contracts, one subtotal per TVVm, unchanged reward and valid merges', () => {
  const { headers, rows, merges } = exportRows();
  const col = (name: string) => headers.indexOf(name);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r: unknown[]) => r[col('Số hợp đồng')]), ['A1', 'B1', 'C1', 'C2']);
  assert.equal(rows[0][col('Tổng cộng')], 3);
  assert.equal(rows[0][col('Thưởng')], 300_000);
  assert.equal(rows[2][col('Tổng IP TVV trong kỳ')], 13_000_000);
  assert.equal(rows[3][col('Tổng IP TVV trong kỳ')], '');
  assert.ok(rows.every((r: unknown[]) => r.length === headers.length));
  for (const name of ['Mã TVV', 'Tổng IP TVV trong kỳ', 'Lượt TVVm', 'IP']) {
    assert.ok(!merges.some((m: { s: { c: number } }) => m.s.c === col(name)));
  }
  // Existing application formatter must preserve the subtotal/contract association.
  const wb = utils.book_new();
  const sheet = utils.aoa_to_sheet([headers, ...rows]);
  sheet['!merges'] = merges;
  utils.book_append_sheet(wb, sheet, 'Kết quả thi đua');
  normalizeContestWorkbook(wb);
  const after = utils.sheet_to_json(wb.Sheets['Kết quả thi đua'], { header: 1, raw: true, defval: '' });
  assert.deepEqual(after, [headers, ...rows]);
});

test('own-contribution toggle, phases and non-TVVm exports retain existing semantics', () => {
  const own = exportRows(true);
  assert.equal(own.rows.length, 5);
  assert.equal(own.rows[0][own.headers.indexOf('Tổng cộng')], 4);
  assert.equal(own.rows[0][own.headers.indexOf('Thưởng')], 400_000);
  const phase = exportRows(false, true);
  assert.equal(phase.rows.length, 4);
  assert.equal(phase.rows[0][phase.headers.indexOf('Tổng Thưởng')], 300_000);
  const normal = exportRows(false, false, 'activity_round_standard');
  assert.equal(normal.rows.length, 3);
  assert.ok(!normal.headers.includes('Tổng IP TVV trong kỳ'));
});
