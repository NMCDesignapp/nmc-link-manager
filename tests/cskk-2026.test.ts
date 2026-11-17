import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCskkRows, getCskkStatus } from '../src/lib/cskk-2026.ts';

test('CSKK TB/TN follows the supplied insurance, title and uniform tiers', () => {
  assert.deepEqual(getCskkStatus('leader', 3_500_000_000), { achievedIndex: 3, reward: 'Healthcare – 300tr', title: 'TN Ngoại hạng', uniform: '1 bộ đầy đủ + phụ kiện' });
  assert.equal(getCskkStatus('leader', 2_500_000_000).title, 'TN Cao cấp');
  assert.equal(getCskkStatus('leader', 1_500_000_000).title, 'TN Ưu tú');
  assert.equal(getCskkStatus('leader', 500_000_000).reward, 'Healthcare – 100tr');
  assert.equal(getCskkStatus('leader', 500_000_000).uniform, '02 sơ mi + 01 áo phông + phụ kiện');
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
      { agentCode: 'D104102154', maNhom: 'N01', fyp: 50_000_000, pdt10DT: 12_000_000, effectiveDate: '2026-03-10' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 999_000_000, pdt10DT: 99_000_000, effectiveDate: '2025-12-31' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 999_000_000, pdt10DT: 99_000_000, effectiveDate: '2026-12-01' },
    ],
    [{ agentCode: 'D104102154', agentName: 'Trưởng nhóm A', position: 'Trưởng nhóm', maNhom: 'N01', nhom: 'Nhóm 1' }],
    [
      { agentCode: 'TVV01', agentName: 'TVV A', maBanNhom: 'N01', nhom: 'Nhóm 1' },
      { agentCode: 'D104102154', agentName: 'Trưởng nhóm A', maBanNhom: 'N01', nhom: 'Nhóm 1' },
    ],
    [{ maBanNhom: 'N01', tenBanNhom: 'Nhóm 1' }],
    new Date('2026-11-17T12:00:00+07:00'),
  );

  assert.equal(result.leaders[0].totalFyp, 250_000_000);
  assert.equal(result.leaders[0].alternateCount, 3);
  assert.equal(result.tvv[0].totalFyp, 200_000_000);
  assert.equal(result.tvv[0].alternateCount, 2);
  assert.equal(result.tvv.find(row => row.agentCode === 'D104102154')?.totalFyp, 50_000_000);
});

test('CSKK excludes Banca TVV and sorts equal FYP by the role-specific condition count', () => {
  const result = buildCskkRows(
    [
      { agentCode: 'TVV-A', maNhom: 'G1', fyp: 50_000_000, pdt10DT: 12_000_000, effectiveDate: '2026-01-10' },
      { agentCode: 'TVV-A', maNhom: 'G1', fyp: 50_000_000, pdt10DT: 12_000_000, effectiveDate: '2026-02-10' },
      { agentCode: 'TVV-B', maNhom: 'G2', fyp: 100_000_000, pdt10DT: 12_000_000, effectiveDate: '2026-01-10' },
      { agentCode: 'BANCA-1', maNhom: 'A473DSO000', fyp: 900_000_000, pdt10DT: 99_000_000, effectiveDate: '2026-01-10' },
      { agentCode: 'SALE-G1', maNhom: 'G1', fyp: 100_000_000, effectiveDate: '2026-03-10' },
      { agentCode: 'SALE-G2', maNhom: 'G2', fyp: 100_000_000, effectiveDate: '2026-03-10' },
    ],
    [
      { agentCode: 'D104102154', agentName: 'TN điều kiện cao', position: 'Trưởng nhóm', maNhom: 'G1', nhom: 'Nhóm 1' },
      { agentCode: 'D104100794', agentName: 'TN điều kiện thấp', position: 'Trưởng nhóm', maNhom: 'G2', nhom: 'Nhóm 2' },
    ],
    [
      { agentCode: 'TVV-A', agentName: 'TVV A', maBanNhom: 'G1', nhom: 'Nhóm 1' },
      { agentCode: 'TVV-B', agentName: 'TVV B', maBanNhom: 'G2', nhom: 'Nhóm 2' },
      { agentCode: 'BANCA-1', agentName: 'TVV Banca', maBanNhom: 'A473DSO000', nhom: 'Banca' },
    ],
    [
      { maBanNhom: 'G1', tenBanNhom: 'Nhóm 1' },
      { maBanNhom: 'G2', tenBanNhom: 'Nhóm 2' },
      { maBanNhom: 'A473DSO000', tenBanNhom: 'Banca', maAD: 'Banca' },
    ],
    new Date('2026-11-17T12:00:00+07:00'),
  );

  assert.deepEqual(result.tvv.map(row => row.agentCode), ['TVV-A', 'TVV-B']);
  assert.deepEqual(result.leaders.map(row => row.agentCode), ['D104102154', 'D104100794']);
});
