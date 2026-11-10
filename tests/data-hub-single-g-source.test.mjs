import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('installer pins every business workbook to G NMC-Data', () => {
  const installer = read('data-hub/INSTALL-DMS-BC02-APM01.ps1');
  for (const file of ['NEW_BC02.xlsx', 'Cautruc.xlsx', 'NEW_KPI04_2026.xlsx', '83An Giang_SaoViet2026TT.xlsx']) {
    assert.match(installer, new RegExp(`G:\\\\NMC-Data\\\\${file.replace('.', '\\.')}`));
  }
  assert.match(installer, /requiredSourceRoot' 'G:\\NMC-Data'/);
  assert.doesNotMatch(installer, /C:\\NMC-Data/);
  assert.doesNotMatch(installer, /G:\\NMC-Data\\Doanhso\.xlsx/);
});

test('example config has one required G source root and no C workbook', () => {
  const config = JSON.parse(read('data-hub/data-hub.config.example.json'));
  assert.equal(config.requiredSourceRoot, 'G:\\NMC-Data');
  assert.ok(config.sources.length > 0);
  assert.ok(config.sources.every(source => source.file.startsWith('G:\\NMC-Data\\')));
});

test('runtime rejects any configured workbook outside required source root', () => {
  const runtime = read('data-hub/index.mjs');
  assert.match(runtime, /config\.requiredSourceRoot/);
  assert.match(runtime, /Nguồn .* nằm ngoài thư mục bắt buộc/);
  assert.match(runtime, /path\.win32\.relative/);
});
