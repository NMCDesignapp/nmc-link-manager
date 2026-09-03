const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadKpiDashboard } = require('./helpers/load-kpi-dashboard.cjs');

for (const page of ['src/app/kpi/page.tsx', 'kpi-app/src/app/page.tsx']) {
  const calculate = loadKpiDashboard(page);
  const rooms = [{ maPhong: 'REG', tenPhong: 'Regular' }, { maPhong: 'PA', tenPhong: 'PA' }, { maPhong: 'Banca', tenPhong: 'Banca' }];
  const ads = [{ maAD: 'AD_TEST', tenAD: 'Test Manager', maPhong: 'REG' }];
  const groups = [{ maBanNhom: 'TEST_GROUP', maAD: 'AD_TEST' }];
  const contract = (fields = {}) => ({ id: 'synthetic', issueDate: '2026-08-15', effectiveDate: '2026-07-15', afyp: 10_000_000, pdt10DT: 8_000_000, tinhLuot3tr: 12_000_000, ...fields });
  const run = (contracts, period = 'month-8') => calculate({ contracts, leaders: [], staff: [], revenue: [] }, rooms, ads, groups, [], period, 2026, {});

  test(`${page}: all Banca/PA markers survive normalization and count once`, () => {
    const cases = [
      { ad: 'Banca - PA' }, { ad: 'bAnCa' }, { ban: 'PGB TEST' },
      { nhom: 'Nhóm Banca TEST' }, { nhom: 'DSO TEST' },
      { maNhom: 'banca-test' }, { maNhom: 'dso-test' },
      { maNhom: 'U104101014' }, { maNhom: 'A473DSO000' }, { nhom: 'PA' },
    ];
    for (const fields of cases) {
      const result = run([contract(fields)]);
      assert.equal(result.total.afyp, 10_000_000, JSON.stringify(fields));
      assert.equal(result.phongs.find(p => p.noAds).afyp, 10_000_000);
      assert.equal(result.total.lhd, 1);
      assert.equal(result.total.hdChuan, 1);
      assert.equal(result.total.tyTrong, 80);
    }
  });

  test(`${page}: company equals regular plus Banca, matching period contract sum`, () => {
    const result = run([
      contract({ id: 'regular', maNhom: 'TEST_GROUP', ad: '#N/A' }),
      contract({ id: 'banca', ad: 'Banca - PA', afyp: 5_000_000 }),
    ]);
    assert.equal(result.total.afyp, 15_000_000);
    assert.equal(result.total.afyp, result.periodContracts.reduce((sum, c) => sum + c.afyp, 0));
    assert.equal(result.phongs.filter(p => !p.noAds).reduce((sum, p) => sum + p.afyp, 0), 10_000_000);
    assert.equal(result.total.slHD, 2);
  });

  test(`${page}: issue month, fallback, year and quarter filtering stay intact`, () => {
    const rows = [
      contract({ id: 'aug', ad: 'Banca - PA' }),
      contract({ id: 'fallback', ad: 'Banca', issueDate: null, effectiveDate: '2026-08-02' }),
      contract({ id: 'invalid-issue', ad: 'Banca', issueDate: 'invalid', effectiveDate: '2026-08-03' }),
      contract({ id: 'sep', ad: 'Banca', issueDate: '2026-09-02', effectiveDate: '2026-08-03' }),
      contract({ id: 'prior', ad: 'Banca', issueDate: '2025-08-02' }),
    ];
    assert.equal(run(rows).total.afyp, 30_000_000);
    assert.equal(run(rows, 'q3').total.afyp, 40_000_000);
    assert.equal(run(rows, 'year').total.afyp, 40_000_000);
    assert.equal(run([], 'month-8').total.afyp, 0);
  });
}
