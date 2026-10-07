import assert from 'node:assert/strict';
import test from 'node:test';
import XLSX from 'xlsx';
import { csvDataRowCount, revenueWorksheetValues } from '../data-hub/index.mjs';

test('giữ nguyên số hợp đồng dài và bỏ dòng tổng không phải hợp đồng', () => {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['STT', 'Số hợp đồng', 'Ngày hiệu lực', 'FYP'],
    [1, 10000018171743, new Date('2026-10-01T00:00:00.000Z'), 1_000_000],
    ['', '', '', 235_408_029],
  ]);

  const values = revenueWorksheetValues(worksheet);
  assert.equal(values.length, 2);
  assert.equal(values[1][1], '10000018171743');

  const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(values), {
    FS: ',', RS: '\n', forceQuotes: true,
  });
  assert.doesNotMatch(csv, /1E\+13/i);
  assert.equal(csvDataRowCount(csv), 1);
});
