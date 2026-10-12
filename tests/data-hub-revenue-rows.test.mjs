import assert from 'node:assert/strict';
import test from 'node:test';
import XLSX from 'xlsx';

import { revenueWorksheetValues } from '../data-hub/index.mjs';

test('current revenue keeps every row with agent code regardless of dates', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/01/2025'],
    ['', 'HD-3', '01/10/2026'],
  ]);

  const values = revenueWorksheetValues(sheet, { requireAgentCode: true });
  assert.deepEqual(values, [
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/01/2025'],
  ]);
});

test('historical revenue keeps the previous effective-date rule', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/09/2026'],
  ]);

  const values = revenueWorksheetValues(sheet);
  assert.deepEqual(values, [
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A002', 'HD-2', '01/09/2026'],
  ]);
});
