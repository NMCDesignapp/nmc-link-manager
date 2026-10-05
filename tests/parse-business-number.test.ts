import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseBusinessNumber } from '../src/lib/parse-business-number.ts';

test('giữ đúng số thập phân dạng máy từ Data Hub', () => {
  assert.equal(parseBusinessNumber('26305035.8'), 26_305_035.8);
  assert.equal(parseBusinessNumber('55946797.8'), 55_946_797.8);
});

test('đọc đúng định dạng số Việt Nam và định dạng quốc tế', () => {
  assert.equal(parseBusinessNumber('26.305.035,8'), 26_305_035.8);
  assert.equal(parseBusinessNumber('26,305,035.8'), 26_305_035.8);
  assert.equal(parseBusinessNumber('26.305.035'), 26_305_035);
  assert.equal(parseBusinessNumber('26,305,035'), 26_305_035);
});

test('giữ số nguyên, số âm và giá trị rỗng', () => {
  assert.equal(parseBusinessNumber(12_580_540), 12_580_540);
  assert.equal(parseBusinessNumber('- 1.250,5 đ'), -1_250.5);
  assert.equal(parseBusinessNumber(''), 0);
});

test('Data Hub giữ giá trị số gốc của Excel thay vì chuỗi đã làm tròn', () => {
  const source = fs.readFileSync(new URL('../data-hub/index.mjs', import.meta.url), 'utf8');
  assert.match(source, /XLSX\.readFile\(file, \{ raw: true, cellDates: true \}\)/);
  assert.match(source, /sheet_to_json\(sheet, \{ header: 1, defval: '', raw: true, blankrows: false \}\)/);
});
