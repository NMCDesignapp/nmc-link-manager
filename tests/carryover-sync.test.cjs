/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS route harness with mocked dependencies. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function compile(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => { if (!(id in mocks)) throw Error(`Unexpected dependency ${id}`); return mocks[id]; }, loaded, loaded.exports);
  return loaded.exports;
}
const pure = compile('src/lib/carryover-contracts.ts');
const numbers = compile('src/lib/parse-business-number.ts');
function loadRoute({ source = 'data-hub', authorized = true } = {}) {
  const writes = [];
  const db = new Proxy({ setting: { upsert: async query => { writes.push(query); return query.create; } } }, { get(target, key) { if (!(key in target)) throw Error(`Unexpected revenue access: ${String(key)}`); return target[key]; } });
  const route = compile('src/app/api/sync/route.ts', {
    '@/lib/db': { db }, '@/lib/carryover-contracts': pure, '@/lib/parse-business-number': numbers,
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/sync-source': { getSyncSource: async () => source },
    '@/lib/data-hub-auth': { isDataHubImport: body => body.source === 'nmc-data-hub', isGoogleSyncImport: body => body.source === 'google-sync', isAuthorizedDataHubRequest: () => authorized },
  });
  return { writes, post: body => route.POST({ json: async () => body }) };
}
const headers = ['Mã ĐL', 'Tên', 'Số hợp đồng', 'Ngày hiệu lực', 'Ngày phát hành', 'PĐT + 10% ĐT', 'AFYP', 'Nhóm', 'Mã Ban/Nhóm'];
const csv = rows => [headers, ...rows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
const fixture = ['DEMO', 'Synthetic', 'DEMO-HD', '20/09/2026', '10/10/2026', '6.000.000', '12.000.000', 'Demo', 'G'];
const body = extra => ({ source: 'nmc-data-hub', contractCsv: csv([fixture]), carryoverMonth: pure.bangkokMonth(), ...extra });
test('real sync handler writes isolated snapshot; no Contract/revenue access; dates/numbers preserved', async () => {
  const { post, writes } = loadRoute(); const result = await post(body());
  assert.equal(result.status, 200); assert.equal(result.body.count, 1); assert.equal(writes.length, 1);
  assert.equal(writes[0].where.key, pure.CARRYOVER_SETTING_PREFIX + pure.bangkokMonth());
  const saved = JSON.parse(writes[0].update.value); const row = saved.contracts[0];
  assert.equal(row.pdt10DT, 6000000); assert.equal(row.afyp, 12000000);
  assert.equal(row.effectiveDate, '2026-09-20T00:00:00.000Z'); assert.equal(row.issueDate, '2026-10-10T00:00:00.000Z');
  assert.equal(row.carryoverMonth, pure.bangkokMonth()); assert.match(row.id, /^carryover:/);
});
test('valid empty sheet replaces only the isolated snapshot; malformed header/date never writes', async () => {
  const { post, writes } = loadRoute();
  assert.equal((await post(body({ contractCsv: csv([]) }))).body.count, 0);
  assert.equal(writes.length, 1);
  assert.equal((await post(body({ contractCsv: 'bad,header\na,b' }))).status, 400);
  const invalid = [...fixture]; invalid[4] = 'invalid';
  assert.equal((await post(body({ contractCsv: csv([invalid]) }))).status, 400);
  assert.equal(writes.length, 1);
});
test('reject wrong month, mixed revenue replacement, unauthorized hub and wrong active source', async () => {
  const { post, writes } = loadRoute();
  for (const extra of [{ carryoverMonth: '2000-01' }, { replaceCurrentRevenueMonth: true }, { replaceHistoricalRevenueMonths: [] }, { staffCsv: 'x' }]) assert.equal((await post(body(extra))).status, 400);
  assert.equal(writes.length, 0);
  assert.equal((await loadRoute({ authorized: false }).post(body())).status, 401);
  assert.equal((await loadRoute({ source: 'google' }).post(body())).status, 409);
});
test('manual workbook import uses same isolated pipeline and preserves numberless rows', async () => {
  const { post, writes } = loadRoute(); const blank = [...fixture]; blank[2] = '';
  assert.equal((await post(body({ source: undefined, contractCsv: csv([blank, blank]) }))).body.count, 2);
  const rows = JSON.parse(writes[0].update.value).contracts;
  assert.equal(rows[0].contractNumber, ''); assert.notEqual(rows[0].id, rows[1].id);
});
