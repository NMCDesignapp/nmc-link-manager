import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCskkRows, getCskkStatus } from '../src/lib/cskk-2026.ts';

test('CSKK TB/TN follows the supplied insurance, title and uniform tiers', () => {
  assert.deepEqual(getCskkStatus('leader', 3_500_000_000), { achievedIndex: 3, reward: 'Healthcare – 300tr', title: 'TN Ngoại hạng', uniform: '1 bộ đầy đủ + phụ kiện' });
  assert.equal(getCskkStatus('leader', 2_500_000_000).title, 'TN Cao cấp');
  assert.equal(getCskkStatus('leader', 1_500_000_000).title, 'TN Ưu tú');
  assert.equal(getCskkStatus('leader', 500_000_000).reward, 'Healthcare – 100tr');
  assert.equal(getCskkStatus('leader', 200_000_000).reward, 'BaoVietCare – 50tr');
  assert.equal(getCskkStatus('leader', 0, 1).reward, 'BaoVietCare – 50tr');
});

test('CSKK TVV follows the supplied insurance, title, uniform and activity alternative', () => {
  assert.equal(getCskkStatus('tvv', 750_000_000).title, 'TVV Ngoại hạng');
  assert.equal(getCskkStatus('tvv', 500_000_000).title, 'TVV Cao cấp');
  assert.equal(getCskkStatus('tvv', 250_000_000).title, 'TVV Xuất sắc');
  assert.equal(getCskkStatus('tvv', 100_000_000).reward, 'BaoVietCare – 50tr');
  assert.equal(getCskkStatus('tvv', 0, 5).uniform, '01 sơ mi');
  assert.equal(getCskkStatus('tvv', 99_999_999, 4).achievedIndex, -1);
});

test('CSKK rows total 2026 FYP and expose quarterly awards or standard activity months', () => {
  const result = buildCskkRows(
    [
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 120_000_000, pdt10DT: 12_000_000, effectiveDate: '2026-01-10' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 80_000_000, pdt10DT: 13_000_000, effectiveDate: '2026-02-10' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 999_000_000, pdt10DT: 99_000_000, effectiveDate: '2025-12-31' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 999_000_000, pdt10DT: 99_000_000, effectiveDate: '2026-12-01' },
    ],
    [{ agentCode: 'D104102154', agentName: 'Trưởng nhóm A', position: 'Trưởng nhóm', maNhom: 'N01', nhom: 'Nhóm 1' }],
    [{ agentCode: 'TVV01', agentName: 'TVV A', maBanNhom: 'N01', nhom: 'Nhóm 1' }],
    [{ maBanNhom: 'N01', tenBanNhom: 'Nhóm 1' }],
    new Date('2026-11-17T12:00:00+07:00'),
  );

  assert.equal(result.leaders[0].totalFyp, 200_000_000);
  assert.equal(result.leaders[0].alternateCount, 3);
  assert.equal(result.tvv[0].totalFyp, 200_000_000);
  assert.equal(result.tvv[0].alternateCount, 2);
});
