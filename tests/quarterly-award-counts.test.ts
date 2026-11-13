import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getQuarterlyAwardCount,
  getQuarterlyAwardCountEntries,
  QUARTERLY_AWARD_COUNT_SOURCE,
} from '../src/lib/quarterly-award-counts-2026.ts';

test('quarterly award source keeps all 224 unique Excel codes and reconciles totals', () => {
  const entries = getQuarterlyAwardCountEntries();
  assert.equal(entries.length, QUARTERLY_AWARD_COUNT_SOURCE.uniqueAgentCount);
  assert.equal(new Set(entries.map(([code]) => code)).size, 224);

  const tbTnCounts = entries.map(([, counts]) => counts[0]);
  const tvvCounts = entries.map(([, counts]) => counts[1]);
  assert.equal(tbTnCounts.filter(value => value > 0).length, 23);
  assert.equal(tvvCounts.filter(value => value > 0).length, 218);
  assert.equal(tbTnCounts.reduce((sum, value) => sum + value, 0), 56);
  assert.equal(tvvCounts.reduce((sum, value) => sum + value, 0), 357);
});

test('quarterly award lookup uses exact agent code and preserves zero versus missing', () => {
  assert.equal(getQuarterlyAwardCount('D104100794', 'tbTn'), 2);
  assert.equal(getQuarterlyAwardCount('D104100794', 'tvv'), 3);
  assert.equal(getQuarterlyAwardCount('  d104118951  ', 'tbTn'), 3);
  assert.equal(getQuarterlyAwardCount('D104118951', 'tvv'), 0);
  assert.equal(getQuarterlyAwardCount('UNKNOWN', 'tvv'), null);
});

test('quarterly policy tables use the Excel lookup for both TVV and TN', () => {
  const source = readFileSync(new URL('../src/app/quan-ly/page.tsx', import.meta.url), 'utf8');
  const tvvSection = source.slice(source.indexOf('const renderThuongQuyTVV'), source.indexOf('const renderThuongNSThangTVV'));
  const tnSection = source.slice(source.indexOf('const renderThuongQuyTN'), source.indexOf('const renderThuongPTKDTN'));

  assert.match(tvvSection, /getQuarterlyAwardCount\(tvv\.agentCode, 'tvv'\)/);
  assert.doesNotMatch(tvvSection, /for \(let q = 1; q <= currentQuarter; q\+\+\)/);
  assert.match(tnSection, /getQuarterlyAwardCount\(tn\.agentCode, 'tbTn'\)/);
  assert.match(tnSection, /SỐ LẦN<br\/>ĐẠT TQ/);
});
