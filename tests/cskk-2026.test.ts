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

test('CSKK HĐC counts monthly summed IP >= 12m, not number of contracts or FYP', () => {
  const result = buildCskkRows(
    [
      // Cùng tháng PH, hai hợp đồng cộng lại đủ 12 triệu; ngày HL ở hai tháng khác nhau.
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 7_000_000, pdt10DT: 7_000_000, issueDate: '2026-01-25', effectiveDate: '2026-02-03' },
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 5_000_000, pdt10DT: 5_000_000, issueDate: '2026-01-29', effectiveDate: '2026-03-03' },
      // IP dưới ngưỡng (chỉ thiếu 1đ) KHÔNG đủ tháng HĐC.
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 50_000_000, pdt10DT: 11_999_999, issueDate: '2026-02-02', effectiveDate: '2026-01-30' },
      // Một hợp đồng IP 24 triệu cũng chỉ tính MỘT tháng.
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 24_000_000, pdt10DT: 24_000_000, issueDate: '2026-03-10', effectiveDate: '2026-03-12' },
      // Thiếu ngày PH: fallback ngày HL.
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 12_000_000, pdt10DT: 12_000_000, effectiveDate: '2026-04-05' },
      // Năm trước/ngày tương lai không được cộng.
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 100_000_000, pdt10DT: 100_000_000, issueDate: '2025-12-31', effectiveDate: '2026-01-01' },
      { agentCode: 'TVV-01', maNhom: 'G1', fyp: 100_000_000, pdt10DT: 100_000_000, issueDate: '2026-12-01', effectiveDate: '2026-11-01' },
    ],
    [],
    [{ agentCode: 'TVV-01', agentName: 'TVV A', maBanNhom: 'G1', nhom: 'Nhóm 1' }],
    [],
    new Date('2026-11-17T12:00:00+07:00'),
  );
  assert.equal(result.tvv.length, 1);
  assert.equal(result.tvv[0].alternateCount, 3); // tháng 1, 3, 4
  assert.equal(result.tvv[0].totalFyp, 98_000_000); // bỏ hai hợp đồng ngoài kỳ
});

test('CSKK HĐC uses tagged Doanhso/Tamthu source months before PH/HL dates', () => {
  const result = buildCskkRows(
    [
      // Sheet Doanhso tháng 1: tháng nguồn 1, dù ngày PH/HL đều tháng 3.
      { agentCode: 'TVV-02', maNhom: 'G1', fyp: 12_000_000, pdt10DT: 12_000_000, issueDate: '2026-03-10', effectiveDate: '2026-03-15', nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1' },
      // Sheet Tamthu tháng 2: phải tính tháng nguồn 2 dù ngày PH/HL đều tháng 1.
      { agentCode: 'TVV-02', maNhom: 'G1', fyp: 12_000_000, pdt10DT: 12_000_000, issueDate: '2026-01-10', effectiveDate: '2026-01-15', nguonDuLieu: 'NMC_TAMTHU:2026-02|sheet4' },
      // Hợp đồng thường tháng 3, IP chưa đủ 12 triệu.
      { agentCode: 'TVV-02', maNhom: 'G1', fyp: 15_000_000, pdt10DT: 11_999_999, issueDate: '2026-03-20', effectiveDate: '2026-03-20' },
      // Tháng 12 trong tương lai: dù ngày PH cũ thì không được tính.
      { agentCode: 'TVV-02', maNhom: 'G1', fyp: 12_000_000, pdt10DT: 12_000_000, issueDate: '2026-01-01', effectiveDate: '2026-01-02', nguonDuLieu: 'NMC_DOANHSO:2026-12' },
    ],
    [],
    [{ agentCode: 'TVV-02', agentName: 'TVV B', maBanNhom: 'G1', nhom: 'Nhóm 1' }],
    [],
    new Date('2026-11-17T12:00:00+07:00'),
  );
  assert.equal(result.tvv.length, 1);
  assert.equal(result.tvv[0].alternateCount, 2); // tháng 1, 2
  assert.equal(result.tvv[0].totalFyp, 39_000_000);
});
