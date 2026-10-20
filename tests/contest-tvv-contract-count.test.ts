import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTVVContractProgressNote, getTVVQualifyingContractMap, getGroupTVVContractDetails, getGroupTVVContractProgress, getGroupTVVPassCountIPAFYP, isTVVPassCountMode, parseContestConfig, computeContestStats } from '../src/lib/contest-calculator.ts';
import type { Contract, GroupData } from '../src/lib/contest-calculator.ts';

function contract(agent: string, number: string, ip = 6, afyp = 12): Contract {
  return { id: `${agent}:${number}`, contractNumber: number, agentCode: agent, agentName: agent,
    maNhom: 'G1', nhom: 'Group 1', effectiveDate: '2026-10-10', pdt10DT: ip, afyp } as Contract;
}
const group: GroupData = { maNhom: 'G1', nhom: 'Group 1', leader: { agentCode: 'TN', agentName: 'Leader', position: 'TN' }, contracts: [], totalFYP: 0, totalAFYP: 0, contractCount: 0, activityRounds: 0, memberCount: 0 };
const config = parseContestConfig({ conditionType: 'pass_count_contracts', targetType: 'nhom', secondaryIPMin: 6, secondaryAFYPMin: 12, tvvContractCountMin: 2 });

test('each HĐ must meet BOTH inclusive thresholds; totals cannot substitute', () => {
  const rows = [contract('A', '1'), contract('A', '2'), contract('B', '3', 20, 11), contract('B', '4', 5, 30), contract('C', '5', 100, 100)];
  assert.deepEqual([...getTVVQualifyingContractMap(rows, 6, 12, 2).keys()], ['A']);
});
test('distinct contracts, each TVV once, adjustable minimum', () => {
  const a = contract('A', '1');
  assert.equal(getTVVQualifyingContractMap([a, { ...a, id: 'duplicate' }], 6, 12, 2).size, 0);
  const rows = [a, contract('A', '2'), contract('A', '3')];
  assert.equal(getTVVQualifyingContractMap(rows, 6, 12, 3).size, 1);
  assert.equal(getTVVQualifyingContractMap(rows, 6, 12, 4).size, 0);
  assert.equal(getTVVQualifyingContractMap([], 0, 0, 1).size, 0);
});
test('leader switch and group boundaries agree with shared count', () => {
  const rows = [contract('A', '1'), contract('A', '2'), contract('TN', '1'), contract('TN', '2'), { ...contract('OTHER', '1'), maNhom: 'G2' }, { ...contract('OTHER', '2'), maNhom: 'G2' }];
  assert.equal(getGroupTVVContractDetails(group, rows, [], config).length, 1);
  assert.equal(getGroupTVVPassCountIPAFYP(group, rows, [], config), 1);
  assert.equal(getGroupTVVPassCountIPAFYP(group, rows, [], { ...config, includeTNInPassCount: true }), 2);
  assert.equal(isTVVPassCountMode('pass_count_contracts'), true);
});
test('old total-IP+AFYP mode keeps counting totals', () => {
  const rows = [contract('A', '1', 3, 6), contract('A', '2', 3, 6)];
  assert.equal(getGroupTVVPassCountIPAFYP(group, rows, [], { ...config, conditionType: 'pass_count_ip_afyp' }), 1);
  assert.equal(getGroupTVVPassCountIPAFYP(group, rows, [], config), 0);
});
test('missing contract numbers keep distinct source rows; zero sales never invent TVV', () => {
  const rows = [{ ...contract('A', ''), id: 'row-1' }, { ...contract('A', ''), id: 'row-2' }];
  assert.equal(getTVVQualifyingContractMap(rows, 0, 0, 2).size, 1);
  assert.equal(getGroupTVVContractDetails(group, [], [{ maNhom: 'G1', agentCode: 'A' } as never], { ...config, secondaryIPMin: 0, secondaryAFYPMin: 0 }).length, 0);
});

test('saved configuration and group reward stats use the TVV count', () => {
  const rows = [contract('A', '1'), contract('A', '2')];
  const saved = parseContestConfig({ ...config, bonusTiers: JSON.stringify([{ id: '1', minFYP: 1, maxFYP: null, bonusAmount: 500, bonusType: 'money_per_tvv', bonusText: '', bonusPercent: 0 }]) });
  assert.equal(saved.tvvContractCountMin, 2);
  const stats = computeContestStats(rows, [{ ...group, contracts: rows }], [], [], saved);
  assert.equal(stats.achievedCount, 1);
  assert.equal(stats.totalBonus, 500);
});

test('show pending TVV with valid HĐ, but count and reward only TVV reaching the required HĐ', () => {
  const rows = [contract('PASS', '1'), contract('PASS', '2'), contract('PENDING', '1'), contract('INVALID', '1', 5, 99), contract('INVALID', '2', 99, 11)];
  const progress = getGroupTVVContractProgress(group, rows, [], config);
  assert.deepEqual(progress.map(agent => [agent.agentCode, agent.contracts.length, agent.qualified]), [
    ['PASS', 2, true], ['PENDING', 1, false],
  ]);
  assert.equal(getGroupTVVPassCountIPAFYP(group, rows, [], config), 1);
  const saved = { ...config, bonusTiers: [{ id: '1', minFYP: 1, maxFYP: null, bonusAmount: 500, bonusType: 'money_per_tvv' as const, bonusText: '', bonusPercent: 0 }] };
  assert.equal(computeContestStats(rows, [{ ...group, contracts: rows }], [], [], saved).totalBonus, 500);
});

test('valid HĐ of pending TVV stay visible and names sort inside the group', () => {
  const rows = [
    { ...contract('CODE-A', '1'), agentName: 'TVV Châu' },
    { ...contract('CODE-Z', '1'), agentName: 'TVV An' },
    { ...contract('CODE-Z', '2', 5, 12), agentName: 'TVV An' },
    { ...contract('CODE-M', '1'), agentName: 'TVV Bình' },
  ];
  const progress = getGroupTVVContractProgress(group, rows, [], config);
  assert.deepEqual(progress.map(agent => agent.contracts[0].agentName), ['TVV An', 'TVV Bình', 'TVV Châu']);
  assert.deepEqual(progress.map(agent => agent.contracts.length), [1, 1, 1]);
  assert.ok(progress.every(agent => !agent.qualified));
  assert.equal(getGroupTVVPassCountIPAFYP(group, rows, [], config), 0);
  assert.ok(getGroupTVVContractProgress(group, rows, [], { ...config, tvvContractCountMin: 1 }).every(agent => agent.qualified));
});

test('pending TVV obey group membership, TN switch and distinct-HĐ rule', () => {
  const a = contract('A', '1');
  const rows = [a, { ...a, id: 'duplicate-row' }, contract('TN', '1'), { ...contract('OTHER', '1'), maNhom: 'G2' }];
  assert.deepEqual(getGroupTVVContractProgress(group, rows, [], config).map(agent => [agent.agentCode, agent.contracts.length, agent.qualified]), [['A', 1, false]]);
  assert.deepEqual(getGroupTVVContractProgress(group, rows, [], { ...config, includeTNInPassCount: true }).map(agent => agent.agentCode), ['A', 'TN']);
  assert.deepEqual(getGroupTVVContractProgress(group, [], [], config), []);
});

test('qualified TVV precede pending TVV; pending counts descend then Vietnamese names', () => {
  const rows = [contract('An', '1'), contract('Bình', '1'), contract('Bình', '2'), contract('Châu', '1'), contract('Châu', '2'), contract('Z', '1'), contract('Z', '2'), contract('Z', '3')];
  const progress = getGroupTVVContractProgress(group, rows, [], { ...config, tvvContractCountMin: 3 });
  assert.deepEqual(progress.map(a => a.agentCode), ['Z', 'Bình', 'Châu', 'An']);
  assert.equal(progress.filter(a => a.qualified).length, 1);
  assert.equal(formatTVVContractProgressNote(1, false), '- 01 HĐ');
  assert.equal(formatTVVContractProgressNote(2, false), '- 02 HĐ');
  assert.equal(formatTVVContractProgressNote(3, true), '');
});
