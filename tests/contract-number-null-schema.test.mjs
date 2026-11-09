import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Prisma and migration allow BC02 rows without a policy number', () => {
  const schema = read('prisma/schema.prisma');
  const migration = read('prisma/migrations/20261109090000_allow_contract_number_null/migration.sql');
  assert.match(schema, /contractNumber\s+String\?\s+@unique/);
  assert.match(migration, /ALTER TABLE "Contract" ALTER COLUMN "contractNumber" DROP NOT NULL/);
});

test('new-database bootstrap and schema repair keep contractNumber nullable', () => {
  const createTables = read('src/app/api/admin/create-tables/route.ts');
  const fixSchema = read('src/app/api/admin/fix-schema/route.ts');
  assert.match(createTables, /"contractNumber" TEXT,/);
  assert.doesNotMatch(createTables, /"contractNumber" TEXT NOT NULL/);
  assert.match(fixSchema, /ALTER TABLE "Contract" ALTER COLUMN "contractNumber" DROP NOT NULL/);
  assert.match(fixSchema, /contractNumberNullable/);
});

test('BC02 authoritative replacement must import every source row', () => {
  const syncRoute = read('src/app/api/sync/route.ts');
  const dataHub = read('data-hub/index.mjs');
  assert.match(syncRoute, /created\.count !== contractsToCreate\.length/);
  assert.match(syncRoute, /Số hàng nhập khác Sheet nguồn, đã hủy transaction/);
  assert.match(dataHub, /importedRows !== expectedRows/);
  assert.match(dataHub, /sẽ tự thử lại/);
});
