import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hub = readFileSync('data-hub/index.mjs', 'utf8');
const kpi = readFileSync('src/app/kpi/page.tsx', 'utf8');
const standalone = readFileSync('kpi-app/src/app/page.tsx', 'utf8');
const management = readFileSync('src/app/quan-ly/page.tsx', 'utf8');
const sync = readFileSync('src/app/api/sync/route.ts', 'utf8');

function getFunction(source: string, name: string, endMarker: string) {
  const from = source.indexOf(`function ${name}(`);
  assert.ok(from >= 0, `Missing function ${name}`);
  const to = source.indexOf(endMarker, from);
  assert.ok(to > from, `Missing end of function ${name}`);
  return source.slice(from, to);
}

test('Sheet 4 giữ mọi dòng không trống, không yêu cầu Mã ĐL hoặc ngày hợp đồng', () => {
  const functionSource = getFunction(hub, 'revenueWorksheetValues', '\nfunction csvFromWorkbook');
  const fn = new Function('compactWorksheetValues', 'findHeaderIndex', `${functionSource}\nreturn revenueWorksheetValues;`)(
    (sheet: any) => sheet.rows,
    (headers: string[], names: string[]) => headers.findIndex(value => names.includes(value)),
  ) as (sheet: any, options: any) => any[][];
  const data = {
    rows: [
      ['Mã ĐL', 'Số hợp đồng', 'Ngày hiệu lực', 'AFYP'],
      ['A1', 'HD1', '15/09/2026', 12_000_000],
      ['', 'HD2', '', 9_000_000],
      ['', '', '', 5_000_000],
    ],
  };
  const rows = fn(data, { allNonEmptyRows: true });
  assert.equal(rows.length, 4);
  assert.equal(rows[2][1], 'HD2');
  assert.equal(rows[3][3], 5_000_000);
});

test('Doanhso Sheet 1/9/11 lấy đúng tháng theo số Sheet, bỏ Sheet 10 hiện tại do Tamthu sở hữu', () => {
  const functionSource = getFunction(hub, 'historicalRevenueFromWorkbook', '\nfunction rowsFromWorkbook');
  const sheet = (contract: string, issueDate: string) => ({
    rows: [['Số hợp đồng', 'Ngày phát hành', 'AFYP'], [contract, issueDate, 10_000_000]],
  });
  const workbook = { SheetNames: ['1', '9', '10', '11'], Sheets: {
    '1': sheet('JAN', '15/08/2026'),
    '9': sheet('SEP', ''),
    '10': sheet('OCT-OTHER', '15/10/2026'),
    '11': sheet('NOV', '15/01/2026'),
  } };
  const XLSX = { utils: {
    aoa_to_sheet: (rows: any[][]) => rows,
    sheet_to_csv: (rows: any[][]) => rows.map(row => row.map(cell => JSON.stringify(cell ?? '')).join(',')).join('\n'),
  } };
  const fn = new Function('readWorkbook', 'bangkokYearMonth', 'revenueWorksheetValues', 'XLSX', 'REVENUE_HISTORY_HEADERS',
    `${functionSource}\nreturn historicalRevenueFromWorkbook;`)(
      () => workbook, () => '2026-10', (item: any) => item.rows, XLSX, ['Số hợp đồng', 'Ngày phát hành', 'AFYP'],
    ) as (file: string) => { csv: string; months: string[] };
  const result = fn('Doanhso.xlsx');
  assert.deepEqual(result.months, ['2026-01', '2026-09', '2026-11']);
  assert.match(result.csv, /NMC_DOANHSO:2026-01/);
  assert.match(result.csv, /NMC_DOANHSO:2026-09/);
  assert.match(result.csv, /NMC_DOANHSO:2026-11/);
  assert.doesNotMatch(result.csv, /OCT-OTHER/);
  assert.match(result.csv, /SEP/); // Ngày phát hành trống vẫn được nhập.
});

for (const [label, source] of [['KPI Main App', kpi], ['KPI tách', standalone], ['Quản lý', management]] as const) {
  test(`${label}: nhãn nguồn Sheet quyết định tháng thay vì ngày PH/HL`, () => {
    const from = source.indexOf('function getDoanhSoMonth(');
    assert.ok(from >= 0);
    const bodyFrom = source.indexOf(' {\n', from) + 3;
    const bodyTo = source.indexOf('\n}\n', bodyFrom);
    assert.ok(bodyTo > bodyFrom);
    const fn = new Function('c', source.slice(bodyFrom, bodyTo)) as (row: any) => Date;
    const current = fn({ nguonDuLieu: 'NMC_TAMTHU:2026-10', issueDate: '2026-09-20', effectiveDate: '2026-01-01' });
    assert.equal(current.getFullYear(), 2026);
    assert.equal(current.getMonth() + 1, 10);
    const historic = fn({ nguonDuLieu: 'NMC_DOANHSO:2026-08', issueDate: '2026-10-10', effectiveDate: null });
    assert.equal(historic.getMonth() + 1, 8);
    const noDate = fn({ nguonDuLieu: 'NMC_DOANHSO:2026-01', issueDate: null, effectiveDate: null });
    assert.equal(noDate.getMonth() + 1, 1);
  });
}

test('Tổng Công ty cộng AFYP mỗi hàng một lần và import tháng bằng transaction', () => {
  assert.match(kpi, /const totalAFYP = periodContracts\.reduce\(\(sum, c\) => sum \+ num\(c\.afyp\), 0\)/);
  assert.match(standalone, /const totalAFYP = periodContracts\.reduce\(\(sum, c\) => sum \+ num\(c\.afyp\), 0\)/);
  assert.match(sync, /await db\.\$transaction\(async tx =>/);
  assert.match(sync, /if \(!authoritativeReplacement && !agentCode\) return;/);
  assert.match(sync, /revenueSourceMonth\(getVal\(row, 'Nguồn dữ liệu'/);
});
