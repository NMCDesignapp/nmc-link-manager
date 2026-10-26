import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSVBreakthrough } from '../src/lib/sao-viet-breakthrough.ts';
const tiers = [{ label: 'Vàng', min: 550, vouchers: 1 }, { label: 'Bạch kim', min: 900, vouchers: 1 }, { label: 'Bạch kim', min: 1400, vouchers: 2 }];
const recruit = [{ label: 'Vàng', minFyp: 500, minHdc: 8 }];
const leader = { agentCode: 'TN1', agentName: 'Leader', nhom: 'Group A', maNhom: 'A', position: 'TN' };
const row = (agentCode: string, fyp = 550) => ({ agentCode, agentName: agentCode, nhomKD: 'Group A', fyp });
test('one or two people: 3m/person and 1m/person for leader', () => {
  const [g] = calculateSVBreakthrough({ 'ca-nhan': [row('A'), row('B')] }, tiers, tiers, recruit, [leader]);
  assert.equal(g.leaderReward, 2_000_000);
  assert.deepEqual(g.members.map(m => m.reward), [3_000_000, 3_000_000]);
});
test('three people upgrades every member and leader, not marginal reward', () => {
  const [g] = calculateSVBreakthrough({ 'ca-nhan': [row('A'), row('B'), row('C')] }, tiers, tiers, recruit, [leader]);
  assert.equal(g.leaderReward, 6_000_000);
  assert.ok(g.members.every(m => m.reward === 10_000_000));
});
test('multiple roles, repeated codes and 2 vouchers still count one person', () => {
  const [g] = calculateSVBreakthrough({ 'ca-nhan': [row(' tn1 ', 1400), row('TN1', 1400)], 'tn-ktm': [row('TN1', 1400)], 'tn-td': [{ ...row('TN1'), fypTVVm: 500, slTvvmHDC: 8 }] }, tiers, tiers, recruit, [leader]);
  assert.equal(g.members.length, 1);
  assert.equal(g.members[0].notes.length, 3);
  assert.match(g.members[0].notes[0], /Bạch kim \(2 vé\)/);
  assert.equal(g.leaderReward, 1_000_000);
  assert.equal(g.members[0].reward, 3_000_000);
});
test('recruitment must meet BOTH conditions, missing/blank agents do not qualify', () => {
  assert.equal(calculateSVBreakthrough({ 'tn-td': [{ ...row('A'), fypTVVm: 600, slTvvmHDC: 7 }], 'ca-nhan': [row('', 900), row('B', 549)] }, tiers, tiers, recruit, [leader]).length, 0);
});
test('30m cap includes management and personal rewards', () => {
  const rows = [row('TN1'), ...Array.from({ length: 14 }, (_, i) => row(`A${i}`))];
  const [g] = calculateSVBreakthrough({ 'ca-nhan': rows }, tiers, tiers, recruit, [leader]);
  assert.equal(g.leaderReward, 20_000_000);
  assert.equal(g.members.find(m => m.code === 'TN1')!.reward, 10_000_000);
});
test('unresolved or ambiguous leader does not receive guessed rewards', () => {
  for (const leaders of [[], [leader, { ...leader, agentCode: 'TN2' }]]) {
    const [g] = calculateSVBreakthrough({ 'ca-nhan': [row('A')] }, tiers, tiers, recruit, leaders);
    assert.equal(g.leaderReward, 0);
    assert.ok(g.issue);
  }
});

test('2026 role-effective TN excluded only from management, achievers remain', () => {
  const [g] = calculateSVBreakthrough({ 'ca-nhan': [row('TN1'), row('B'), row('C')] }, tiers, tiers, recruit, [{ ...leader, ngayHieuLuc: '2026-01-01T00:00:00.000Z' }]);
  assert.equal(g.members.length, 3);
  assert.equal(g.leaderCode, '');
  assert.equal(g.leaderReward, 0);
  assert.match(g.issue, /Chờ chỉ định/);
  assert.ok(g.members.every(m => m.reward === 10_000_000));
});
test('pre-2026 role date remains eligible; employment start does not replace role date', () => {
  for (const ngayHieuLuc of ['2025-12-31', null]) {
    const [g] = calculateSVBreakthrough({ 'ca-nhan': [row('A')] }, tiers, tiers, recruit, [{ ...leader, ngayHieuLuc }]);
    assert.equal(g.leaderCode, 'TN1');
    assert.equal(g.leaderReward, 1_000_000);
  }
});
