import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStructureStartDateMap, calculateNYDPhaseOutcome, computeContestStats, computeNYDData, computeNYDResultRows, filterContractsByContest, filterDisplayContracts, filterNYDDisplayContracts, getNYDContributingContracts, parseContestConfig } from '../src/lib/contest-calculator.ts';
import type { Contract, RecruiterMember, TVVStructMember } from '../src/lib/contest-calculator.ts';
const M = 1_000_000;
const recruiters = [{ id: 'A', agentCode: 'A', agentName: 'Demo A', position: 'TTN', nhom: 'G', startDate: '2025-01-01' }] as RecruiterMember[];
const struct = (agentCode: string, start = '2026-09-01') => ({ agentCode, ngayBatDau: start, maBanNhom: 'G', maTVVTuyendung: 'A' } as TVVStructMember);
const structure = [struct('NEW1'), struct('NEW2'), struct('OLD', '2020-01-01'), struct('A'), struct('OTHER')];
const row = (id: string, agentCode: string, recruiter: string, ip: number, date = '2026-09-10') => ({ id, contractNumber: id, agentCode, agentName: agentCode, maDaiLyTD: recruiter, maNhom: 'G', nhom: 'G', effectiveDate: date, issueDate: '2026-09-20', pdt10DT: ip * M, afyp: ip * 2 * M, tinhLuot3tr: ip * M } as Contract);
const rows = [row('new1', 'NEW1', 'A', 12), row('new2', 'NEW2', 'A', 13), row('old', 'OLD', 'A', 50), row('own', 'A', 'A', 100), row('other', 'OTHER', 'B', 60)];
const base = { targetType: 'nyd', conditionType: 'total_ip', startDate: '2026-09-01', endDate: '2026-09-30', issueDate: '2026-09-01', issueEndDate: '2026-10-10', recruitedAgentScope: 'tvvm', includeIndividualNTD: false, participants: JSON.stringify(['A']), luotHDCTThreshold: 12 * M, bonusTiers: JSON.stringify([{ id: 't', minFYP: 1, maxFYP: null, bonusType: 'percent', bonusPercent: 10, bonusAmount: 100 }]) };
function run(extra = {}, input = rows) {
  const config = parseContestConfig({ ...base, ...extra });
  const display = filterDisplayContracts(filterContractsByContest(input, config), config, [], recruiters, structure);
  const data = computeNYDData(display, config, recruiters, [], structure);
  const results = computeNYDResultRows(data, config, structure);
  const stats = computeContestStats(display, [], [], [], config, results, structure);
  return { config, display, data, results, stats };
}
test('Hương Sắc configuration: unchecked personal TTN excluded from source, IP, percent bonus, details; raw input unchanged', () => {
  const before = JSON.stringify(rows); const out = run();
  assert.deepEqual(out.display.map(c => c.id), ['new1', 'new2']);
  assert.equal(out.data[0].ownFYP, 0); assert.equal(out.data[0].ownActivityRounds, 0);
  assert.deepEqual(out.data[0].contracts.map(c => c.id), ['new1', 'new2']);
  assert.equal(out.results[0].value, 25 * M); assert.equal(out.stats.totalFYP, 25 * M); assert.equal(out.stats.totalBonus, 2.5 * M);
  assert.equal(JSON.stringify(rows), before);
});
test('checked/unchecked/checked toggles are deterministic and totals never count personal twice', () => {
  assert.equal(run({ includeIndividualNTD: true }).results[0].value, 125 * M);
  assert.equal(run().results[0].value, 25 * M);
  assert.equal(run({ includeIndividualNTD: true }).stats.totalBonus, 12.5 * M);
});
test('personal TTN cannot supply third standard activity round or supplementary IP threshold when disabled', () => {
  const conditions = { useSecondaryCondition: true, secondaryLuotHDCMin: 3, secondaryTotalIPMin: 100 * M };
  const off = run(conditions); assert.equal(off.results[0].secondaryCheck.luotHDC, 2); assert.equal(off.stats.achievedCount, 0); assert.equal(off.stats.totalBonus, 0);
  const on = run({ ...conditions, includeIndividualNTD: true }); assert.equal(on.results[0].secondaryCheck.luotHDC, 3); assert.equal(on.stats.achievedCount, 1);
});
for (const conditionType of ['total_ip', 'total_afyp', 'activity_round', 'activity_round_standard', 'activity_round_tvvm', 'activity_round_standard_tvvm'] as const) {
  for (const includeIndividualNTD of [false, true]) test(`${conditionType}: personal flag controls source, value and phase base`, () => {
    const out = run({ conditionType, includeIndividualNTD });
    const value = conditionType.startsWith('activity') ? (includeIndividualNTD ? 3 : 2) : (includeIndividualNTD ? 125 : 25) * M * (conditionType === 'total_afyp' ? 2 : 1);
    assert.equal(out.results[0].value, value);
    assert.equal(out.stats.totalBonus, (includeIndividualNTD ? 12.5 : 2.5) * M);
    const phase = calculateNYDPhaseOutcome(rows, 'A', out.config.bonusTiers, conditionType, includeIndividualNTD, 12 * M, 3, 12 * M, buildStructureStartDateMap(structure), 'tvvm');
    assert.equal(phase.baseIP, (includeIndividualNTD ? 125 : 25) * M);
  });
}
test('per-recruiter sums cannot borrow another recruiters contracts for the same TVV', () => {
  const mixed = [row('mine', 'NEW1', 'A', 2), row('theirs', 'NEW1', 'B', 100)];
  const config = parseContestConfig({ ...base, conditionType: 'activity_round_standard' });
  const data = computeNYDData(mixed, config, recruiters, [], structure);
  assert.equal(data[0].recruitFYP, 2 * M); assert.equal(data[0].recruitCount, 0);
  assert.deepEqual(data[0].contracts.map(c => c.id), ['mine']);
});
test('agent-code case/space variants cannot turn personal HĐ into recruited production', () => {
  const aliases = [row('self1', ' a ', 'A', 100), row('self2', 'A', ' a ', 100), row('real', 'NEW1', ' a ', 12)];
  const out = run({}, aliases); assert.deepEqual(out.display.map(c => c.id), ['real']); assert.equal(out.results[0].value, 12 * M);
});
test('selecting recruiter by name does not create duplicate result/reward rows', () => {
  const out = run({ participants: JSON.stringify(['Demo A']) });
  assert.equal(out.data.length, 1); assert.equal(out.stats.achievedCount, 1); assert.equal(out.stats.totalBonus, 2.5 * M);
});
test('all/TVVm scope and empty valid recruiter remain independent of personal flag', () => {
  assert.equal(run({ recruitedAgentScope: 'all' }).results[0].value, 75 * M);
  const empty = run({}, [row('own-only', 'A', '', 100)]); assert.equal(empty.data.length, 1); assert.equal(empty.results[0].value, 0); assert.equal(empty.display.length, 0);
});
test('two phases and percentage bases exclude personal and out-of-scope TVV in both phases', () => {
  const split = [row('p1', 'NEW1', 'A', 12, '2026-09-10'), row('p2', 'NEW2', 'A', 13, '2026-09-20'), row('own-p1', 'A', '', 100), row('old-p2', 'OLD', 'A', 50, '2026-09-20')];
  const out = run({ usePhase2: true, phase2StartDate: '2026-09-16', bonusTiers2: JSON.stringify([{ id: 'p2', minFYP: 1, maxFYP: null, bonusType: 'percent', bonusPercent: 20 }]) }, split);
  assert.equal(out.stats.totalBonus, (1.2 + 2.6) * M);
});
test('personal own contract may legitimately contribute to a different selected recruiter, counted once in source', () => {
  const input = [row('hierarchy', 'A', 'B', 12)]; const people = [...recruiters, { ...recruiters[0], agentCode: 'B', agentName: 'Demo B' }];
  const config = parseContestConfig({ ...base, participants: '[]' });
  const display = filterNYDDisplayContracts(input, config, people, structure);
  assert.equal(display.length, 1);
  assert.equal(getNYDContributingContracts(display, 'A', false).length, 0);
  assert.equal(getNYDContributingContracts(display, 'B', false).length, 1);
});

for (const [bonusType, expected] of [['percent', 2.5 * M], ['percent_total_ip', 2.5 * M], ['percent_fyc', 0.625 * M], ['money_per_tvv', 200]] as const) test(`${bonusType}: saved summary uses only recruited bonus base/count when personal is off`, () => {
  const out = run({ bonusTiers: JSON.stringify([{ id: 't', minFYP: 1, maxFYP: null, bonusType, bonusPercent: 10, bonusAmount: 100 }]) });
  assert.equal(out.stats.totalBonus, expected);
});
test('unknown or DSO names cannot become payable recruiters from a zero threshold tier', () => {
  const config = parseContestConfig({ ...base, participants: '["UNKNOWN"]', bonusTiers: JSON.stringify([{ id: 'zero', minFYP: 0, maxFYP: null, bonusAmount: 100, bonusType: 'money' }]) });
  assert.equal(computeNYDData(rows, config, recruiters, [], structure).length, 0);
  const dso = [{ ...recruiters[0], nhom: 'DSO' }];
  assert.equal(computeNYDData(rows, { ...config, participants: [] }, dso, [], structure).length, 0);
});
