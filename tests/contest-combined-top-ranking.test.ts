import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCombinedTopRanking,
  getCombinedTopEligibilityValue,
  getCombinedTopMetric,
  normalizeCombinedTopEligibilityType,
  passesCombinedTopEligibility,
  supportsCombinedTopRanking,
} from '../src/lib/contest-combined-top-ranking.ts';

test('combined TOP only ranks rows that already satisfy the primary condition', () => {
  const ranking = buildCombinedTopRanking([
    { key: 'A', value: 120_000_000, qualified: false },
    { key: 'B', value: 100_000_000, qualified: true },
    { key: 'C', value: 90_000_000, qualified: true },
    { key: 'D', value: 80_000_000, qualified: true },
  ], 2, [1_000_000, 700_000]);

  assert.equal(ranking.has('A'), false, 'highest metric must not rank when primary condition is not met');
  assert.deepEqual(ranking.get('B'), {
    rank: 1,
    title: 'Quán quân',
    reward: 1_000_000,
    note: 'Quán quân - 1.000.000đ',
  });
  assert.deepEqual(ranking.get('C'), {
    rank: 2,
    title: 'Á quân',
    reward: 700_000,
    note: 'Á quân - 700.000đ',
  });
  assert.equal(ranking.has('D'), false);
});

test('rank 3 and later use TOP N labels and zero reward is still explicit', () => {
  const ranking = buildCombinedTopRanking([
    { key: 'A', value: 30, qualified: true },
    { key: 'B', value: 20, qualified: true },
    { key: 'C', value: 10, qualified: true },
  ], 3, [1_000_000, 500_000]);

  assert.equal(ranking.get('C')?.note, 'TOP 3 - 0đ');
});

test('combined TOP is available only for IP/AFYP total or per-contract contests', () => {
  for (const condition of ['total_ip', 'total_afyp', 'per_contract_ip', 'per_contract_afyp']) {
    assert.equal(supportsCombinedTopRanking(condition), true);
  }
  assert.equal(supportsCombinedTopRanking('activity_round'), false);
  assert.equal(getCombinedTopMetric('total_afyp'), 'afyp');
  assert.equal(getCombinedTopMetric('per_contract_ip'), 'ip');
});

test('TOP eligibility supports IP, AFYP, total IP and total AFYP thresholds', () => {
  const contracts = [
    { pdt10DT: 40_000_000, afyp: 25_000_000 },
    { pdt10DT: 70_000_000, afyp: 45_000_000 },
  ];

  assert.equal(getCombinedTopEligibilityValue('per_contract_ip', contracts), 70_000_000);
  assert.equal(getCombinedTopEligibilityValue('per_contract_afyp', contracts), 45_000_000);
  assert.equal(getCombinedTopEligibilityValue('total_ip', contracts), 110_000_000);
  assert.equal(getCombinedTopEligibilityValue('total_afyp', contracts), 70_000_000);

  assert.equal(passesCombinedTopEligibility('per_contract_ip', 60_000_000, contracts), true);
  assert.equal(passesCombinedTopEligibility('per_contract_afyp', 50_000_000, contracts), false);
  assert.equal(passesCombinedTopEligibility('total_ip', 100_000_000, contracts), true);
  assert.equal(passesCombinedTopEligibility('total_afyp', 80_000_000, contracts), false);
});

test('per-contract TOP eligibility uses the current contract when one is supplied', () => {
  const contracts = [
    { pdt10DT: 40_000_000, afyp: 20_000_000 },
    { pdt10DT: 90_000_000, afyp: 60_000_000 },
  ];

  assert.equal(passesCombinedTopEligibility('per_contract_ip', 50_000_000, contracts, contracts[0]), false);
  assert.equal(passesCombinedTopEligibility('per_contract_ip', 50_000_000, contracts, contracts[1]), true);
  assert.equal(passesCombinedTopEligibility('none', 999_000_000, contracts, contracts[0]), true);
});

test('unknown saved eligibility values stay backward compatible', () => {
  assert.equal(normalizeCombinedTopEligibilityType('total_ip'), 'total_ip');
  assert.equal(normalizeCombinedTopEligibilityType('legacy'), 'none');
  assert.equal(normalizeCombinedTopEligibilityType(undefined), 'none');
});
