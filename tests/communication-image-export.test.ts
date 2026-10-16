import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolveCommunicationExportProfile } from '../src/lib/clb-sao-viet-image-export.ts';

const exporter = readFileSync(new URL('../src/lib/clb-sao-viet-image-export.ts', import.meta.url), 'utf8');
const caller = readFileSync(new URL('../src/app/quan-ly/page.tsx', import.meta.url), 'utf8');
const contestResult = readFileSync(new URL('../src/app/thi-dua-chau/page.tsx', import.meta.url), 'utf8');

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
  assert.match(exporter, /isHeader \? 'normal' : 'nowrap'/);
  assert.match(exporter, /preserveAppearance\(row, rowCopy\)/);
  assert.match(exporter, /'background-color', 'background-image', 'color'/);
  assert.match(exporter, /const tableWidth = widths\.reduce/);
  assert.match(exporter, /let imageWidth = leftWidth \+ rightWidth/);
  assert.match(exporter, /const EXPORT_ROW_COUNT = 20/);
  assert.doesNotMatch(exporter, /scale\(\$\{scale\}\)/);
});

test('poster has meaningful per-program fallback and uses stored poster when loaded', () => {
  assert.match(exporter, /createProgramCover\(title, subtitle, brandLabel, sideAccent\)/);
  assert.match(exporter, /posterImage\.naturalWidth > 0/);
  assert.match(exporter, /cover\.replaceWith\(posterImage\)/);
  assert.doesNotMatch(exporter, /CHƯA CÓ POSTER/);
});

test('image exporter reuses saved app posters, even from internal poster-image paths', () => {
  assert.match(exporter, /if \(!posterUrl\.startsWith\('data:'\)\)/);
  assert.match(exporter, /context\.drawImage\(posterImage, 0, 0\)/);
  assert.match(exporter, /posterImage\.src = canvas\.toDataURL\('image\/png'\)/);
  assert.match(exporter, /await waitForImage\(posterImage\)/);
  assert.match(caller, /posterUrl: savedPoster\('saoviet', 'ca-nhan'\)/);
  assert.match(caller, /posterUrl: savedPoster\('clbsv', 'ca-nhan'\)/);
  assert.match(caller, /posterUrl = policyImageLinks\[item\.key\]/);
});

test('never breaks Vietnamese words and protects the original detail table', () => {
  assert.match(exporter, /const longestWord = Math\.max/);
  assert.match(exporter, /occupiedThrough\[column\]/);
  assert.match(exporter, /'word-break', 'keep-all'/);
  assert.match(exporter, /'hyphens', 'none'/);
  assert.doesNotMatch(exporter, /'overflow-wrap', 'break-word'/);
  assert.match(exporter, /const isCaption = isHeader/);
  assert.match(exporter, /content\.style\.setProperty\('font-size', size \+ 'px'/);
});

test('left panel has distinct navy, teal and dark gold themes', () => {
  assert.match(exporter, /visualCategory === 'policy' \? '#142F51'/);
  assert.match(exporter, /visualCategory === 'contest' \? '#0B665F'/);
  assert.match(exporter, /: '#91620F'/);
  assert.match(caller, /visualCategory: spec\.tableType === 'contest' \? 'contest' : 'club'/);
});

test('all three communication categories use edge-to-edge posters without distortion', () => {
  // The panel has 18px horizontal text padding, but images must span the
  // full colored column. Do not crop or stretch the original poster bitmap.
  assert.match(exporter, /margin:25px -18px 0;width:calc\(100% \+ 36px\)/);
  assert.match(exporter, /posterImage\.style\.cssText = '[^']*width:100%;height:auto/);
  assert.match(exporter, /object-fit:contain;object-position:center/);
  assert.doesNotMatch(exporter, /posterImage\.style\.cssText = '[^']*height:100%/);
  assert.match(caller, /createClbCommunicationImage\(/);
});

test('contest-result PNG removes white gutter above the poster but keeps the saved poster', () => {
  const start = contestResult.indexOf('const handleDownloadImage = async () => {');
  const end = contestResult.indexOf('hideAllScrollbars();', start);
  assert.ok(start > 0 && end > start);
  const exportCode = contestResult.slice(start, end);
  assert.match(exportCode, /clone\.style\.setProperty\('padding-top', '0', 'important'\)/);
  assert.match(exportCode, /copied\.style\.setProperty\('margin-top', '0', 'important'\)/);
  assert.match(exportCode, /poster\.style\.setProperty\('display', 'block', 'important'\)/);
  assert.match(exportCode, /const MAX_ROWS_PER_IMAGE = 20;/);
  assert.match(exportCode, /const MAX_IMAGES_PER_DOWNLOAD = 2;/);
});

test('contest-result PNG has uniformly readable reward/body data and complete headers', () => {
  const start = contestResult.indexOf('const handleDownloadImage = async () => {');
  const end = contestResult.indexOf('hideAllScrollbars();', start);
  const exportCode = contestResult.slice(start, end);
  assert.match(exportCode, /const exportBodyFont = '15px'/);
  assert.match(exportCode, /const exportHeaderFont = '17px'/);
  assert.match(exportCode, /const exportCaptionFont = '12px'/);
  assert.match(exportCode, /cell\.querySelectorAll<HTMLElement>\('\*'\)\.forEach\(content =>/);
  assert.match(exportCode, /content\.style\.setProperty\('font-size', caption \? exportCaptionFont/);
  assert.match(exportCode, /const isRewardHeading = \/thưởng\|thuong\/i\.test\(title\)/);
  assert.match(exportCode, /isRewardHeading \? 185 : 132/);
  assert.match(exportCode, /cell\.style\.setProperty\('height', '82px', 'important'\)/);
  assert.match(exportCode, /cell\.style\.setProperty\('word-break', 'keep-all', 'important'\)/);
  assert.match(exportCode, /const intrinsicWidth = Math\.ceil\(Math\.max/);
});
