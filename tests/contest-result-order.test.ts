import test from 'node:test';
import assert from 'node:assert/strict';
import { achievedFirstThenIp, usesMienTayDaySongTvvOrder } from '../src/lib/contest-result-order.ts';

test('Miền Tây dậy sóng TVV uses the achieved-first IP order', () => {
  assert.equal(usesMienTayDaySongTvvOrder('MIỀN TÂY DẬY SÓNG - TVV', 'total_ip', 'tvv'), true);
  assert.equal(usesMienTayDaySongTvvOrder('MIỀN TÂY DẬY SÓNG - TN', 'tvv_pass_count', 'nhom'), false);
  assert.equal(usesMienTayDaySongTvvOrder('Chương trình khác', 'total_ip', 'tvv'), false);
});

test('achieved rows stay above non-achieved rows and each group is ordered by IP', () => {
  const rows = [
    { name: 'Chưa đạt IP cao', achieved: false, ip: 100 },
    { name: 'Đạt IP thấp', achieved: true, ip: 50 },
    { name: 'Chưa đạt IP thấp', achieved: false, ip: 20 },
    { name: 'Đạt IP cao', achieved: true, ip: 80 },
  ];

  assert.deepEqual(
    achievedFirstThenIp(rows, row => row.achieved, row => row.ip).map(row => row.name),
    ['Đạt IP cao', 'Đạt IP thấp', 'Chưa đạt IP cao', 'Chưa đạt IP thấp'],
  );
});
