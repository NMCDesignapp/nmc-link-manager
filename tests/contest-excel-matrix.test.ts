import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type ConditionType,
  type Contract,
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
