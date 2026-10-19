import test from 'node:test';
import assert from 'node:assert/strict';
import { getTVVQualifyingContractMap, getGroupTVVContractDetails, getGroupTVVPassCountIPAFYP, isTVVPassCountMode, parseContestConfig, computeContestStats } from '../src/lib/contest-calculator.ts';
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
