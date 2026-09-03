const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the actual GET handler with synthetic records; never write production data.
function loadFeed(records) {
  const file = path.resolve(__dirname, '../src/app/api/contest-notices/route.ts');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const queries = [];
  const mocks = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, options }) } },
    '@/lib/db': { db: { contest: { findMany: async (query) => { queries.push(query); return records; } } } },
  };
  new Function('require', 'module', 'exports', code)((id) => {
    if (!mocks[id]) throw new Error(`Unexpected dependency: ${id}`);
    return mocks[id];
  }, module, module.exports);
  return { GET: module.exports.GET, queries };
}

const record = (title, id) => ({ id, title, startDate: '2026-09-01', endDate: '2026-09-30', targetType: 'tvv', conditionType: null, updatedAt: '2026-09-01T00:00:00Z' });

test('notice feed excludes CHỐT prefix regardless of case, whitespace or Unicode composition', async () => {
  const titles = ['CHỐT THÁNG', 'Chốt ngày', 'chốt tuần', '  CHỐT - TVV', '\t\nchốt', 'CHỐT', 'CHỐT: 2026', 'CHỐT NGÀY'.normalize('NFD')];
  const rows = titles.map(record);
  const original = structuredClone(rows);
  const { GET, queries } = loadFeed(rows);
  assert.deepEqual((await GET()).body, []);
  assert.deepEqual(rows, original, 'Filtering must not mutate saved contests');
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].orderBy, { createdAt: 'desc' });
});

test('other contests and CHỐT occurring later in the name remain unchanged and ordered', async () => {
  const rows = [record('HƯƠNG SẮC TÂY NGUYÊN', 'a'), record('CHỐT THÁNG', 'b'), record('THI ĐUA CHỐT THÁNG', 'c'), record('CHOT KHÔNG DẤU', 'd')];
  const { GET } = loadFeed(rows);
  const result = await GET();
  assert.deepEqual(result.body.map(item => item.id), ['a', 'c', 'd']);
  assert.equal(result.body[0].title, rows[0].title);
  assert.equal(result.body[0].posterUrl, '/api/contest-poster/a?v=1788220800000');
  assert.equal(result.body[0].endDate, '2026-09-30');
  assert.match(result.options.headers['Cache-Control'], /s-maxage=60/);
});

test('empty feed is valid', async () => {
  assert.deepEqual((await loadFeed([]).GET()).body, []);
});
