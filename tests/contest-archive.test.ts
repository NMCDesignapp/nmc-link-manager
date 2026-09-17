import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createYearArchivePayload,
  groupChotContestsByMonth,
  isChotContestTitle,
} from '../src/lib/contest-archive.ts';

const contests = [
  { id: '1', title: 'CHỐT Tháng 1 - A', startDate: '2026-01-05', endDate: '2026-01-31' },
  { id: '2', title: '  chốt Tháng 1 - B', startDate: '2026-01-20', endDate: '2026-01-31' },
  { id: '3', title: 'CHOT Tháng 3', startDate: '2026-03-01', endDate: '2026-03-31' },
  { id: '4', title: 'Thi đua thường', startDate: '2026-02-01', endDate: '2026-02-28' },
  { id: '5', title: 'CHỐT năm trước', startDate: '2025-12-01', endDate: '2025-12-31' },
];

test('nhận diện CHỐT không phân biệt dấu, hoa thường và khoảng trắng đầu', () => {
  assert.equal(isChotContestTitle('CHỐT chương trình'), true);
  assert.equal(isChotContestTitle('  chốt chương trình'), true);
  assert.equal(isChotContestTitle('CHOT chương trình'), true);
  assert.equal(isChotContestTitle('Thi đua CHỐT'), false);
});

test('nhóm chương trình CHỐT theo tháng của ngày bắt đầu', () => {
  const groups = groupChotContestsByMonth(contests, 2026);

  assert.deepEqual(groups.map(group => [group.label, group.contests.length]), [
    ['Tháng 3', 1],
    ['Tháng 1', 2],
  ]);
  assert.equal(groups[1].contests[0].id, '2');
});

test('gói tải năm chỉ chứa chương trình CHỐT của đúng năm', () => {
  const payload = createYearArchivePayload(contests, 2026);

  assert.equal(payload.format, 'nmc-contest-chot-archive-v1');
  assert.equal(payload.count, 3);
  assert.deepEqual(payload.contests.map(contest => contest.id), ['1', '2', '3']);
});
