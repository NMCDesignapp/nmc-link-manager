import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveCommunicationExportProfile } from '../src/lib/clb-sao-viet-image-export.ts';

const exporter = readFileSync(new URL('../src/lib/clb-sao-viet-image-export.ts', import.meta.url), 'utf8');
const caller = readFileSync(new URL('../src/app/quan-ly/page.tsx', import.meta.url), 'utf8');

test('policy programs use individual density profiles', () => {
  const keys = ['tvvm', 'ns-tvv', 'quy-tvv', 'tuyen-luyen',
    'dong-hanh', 'ptkd-tn', 'quy-tn', 'tuyen-ngang'];
  for (const key of keys) {
    assert.match(exporter, new RegExp('policy:' + key.replace(/-/g, '\\-')));
    const profile = resolveCommunicationExportProfile('policy', key, 12);
    assert.ok(profile.bodyFont >= 15);
    assert.ok(profile.posterFraction > 0 && profile.posterFraction < 0.3);
  }
  assert.ok(resolveCommunicationExportProfile('policy', 'tvvm', 15).posterFraction
    < resolveCommunicationExportProfile('policy', 'ns-tvv', 9).posterFraction);
});

test('CLB and Sao Viet have distinct programs without changing result calculations', () => {
  for (const key of ['ca-nhan','tn-td','tn-ktm']) {
    assert.ok(resolveCommunicationExportProfile('club', key, 12).rowHeight >= 35);
    assert.ok(resolveCommunicationExportProfile('contest', key, 12).headerFont >= 15);
  }
  assert.match(caller, /category: spec\.tableType === 'contest' \? 'contest' : 'club'/);
  assert.match(caller, /programKey: spec\.program/);
  assert.match(caller, /programKey: kind === 'policy'/);
});

test('export keeps body on one line, wraps only headers and preserves source colors', () => {
  assert.match(exporter, /cell\.closest\('thead'\) \? 'normal' : 'nowrap'/);
  assert.match(exporter, /preserveAppearance\(row, rowCopy\)/);
  assert.match(exporter, /'background-color', 'background-image', 'color'/);
  assert.match(exporter, /const tableWidth = widths\.reduce/);
  assert.match(exporter, /let imageWidth = leftWidth \+ rightWidth/);
  assert.match(exporter, /const EXPORT_ROW_COUNT = 20/);
  assert.doesNotMatch(exporter, /scale\(\$\{scale\}\)/);
});

test('poster has meaningful per-program fallback and uses stored poster when loaded', () => {
  assert.match(exporter, /createProgramCover\(title, subtitle, brandLabel, accentColor\)/);
  assert.match(exporter, /posterImage\.naturalWidth > 0/);
  assert.match(exporter, /cover\.replaceWith\(posterImage\)/);
  assert.doesNotMatch(exporter, /CHƯA CÓ POSTER/);
});
