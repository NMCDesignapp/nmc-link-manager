/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness uses CommonJS. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const XLSX = require('xlsx-js-style');

// Run the real page calculations and export handler with synthetic data.
for (const page of ['src/app/kpi/page.tsx', 'kpi-app/src/app/page.tsx']) {
  const source = fs.readFileSync(page, 'utf8');
  const ast = ts.createSourceFile(page, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const snippets = {};
  const helpers = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && ['num', 'getDoanhSoMonth', 'isTBorTNPosition'].includes(node.name?.text)) helpers.push(node.getText(ast));
    if (ts.isVariableDeclaration(node) && ['detailData', 'filteredDetailData', 'exportGroupDetailExcel'].includes(node.name.getText(ast))) snippets[node.name.getText(ast)] = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const body = `${helpers.join('\n')}
    const detailData = (${snippets.detailData.initializer.arguments[0].getText(ast)})();
    const filteredDetailData = (${snippets.filteredDetailData.initializer.arguments[0].getText(ast)})();
    const exportGroupDetailExcel = ${snippets.exportGroupDetailExcel.initializer.getText(ast).replace("import('xlsx-js-style')", 'loadXlsx()')};
    return exportGroupDetailExcel();`;
  const code = ts.transpileModule(body, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const execute = new Function('rawData', 'phongStructList', 'adStructList', 'banNhomStructList', 'onlineSettings', 'CUR_YEAR', 'detailMonth', 'detailAdFilter', 'standalone', 'adminAuthed', 'detailExporting', 'setDetailExporting', 'loadXlsx', 'alert', 'console', code);
  async function run(period, options = {}) {
    const settings = { 'nmc-kh-nhom-G1': '100000000', 'nmc-kh-nhom-G2': '50000000' };
    for (let m = 1; m <= 12; m++) settings[`nmc-kh-ratio-${String(m).padStart(2, '0')}`] = '5';
    const contracts = [{ maNhom: 'G1', afyp: 10500000.25, issueDate: '2026-09-10', effectiveDate: '2026-08-01' }, { maNhom: 'G1', afyp: 2000000, issueDate: null, effectiveDate: '2026-08-01' }, { maNhom: 'G1', afyp: 3000000, issueDate: '2026-01-01' }, { maNhom: 'G1', afyp: 99000000, issueDate: '2025-09-01' }];
    let file; const states = []; const alerts = [];
    await execute({ contracts, leaders: [{ maNhom: 'G1', position: 'TN', agentCode: '00123', agentName: 'TN TEST' }] }, [{ maPhong: 'P' }], [{ maPhong: 'P', maAD: 'A1' }, { maPhong: 'P', maAD: 'A2' }], [{ maBanNhom: 'G1', tenBanNhom: 'TEST 1', maAD: 'A1' }, { maBanNhom: 'G2', tenBanNhom: 'TEST 2', maAD: 'A2' }], settings, 2026, period, options.ad || 'all', !!options.standalone, options.admin !== false, false, value => states.push(value), async () => {
      if (options.fail) throw new Error('synthetic load failure');
      return { ...XLSX, writeFile: (book, name) => { file = { name, sheet: XLSX.read(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer', cellNF: true }).Sheets['Chi tiet ban nhom'] }; } };
    }, message => alerts.push(message), { error() {} });
    return { file, states, alerts };
  }

  test(`${page}: Excel follows month/quarter/half-year/year with full amounts`, async () => {
    for (const [period, plan, actual, label] of [['09', 5000000, 10500000.25, 'T9/2026'], ['08', 5000000, 2000000, 'T8/2026'], ['Q3', 15000000, 12500000.25, 'Q3/2026'], ['H1', 30000000, 3000000, '6T ĐẦU 2026'], ['Y', 60000000, 15500000.25, 'NĂM 2026']]) {
      const { file, states } = await run(period);
      const s = file.sheet;
      assert.deepEqual(XLSX.utils.sheet_to_json(s, { header: 1 })[0], ['STT', 'NHÓM', 'MÃ TN', 'HỌ TÊN TN', `KẾ HOẠCH ${label}`, `THỰC HIỆN ${label}`, 'TỶ LỆ HT (%)']);
      assert.equal(s.C2.v, '00123'); assert.equal(s.C2.t, 's');
      assert.equal(s.E2.v, plan); assert.equal(s.F2.v, actual);
      assert.ok(Math.abs(s.G2.v - actual / plan) < 1e-12); assert.equal(s.G2.z, '0.0%');
      assert.equal(s.F3.v, 0); assert.equal(s.C3.v, '');
      assert.deepEqual(states, [true, false]);
    }
  });
  test(`${page}: AD filter exports only its visible group`, async () => {
    const { file } = await run('09', { ad: 'A2' });
    assert.equal(file.sheet['!ref'], 'A1:G2');
    assert.equal(file.sheet.B2.v, 'TEST 2'); assert.equal(file.sheet.A2.v, 1);
  });
  test(`${page}: standalone, non-admin and empty results cannot export; failure resets loading`, async () => {
    for (const options of [{ standalone: true }, { admin: false }, { ad: 'missing' }]) {
      const { file, states } = await run('09', options);
      assert.equal(file, undefined); assert.deepEqual(states, []);
    }
    const result = await run('09', { fail: true });
    assert.equal(result.alerts.length, 1); assert.deepEqual(result.states, [true, false]);
    assert.match(source, /!standalone && adminAuthed && \([\s\S]*?onClick=\{exportGroupDetailExcel\}/);
  });
}
