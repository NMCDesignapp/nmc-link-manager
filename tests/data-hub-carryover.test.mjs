import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import { inputFromSource, importOne, csvDataRowCount } from '../data-hub/index.mjs';

test('Doanhso current sheet feeds isolated carryover request, never revenue; checksum includes month', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nmc-carryover-'));
  const file = path.join(dir, 'synthetic.xlsx');
  const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
  const current = String(Number(month.slice(5)));
  const other = current === '9' ? '8' : '9';
  const headers = ['Mã ĐL', 'Tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP'];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ['DEMO', 'Synthetic', 10000018171743, new Date(2026, 8, 20), new Date(2026, 9, 10), 6, 12]]), current);
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ['OTHER', 'Synthetic', 'OTHER-HD', '', '', 1, 1]]), other);
  XLSX.writeFile(workbook, file);
  const source = { id: 'history-carryover', kind: 'revenue-carryover', file, allowEmpty: true };
  const requests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body); requests.push({ url, body });
    return { ok: true, json: async () => ({ carryoverMonth: body.carryoverMonth, count: csvDataRowCount(body.carryoverCsv), errors: [] }) };
  };
  try {
    const input = await inputFromSource(source);
    assert.equal(input.month, month); assert.match(input.csv, /10000018171743/); assert.doesNotMatch(input.csv, /OTHER-HD|1E\+13/i);
    assert.match(input.csv, /2026-09-20/); assert.match(input.csv, /2026-10-10/);
    const state = { sources: {} };
    const first = await importOne({ appUrl: 'https://synthetic.invalid', token: 'synthetic-test-value' }, source, state, false);
    assert.equal(first.changed, true); assert.equal(requests.length, 1);
    assert.equal(requests[0].body.carryoverMonth, month);
    assert.equal(requests[0].body.contractCsv, undefined, 'Old servers must not receive a revenue CSV');
    assert.equal(requests[0].body.replaceHistoricalRevenueMonths, undefined);
    assert.equal(requests[0].body.replaceCurrentRevenueMonth, undefined);
    const second = await importOne({ appUrl: 'https://synthetic.invalid', token: 'synthetic-test-value' }, source, state, false);
    assert.equal(second.changed, false); assert.equal(requests.length, 1);
    await assert.rejects(inputFromSource({ ...source, file: path.join(dir, 'missing.xlsx') }));
  } finally { globalThis.fetch = originalFetch; await fs.rm(dir, { recursive: true, force: true }); }
});
