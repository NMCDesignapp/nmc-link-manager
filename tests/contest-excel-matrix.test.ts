import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  type BonusTier,
  type ConditionType,
  type Contract,
  calculateNYDPhaseOutcome,
  filterQualifyingActivityContracts,
  getContestMetricLabel,
} from '../src/lib/contest-calculator.ts';
import {
  normalizeContestWorkbook,
  utils as XLSXUtils,
} from '../src/lib/xlsx-contest-wrapper-v2.ts';

const monthOffset = (months: number): string => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
};

const contract = (
  agentCode: string,
  roundValue: number,
  startDate: string,
): Contract => ({
  id: agentCode,
  contractNumber: `HD-${agentCode}`,
  agentCode,
  agentName: agentCode,
  position: 'Tư vấn tài chính',
  ban: 'Ban 1',
  nhom: 'Nhóm 1',
  maNhom: 'N1',
  leaderAgentCode: 'TN1',
  recruiterCode: 'NTD1',
  startDate,
  effectiveDate: new Date().toISOString(),
  issueDate: new Date().toISOString(),
  fyp: roundValue,
  afyp: roundValue,
  pdt10DT: roundValue,
  tinhLuot3tr: roundValue,
  maDaiLyTD: 'NTD1',
  ngayBatDauLamViec: startDate,
});

const activityContracts = [
  contract('NEW-3M', 3_000_000, monthOffset(-2)),
  contract('NEW-12M', 12_000_000, monthOffset(-6)),
  contract('OLD-12M', 12_000_000, monthOffset(-13)),
  contract('ZERO-HIGH-IP', 0, monthOffset(-1)),
];
const structureDates = new Map(activityContracts.map(item => [item.agentCode, item.startDate]));

test('ma trận nhãn Excel khớp toàn bộ điều kiện thi đua', () => {
  const expected = new Map<ConditionType, string>([
    ['per_contract_ip', 'IP/HĐ'],
    ['per_contract_afyp', 'AFYP/HĐ'],
    ['total_ip', 'Tổng IP'],
    ['total_afyp', 'Tổng AFYP'],
    ['activity_round', 'Lượt HĐ'],
    ['activity_round_tvvm', 'Lượt TVVm HĐ'],
    ['activity_round_standard', 'Lượt HĐ Chuẩn'],
    ['activity_round_standard_tvvm', 'Lượt TVVm HĐC'],
    ['activity_round_tvv90', 'Lượt TVV90'],
    ['tvv_pass_count', 'TVV đạt CTĐK'],
    ['pass_count_ip_afyp', 'Đếm TVV đạt IP+AFYP'],
    ['top_n_ip', 'Tổng IP'],
  ]);

  for (const [conditionType, label] of expected) {
    assert.equal(getContestMetricLabel(conditionType), label, conditionType);
  }
  assert.equal(getContestMetricLabel('top_n_ip', 'afyp'), 'Tổng AFYP');
  assert.equal(getContestMetricLabel('per_contract_ip', 'ip', 'nhom'), 'Tổng IP');
  assert.equal(getContestMetricLabel('per_contract_afyp', 'ip', 'nhom'), 'Tổng AFYP');
  assert.equal(getContestMetricLabel('per_contract_afyp', 'ip', 'nyd'), 'Tổng AFYP');
});

test('mọi bề mặt kết quả dùng hợp đồng IP làm căn cứ thưởng, không dùng nhầm chỉ tiêu xét', () => {
  const livePage = readFileSync(new URL('../src/app/thi-dua-chau/page.tsx', import.meta.url), 'utf8');
  const savedPage = readFileSync(new URL('../src/components/saved-contest-inline.tsx', import.meta.url), 'utf8');

  assert.match(livePage, /formatBonusAmountFromContracts/);
  assert.match(savedPage, /formatBonusAmountFromContracts/);
  assert.match(livePage, /return \{ c, cValue, tier, effectiveTier, sc, agentContracts \};/);
  assert.match(livePage, /map\(\(\{ c, cValue, tier, effectiveTier, sc, agentContracts \}, idx\) =>/);
  assert.match(livePage, /return \{ contract, cValue, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier, agentContracts \};/);
  assert.match(livePage, /visiblePerContractResultRows\.map\(\(\{ contract, cValue, tier, remaining, phaseInfo, secondaryCheck, secondaryPassed, effectiveTier, agentContracts \}, idx\) =>/);
  assert.doesNotMatch(livePage, /formatBonusAmount\(effectiveTier,\s*(?:value|groupMetricValue|0,\s*tvvPassCount)/);
  assert.doesNotMatch(livePage, /formatBonus\(tier,\s*value/);
  assert.doesNotMatch(savedPage, /formatBonusAmount\(row\.effectiveTier,\s*row\.value/);
  assert.doesNotMatch(savedPage, /computeBonusFromTier\(p[12]Res\.tier,\s*p[12]Value/);
});

test('popup thi đua giữ menu tối và bảng kết quả nêu rõ mọi ngưỡng điều kiện', () => {
  const livePage = readFileSync(new URL('../src/app/thi-dua-chau/page.tsx', import.meta.url), 'utf8');
  const savedPage = readFileSync(new URL('../src/components/saved-contest-inline.tsx', import.meta.url), 'utf8');

  assert.match(livePage, /style=\{\{ colorScheme: 'dark' \}\}/);
  assert.match(livePage, /className="bg-slate-950 text-white"/);
  assert.match(livePage, /value=\{tier\.bonusType\}/);
  assert.match(livePage, /onUpdate\('bonusType', event\.target\.value as BonusType\)/);
  assert.doesNotMatch(livePage, /previous\.map\(tier => \(\{ \.\.\.tier, bonusType: type \}\)\)/);
  assert.match(livePage, /renderSecondaryConditionHeadings/);
  assert.match(livePage, /formatContestConditionProgress/);
  assert.match(savedPage, /renderSupplementaryHeadings/);
  assert.match(savedPage, /formatSecondaryConditionDeficit/);
});

test('tải ảnh kết quả có giới hạn thời gian, phương án dự phòng và luôn dọn trạng thái tạm', () => {
  const livePage = readFileSync(new URL('../src/app/thi-dua-chau/page.tsx', import.meta.url), 'utf8');

  assert.match(livePage, /withContestImageTimeout/);
  assert.match(livePage, /html2canvas\(clone/);
  assert.match(livePage, /captureRoot\.remove\(\)/);
  assert.match(livePage, /restoreAllScrollbars\(\)/);
  assert.match(livePage, /setIsDownloadingImage\(false\)/);
});

test('trang thi đua phân trang bảng lớn và tái sử dụng chỉ mục hợp đồng theo TVV', () => {
  const livePage = readFileSync(new URL('../src/app/thi-dua-chau/page.tsx', import.meta.url), 'utf8');

  assert.match(livePage, /const CONTEST_SOURCE_PAGE_SIZE = 100/);
  assert.match(livePage, /const CONTEST_RESULT_PAGE_SIZE = 100/);
  assert.match(livePage, /const displayContractsByAgent = useMemo/);
  assert.match(livePage, /visiblePerContractResultRows\.map/);
  assert.match(livePage, /visibleTvvTotalRows\.map/);
  assert.match(livePage, /Hiển thị \{resultPageStart \+ 1\}/);
  assert.match(livePage, /rows = perContractDisplayContracts\.map/);
  assert.match(livePage, /rows = tvvTotalRows\.map/);
});

test('chi tiết lượt chỉ giữ dòng thực sự tạo lượt từ TÍNH LƯỢT 3tr', () => {
  const regular = filterQualifyingActivityContracts(
    activityContracts,
    3_000_000,
    'activity_round',
    3,
    12_000_000,
    structureDates,
  );
  assert.deepEqual(regular.map(item => item.agentCode), ['NEW-3M', 'NEW-12M', 'OLD-12M']);

  const standard = filterQualifyingActivityContracts(
    activityContracts,
    12_000_000,
    'activity_round_standard',
    3,
    12_000_000,
    structureDates,
  );
  assert.deepEqual(standard.map(item => item.agentCode), ['NEW-12M', 'OLD-12M']);
});

test('TVVm và TVV90 áp dụng đúng tuổi nghề trước khi đếm lượt', () => {
  const tvvm = filterQualifyingActivityContracts(
    activityContracts,
    12_000_000,
    'activity_round_standard_tvvm',
    3,
    12_000_000,
    structureDates,
  );
  assert.deepEqual(tvvm.map(item => item.agentCode), ['NEW-12M']);

  const tvv90 = filterQualifyingActivityContracts(
    activityContracts,
    3_000_000,
    'activity_round_tvv90',
    3,
    12_000_000,
    structureDates,
  );
  assert.deepEqual(tvv90.map(item => item.agentCode), ['NEW-3M']);
});

test('NTD theo lượt dùng số lượt để xét mức nhưng dùng toàn bộ IP để tính thưởng', () => {
  const qualifying = contract('TVV-DAT', 12_000_000, monthOffset(-2));
  const nonQualifying = contract('TVV-CHUA-DAT', 6_000_000, monthOffset(-2));
  const percentTier: BonusTier = {
    id: 'percent',
    minFYP: 1,
    maxFYP: null,
    bonusAmount: 0,
    bonusType: 'percent',
    bonusText: '',
    bonusPercent: 10,
  };
  const outcome = calculateNYDPhaseOutcome(
    [qualifying, nonQualifying],
    'NTD1',
    [percentTier],
    'activity_round_standard',
    false,
    12_000_000,
    3,
    12_000_000,
    new Map([
      [qualifying.agentCode, qualifying.startDate],
      [nonQualifying.agentCode, nonQualifying.startDate],
    ]),
  );

  assert.equal(outcome.value, 1);
  assert.equal(outcome.baseIP, 18_000_000);
  assert.equal(outcome.bonus, 1_800_000);

  const giftOutcome = calculateNYDPhaseOutcome(
    [qualifying],
    'NTD1',
    [{ ...percentTier, id: 'gift', bonusType: 'gift', bonusText: 'Quà tặng' }],
    'activity_round_standard',
    false,
    12_000_000,
    3,
    12_000_000,
    new Map([[qualifying.agentCode, qualifying.startDate]]),
  );
  assert.ok(giftOutcome.tier);
  assert.equal(giftOutcome.bonus, 0);
});

test('chuẩn hóa workbook không nhân đôi cột ngày bắt đầu TVVm', () => {
  const resultRows = [
    ['STT', 'Nhóm', 'Mã ĐL', 'Họ tên NTD', 'Chức vụ', 'Lượt TVVm HĐC', 'Họ tên TVV', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'Thưởng'],
    [1, 'Nhóm 1', 'NTD1', 'NTD Một', 'TTN', 1, 'TVV Mới', '01/08/2026', 'HD-1', 500_000],
  ];
  const detailRows = [
    ['STT', 'Tên', 'Ngày bắt đầu làm việc', 'Số hợp đồng', 'TÍNH LƯỢT 3 tr'],
    [1, 'TVV Mới', '01/08/2026', 'HD-1', 12_000_000],
  ];
  const workbook = XLSXUtils.book_new();
  XLSXUtils.book_append_sheet(workbook, XLSXUtils.aoa_to_sheet(resultRows), 'Kết quả thi đua');
  XLSXUtils.book_append_sheet(workbook, XLSXUtils.aoa_to_sheet(detailRows), 'Chi tiết HĐ');

  normalizeContestWorkbook(workbook);

  const matrix = XLSXUtils.sheet_to_json(workbook.Sheets['Kết quả thi đua'], {
    header: 1,
    raw: true,
  }) as unknown[][];
  const dateHeaders = matrix[0].filter(value => value === 'Ngày bắt đầu làm việc');
  assert.equal(dateHeaders.length, 1);
  assert.equal(matrix[1][7], '01/08/2026');
  assert.equal(workbook.Sheets['Kết quả thi đua']['!rows']![0].hpt, 32);
});

test('bảng kết quả Nhóm và TTN có lưới rõ, mọi ô đều căn giữa', () => {
  const cases = [
    {
      headers: ['Họ tên NTD', 'Ngày hiệu lực chức vụ NTD', 'Chức vụ', 'Tổng IP', 'Họ tên TVV'],
      rows: [
        ['NTD Một', '01/04/2026', 'Tiền trưởng nhóm', 20_000_000, 'TVV Một'],
        ['', '', '', '', 'TVV Hai'],
      ],
      merges: [{ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }],
    },
    {
      headers: ['Mã TTN', 'Tên TTN', 'Chức vụ', 'Tổng IP', 'Họ tên TVV'],
      rows: [
        ['TTN01', 'TTN Một', 'Trưởng nhóm', 30_000_000, 'TVV Một'],
        ['', '', '', '', 'TVV Hai'],
      ],
      merges: [{ s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }],
    },
  ];

  for (const item of cases) {
    const workbook = XLSXUtils.book_new();
    const sheet = XLSXUtils.aoa_to_sheet([item.headers, ...item.rows]);
    sheet['!merges'] = item.merges;
    XLSXUtils.book_append_sheet(workbook, sheet, 'Kết quả thi đua');

    normalizeContestWorkbook(workbook);

    const result = workbook.Sheets['Kết quả thi đua'];
    for (const address of ['A2', 'A3', 'B2', 'E3']) {
      assert.equal(result[address]?.s?.alignment?.horizontal, 'center', `${item.headers[0]} ${address}`);
      assert.equal(result[address]?.s?.border?.bottom?.style, 'thin', `${item.headers[0]} ${address}`);
      assert.equal(result[address]?.s?.border?.bottom?.color?.rgb, '9AAEC1', `${item.headers[0]} ${address}`);
    }
  }
});

test('ánh xạ ngày bắt đầu giữ Đ/D riêng và bỏ qua tên trùng mơ hồ', () => {
  const workbook = XLSXUtils.book_new();
  XLSXUtils.book_append_sheet(workbook, XLSXUtils.aoa_to_sheet([
    ['STT', 'Lượt TVVm HĐC', 'Họ tên TVV', 'Số hợp đồng'],
    [1, 1, 'Nguyễn Đạt', ''],
    [2, 1, 'Nguyen Dat', ''],
    [3, 1, 'Lê An', ''],
  ]), 'Kết quả thi đua');
  XLSXUtils.book_append_sheet(workbook, XLSXUtils.aoa_to_sheet([
    ['Tên', 'Ngày bắt đầu làm việc', 'Số hợp đồng'],
    ['Nguyễn Đạt', '01/01/2026', ''],
    ['Nguyen Dat', '02/01/2026', ''],
    ['Lê An', '03/01/2026', ''],
    ['Le An', '04/01/2026', ''],
  ]), 'Chi tiết HĐ');

  normalizeContestWorkbook(workbook);
  const matrix = XLSXUtils.sheet_to_json(workbook.Sheets['Kết quả thi đua'], {
    header: 1,
    raw: true,
  }) as unknown[][];

  const startDateByName = new Map(matrix.slice(1).map(row => [row[2], row[3]]));
  assert.equal(startDateByName.get('Nguyễn Đạt'), '01/01/2026');
  assert.equal(startDateByName.get('Nguyen Dat'), '02/01/2026');
  assert.equal(startDateByName.get('Lê An'), '');
});
