import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import XLSX from 'xlsx';

import { historicalRevenueFromWorkbook, revenueWorksheetValues } from '../data-hub/index.mjs';

test('current revenue keeps every non-empty row regardless of agent code or dates', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/01/2025'],
    ['', 'HD-3', '01/10/2026'],
  ]);

  const values = revenueWorksheetValues(sheet);
  assert.deepEqual(values, [
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/01/2025'],
    ['', 'HD-3', '01/10/2026'],
  ]);
});

test('historical revenue keeps every non-empty row regardless of dates', () => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/09/2026'],
  ]);

  const values = revenueWorksheetValues(sheet);
  assert.deepEqual(values, [
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A001', 'HD-1', ''],
    ['A002', 'HD-2', '01/09/2026'],
  ]);
});

test('historical revenue assigns month from sheet number instead of row dates', () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['', 'HD-1', ''],
  ]), '1');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A009', 'HD-9', '01/01/2026'],
  ]), '9');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực'],
    ['A010', 'HD-10', '01/09/2026'],
  ]), '10');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nmc-revenue-'));
  const file = path.join(dir, 'Doanhso.xlsx');
  try {
    XLSX.writeFile(workbook, file);
    const result = historicalRevenueFromWorkbook(file, '2026-10');
    assert.deepEqual(result.months, ['2026-01', '2026-09']);
    assert.match(result.csv, /,"HD-1",,"2026-01"/);
    assert.match(result.csv, /"A009","HD-9","01\/01\/2026","2026-09"/);
    assert.doesNotMatch(result.csv, /HD-10/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
