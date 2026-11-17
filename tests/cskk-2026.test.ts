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
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 120_000_000, pdt10DT: 12_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1', issueDate: '2026-01-10', effectiveDate: '2026-01-10' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 80_000_000, pdt10DT: 13_000_000, tinhLuot3tr: 13_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-02|sheet2', issueDate: '2026-02-10', effectiveDate: '2026-02-10' },
      { agentCode: 'D104102154', maNhom: 'N01', fyp: 50_000_000, pdt10DT: 12_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-03|sheet3', issueDate: '2026-03-10', effectiveDate: '2026-03-10' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 999_000_000, pdt10DT: 99_000_000, issueDate: '2025-12-31', effectiveDate: '2025-12-31' },
      { agentCode: 'TVV01', maNhom: 'N01', fyp: 999_000_000, pdt10DT: 99_000_000, issueDate: '2026-12-01', effectiveDate: '2026-12-01' },
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
      { agentCode: 'TVV-A', maNhom: 'G1', fyp: 50_000_000, pdt10DT: 12_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1', issueDate: '2026-01-10', effectiveDate: '2026-01-10' },
      { agentCode: 'TVV-A', maNhom: 'G1', fyp: 50_000_000, pdt10DT: 12_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-02|sheet2', issueDate: '2026-02-10', effectiveDate: '2026-02-10' },
      { agentCode: 'TVV-B', maNhom: 'G2', fyp: 100_000_000, pdt10DT: 12_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1', issueDate: '2026-01-10', effectiveDate: '2026-01-10' },
      { agentCode: 'BANCA-1', maNhom: 'A473DSO000', fyp: 900_000_000, pdt10DT: 99_000_000, issueDate: '2026-01-10', effectiveDate: '2026-01-10' },
      { agentCode: 'SALE-G1', maNhom: 'G1', fyp: 100_000_000, issueDate: '2026-03-10', effectiveDate: '2026-03-10' },
      { agentCode: 'SALE-G2', maNhom: 'G2', fyp: 100_000_000, issueDate: '2026-03-10', effectiveDate: '2026-03-10' },
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

test('CSKK HĐC reads preaggregated TÍNH LƯỢT 3TR in each revenue month, one per TVV', () => {
  const result = buildCskkRows(
    [
      // Tháng 1 đã tổng hợp 12 triệu trên một dòng, dòng hợp đồng khác bằng 0.
      { agentCode: 'TVV-01', fyp: 7_000_000, pdt10DT: 7_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1', issueDate: '2026-01-25' },
      { agentCode: 'TVV-01', fyp: 5_000_000, pdt10DT: 5_000_000, tinhLuot3tr: 0, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1', issueDate: '2026-01-29' },
      // IP dù cao nhưng trường "TÍNH LƯỢT" <12 triệu: không đạt.
      { agentCode: 'TVV-01', fyp: 50_000_000, pdt10DT: 50_000_000, tinhLuot3tr: 11_999_999, nguonDuLieu: 'NMC_DOANHSO:2026-02|sheet2', issueDate: '2026-02-02' },
      // Tháng 3 có hai dòng >=12tr (bất thường) cũng không đếm trùng.
      { agentCode: 'TVV-01', fyp: 24_000_000, pdt10DT: 24_000_000, tinhLuot3tr: 24_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-03|sheet3', issueDate: '2026-03-10' },
      { agentCode: 'TVV-01', fyp: 2_000_000, pdt10DT: 2_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-03|sheet3', issueDate: '2026-03-18' },
      // Tháng 4: thiếu ngày PH vẫn được tính HĐC vì tháng Doanh số đã có.
      { agentCode: 'TVV-01', fyp: 12_000_000, pdt10DT: 12_000_000, tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-04|sheet4', effectiveDate: '2026-04-05' },
      // Không thuộc các tháng Doanh số 2026: bỏ qua khi đếm HĐC.
      { agentCode: 'TVV-01', fyp: 100_000_000, tinhLuot3tr: 99_000_000, nguonDuLieu: 'NMC_DOANHSO:2025-12|sheet12', issueDate: '2025-12-31' },
      { agentCode: 'TVV-01', fyp: 100_000_000, tinhLuot3tr: 99_000_000, issueDate: '2026-05-01' },
    ],
    [],
    [{ agentCode: 'TVV-01', agentName: 'TVV A', maBanNhom: 'G1', nhom: 'Nhóm 1' }],
    [],
    new Date('2026-11-17T12:00:00+07:00'),
  );
  assert.equal(result.tvv.length, 1);
  assert.equal(result.tvv[0].alternateCount, 3); // đúng tháng 1, 3 và 4
  assert.equal(result.tvv[0].totalFyp, 188_000_000); // vẫn giữ phép tính FYP cũ, không đổi
});

test('CSKK HĐC uses month tab source rather than issue/effective dates or pdt10DT', () => {
  const result = buildCskkRows(
    [
      { agentCode: 'TVV-02', tinhLuot3tr: 12_000_000, pdt10DT: 1, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1', issueDate: '2026-03-10', effectiveDate: '2026-03-15' },
      { agentCode: 'TVV-02', tinhLuot3tr: 12_000_000, pdt10DT: 1, nguonDuLieu: 'NMC_DOANHSO:2026-02|sheet2', issueDate: '2026-01-10', effectiveDate: '2026-01-15' },
      { agentCode: 'TVV-02', tinhLuot3tr: 12_000_000, pdt10DT: 1, nguonDuLieu: 'NMC_TAMTHU:2026-11|sheet4', effectiveDate: '2026-01-10' },
      { agentCode: 'TVV-02', tinhLuot3tr: 0, pdt10DT: 99_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-03|sheet3', issueDate: '2026-03-20' },
      { agentCode: 'TVV-03', tinhLuot3tr: 12_000_000, nguonDuLieu: 'NMC_DOANHSO:2026-01|sheet1' },
    ],
    [],
    [
      { agentCode: 'tvv-02', agentName: 'TVV B', maBanNhom: 'G1', nhom: 'Nhóm 1' },
      { agentCode: 'TVV-03', agentName: 'TVV C', maBanNhom: 'G1', nhom: 'Nhóm 1' },
    ],
    [],
    new Date('2026-11-17T12:00:00+07:00'),
  );
  assert.equal(result.tvv.find(row => row.agentCode === 'TVV-02')?.alternateCount, 3);
  assert.equal(result.tvv.find(row => row.agentCode === 'TVV-03')?.alternateCount, 1);
});
