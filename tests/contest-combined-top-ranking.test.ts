import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCombinedTopRanking,
  getCombinedTopMetric,
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
