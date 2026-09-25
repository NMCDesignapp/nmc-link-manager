import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateClbsvPersonalRank } from '../src/lib/clb-sao-viet-personal-rank.ts';

const base = {
  minimumMonthlyIp: 12_000_000,
  month: 9,
};

test('ưu tiên hiển thị số FYP lũy kế còn thiếu trước điều kiện IP tháng', () => {
  assert.deepEqual(evaluateClbsvPersonalRank({
    ...base,
    cumulativeFyp: 1_079_500_499,
    monthlyIp: 0,
    threshold: 1_405_000_000,
  }), { kind: 'deficit', amount: 325_499_501 });
});

test('chỉ hiện thiếu IP tháng khi FYP lũy kế đã đạt hạng', () => {
  assert.deepEqual(evaluateClbsvPersonalRank({
    ...base,
    cumulativeFyp: 1_079_500_499,
    monthlyIp: 0,
    threshold: 820_000_000,
  }), { kind: 'missing-monthly-ip', label: 'Thiếu IP T9' });
});

test('đánh dấu đạt khi đủ cả FYP lũy kế và IP tháng', () => {
  assert.deepEqual(evaluateClbsvPersonalRank({
    ...base,
    cumulativeFyp: 820_000_000,
    monthlyIp: 12_000_000,
    threshold: 820_000_000,
  }), { kind: 'achieved' });
});
