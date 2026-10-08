import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRecruitmentContestRows } from '../src/lib/contest-calculator.ts';

const recruiters = [
  { id: 'r1', nhom: 'A', agentCode: 'TTN1', agentName: 'TTN Một', position: 'Tiền trưởng nhóm', startDate: null, ngayHieuLuc: '2026-10-05' },
  { id: 'r2', nhom: 'B', agentCode: 'TN1', agentName: 'TN Một', position: 'Trưởng nhóm', startDate: null, ngayHieuLuc: '2026-09-01' },
];
const tvvStructList = [
  { id: '1', agentCode: 'A1', agentName: 'A Một', maBanNhom: 'A', chucVu: 'TVV', ngayBatDau: '2026-10-10', maTVVTuyendung: 'TTN1', ghiChu: '' },
  { id: '2', agentCode: 'A2', agentName: 'A Hai', maBanNhom: 'A', chucVu: 'TVV', ngayBatDau: '2026-10-11', maTVVTuyendung: 'TTN1', ghiChu: 'x' },
  { id: '3', agentCode: 'B1', agentName: 'B Một', maBanNhom: 'B', chucVu: 'TVV', ngayBatDau: '2026-10-12', maTVVTuyendung: 'TN1', ghiChu: '' },
];
const contracts = [
  { id: 'c1', contractNumber: '1', agentCode: 'A1', agentName: 'A Một', position: 'TVV', ban: '', nhom: 'A', maNhom: 'A', leaderAgentCode: '', recruiterCode: 'TTN1', startDate: null, effectiveDate: '2026-10-15', issueDate: '2026-10-15', fyp: 0, afyp: 0, pdt10DT: 6_000_000, tinhLuot3tr: 0, maDaiLyTD: 'TTN1', ngayBatDauLamViec: '2026-10-10' },
];
const bonusTiers = [{ id: 't1', minFYP: 1, maxFYP: null, bonusAmount: 500_000, bonusType: 'money_per_tvv' as const, bonusText: '', bonusPercent: 0 }];

test('counts eligible recruits, excludes Ghi chú x, scopes recruiters and adds activity bonus', () => {
  const rows = computeRecruitmentContestRows({
    startDate: '2026-10-01', endDate: '2026-10-31', recruiters, tvvStructList, contracts, bonusTiers,
    config: { subjectScope: 'ttn', filterByEffectiveDate: true, activityEnabled: true, activityMetric: 'total_ip', activityComparator: 'gte', activityThreshold: 5_000_000, activityBonusAmount: 200_000 },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].recruitCount, 1);
  assert.equal(rows[0].activityQualifiedCount, 1);
  assert.equal(rows[0].baseBonus, 500_000);
  assert.equal(rows[0].totalBonus, 700_000);
});
