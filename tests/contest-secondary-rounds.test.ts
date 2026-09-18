import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNYDResultRows,
  computeNYDData,
  computeContestStats,
  doesTVVPassReferenceContest,
  evaluateSecondaryConditions,
  filterByEffectiveDateRule,
  getGroupTVVPassCountForReference,
  type BonusTier,
  type ContestConfig,
  type Contract,
  type NYDData,
  type TVVStructMember,
} from '../src/lib/contest-calculator.ts';

const tier: BonusTier = {
  id: 'tier-1',
  minFYP: 50_000_000,
  maxFYP: null,
  bonusAmount: 1_000_000,
  bonusType: 'money',
  bonusText: '',
  bonusPercent: 0,
};

const makeContract = (agentCode: string, recruiterCode: string, ip: number): Contract => ({
  id: `${recruiterCode}-${agentCode}`,
  contractNumber: `${recruiterCode}-${agentCode}`,
  agentCode,
  agentName: agentCode,
  position: 'TVV',
  ban: '',
  nhom: 'N1',
  maNhom: 'N1',
  leaderAgentCode: '',
  recruiterCode,
  startDate: '2026-01-01',
  effectiveDate: '2026-08-01',
  issueDate: '2026-08-01',
  fyp: ip,
  afyp: ip,
  pdt10DT: ip,
  tinhLuot3tr: ip,
  maDaiLyTD: recruiterCode,
  ngayBatDauLamViec: '2026-01-01',
});

const structure = (code: string, recruiterCode: string): TVVStructMember => ({
  id: code,
  agentCode: code,
  agentName: code,
  maBanNhom: 'N1',
  chucVu: 'TVV',
  ngayBatDau: '2026-01-01',
  maTVVTuyendung: recruiterCode,
});

const config = {
  id: 'contest',
  title: 'TTN tuyển dụng',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  conditionType: 'total_ip',
  targetType: 'nyd',
  bonusTiers: [tier],
  participants: [],
  bonusTiers2: [],
  useSecondaryCondition: true,
  secondaryLuotHDCMin: 3,
  secondaryLuotHDCFilter: 'tvvm',
  includeIndividualNTD: false,
  luotHDThreshold: 3_000_000,
  luotHDCTThreshold: 12_000_000,
  tvv90MaxMonths: 3,
  tvv90MinIP: 12_000_000,
} as ContestConfig;

test('tổng IP và lượt HĐC là hai phép tính độc lập trên cùng TTN', () => {
  const contracts = [
    makeContract('TVV-1', 'TTN-A', 30_000_000),
    makeContract('TVV-2', 'TTN-A', 10_000_000),
    makeContract('TVV-3', 'TTN-A', 30_000_000),
  ];
  const tvvStructList = [
    structure('TVV-1', 'TTN-A'),
    structure('TVV-2', 'TTN-A'),
    structure('TVV-3', 'TTN-A'),
  ];

  const result = evaluateSecondaryConditions(contracts, config, tvvStructList);

  assert.equal(result.totalIP, 70_000_000);
  assert.equal(result.luotHDC, 2);
  assert.equal(result.passed, false);
});

test('không lấy TVVm của TTN khác để bù lượt HĐC', () => {
  const contractsA = [
    makeContract('TVV-1', 'TTN-A', 30_000_000),
    makeContract('TVV-2', 'TTN-A', 10_000_000),
    makeContract('TVV-3', 'TTN-A', 30_000_000),
  ];
  const foreignContract = makeContract('TVV-B', 'TTN-B', 20_000_000);
  const allContracts = [...contractsA, foreignContract];
  const tvvStructList = [
    structure('TVV-1', 'TTN-A'),
    structure('TVV-2', 'TTN-A'),
    structure('TVV-3', 'TTN-A'),
    structure('TVV-B', 'TTN-B'),
  ];
  const nydData: NYDData[] = [{
    nydCode: 'TTN-A',
    nydName: 'TTN A',
    nhom: 'N1',
    position: 'TTN',
    startDate: '2026-01-01',
    recruitCount: 3,
    recruitFYP: 70_000_000,
    ownFYP: 0,
    ownActivityRounds: 0,
    contracts: allContracts,
  }];

  const [row] = computeNYDResultRows(nydData, config, tvvStructList);

  assert.equal(row.value, 70_000_000);
  assert.equal(row.secondaryCheck.totalIP, 70_000_000);
  assert.equal(row.secondaryCheck.luotHDC, 2);
  assert.equal(row.tier?.id, 'tier-1');
  assert.equal(row.effectiveTier, null);
});

test('TTN đạt khi cùng dữ liệu có yêu cầu 2 lượt HĐC', () => {
  const passingConfig = { ...config, secondaryLuotHDCMin: 2 };
  const contracts = [
    makeContract('TVV-1', 'TTN-A', 30_000_000),
    makeContract('TVV-2', 'TTN-A', 10_000_000),
    makeContract('TVV-3', 'TTN-A', 30_000_000),
  ];
  const result = evaluateSecondaryConditions(
    contracts,
    passingConfig,
    contracts.map((contract) => structure(contract.agentCode, 'TTN-A')),
  );

  assert.equal(result.passed, true);
});

test('chương trình tham chiếu dùng cùng điều kiện Tổng IP và lượt HĐC', () => {
  const contracts = [
    makeContract('TVV-1', 'TTN-A', 30_000_000),
    makeContract('TVV-2', 'TTN-A', 10_000_000),
    makeContract('TVV-3', 'TTN-A', 30_000_000),
  ];
  const tvvStructList = contracts.map((contract) => structure(contract.agentCode, 'TTN-A'));
  const rawReferenceContest = {
    ...config,
    targetType: 'tvv',
    bonusTiers: JSON.stringify([tier]),
    participants: JSON.stringify([]),
    bonusTiers2: JSON.stringify([]),
  };

  assert.equal(
    doesTVVPassReferenceContest('TVV-1', rawReferenceContest, contracts, [], [], tvvStructList),
    false,
    'TVV-1 chỉ có 1 lượt HĐC nên không đạt điều kiện bổ sung 3 lượt',
  );

  const oneAgentContracts = [
    makeContract('TVV-1', 'TTN-A', 30_000_000),
    { ...makeContract('TVV-1', 'TTN-A', 10_000_000), id: 'TVV-1-b' },
    { ...makeContract('TVV-1', 'TTN-A', 30_000_000), id: 'TVV-1-c' },
  ];
  assert.equal(
    doesTVVPassReferenceContest('TVV-1', rawReferenceContest, oneAgentContracts, [], [], [structure('TVV-1', 'TTN-A')]),
    false,
    'Tổng IP đạt nhưng chỉ 2 trong 3 dòng đạt chuẩn 12 triệu',
  );
});

test('đếm TVV đạt theo nhóm ưu tiên đúng danh sách TVV Cấu trúc', () => {
  const contracts = [
    makeContract('TVV-1', 'TTN-A', 60_000_000),
    makeContract('TVV-NGOAI', 'TTN-A', 60_000_000),
  ];
  const reference = {
    ...config,
    targetType: 'tvv',
    useSecondaryCondition: false,
    bonusTiers: JSON.stringify([tier]),
    participants: JSON.stringify([]),
    bonusTiers2: JSON.stringify([]),
  };
  const group = {
    maNhom: 'N1', nhom: 'Nhóm 1', leader: null,
    totalFYP: 120_000_000, totalAFYP: 120_000_000,
    contractCount: 2, activityRounds: 2, contracts, memberCount: 1,
  };

  assert.equal(getGroupTVVPassCountForReference(
    group,
    reference,
    contracts,
    [],
    [],
    [structure('TVV-1', 'TTN-A')],
  ), 1);
});

test('Sao Việt cộng đúng thưởng NTD của hai giai đoạn', () => {
  const contracts = [
    { ...makeContract('TVV-1', 'TTN-A', 30_000_000), effectiveDate: '2026-06-15' },
    { ...makeContract('TVV-2', 'TTN-A', 30_000_000), effectiveDate: '2026-08-15' },
  ];
  const phaseConfig = {
    ...config,
    useSecondaryCondition: false,
    usePhase2: true,
    phase2StartDate: '2026-07-01',
    bonusTiers: [{ ...tier, minFYP: 20_000_000, bonusAmount: 1_000_000 }],
    bonusTiers2: [{ ...tier, id: 'tier-2', minFYP: 20_000_000, bonusAmount: 2_000_000 }],
  } as ContestConfig;
  const recruiters = [{
    id: 'TTN-A', agentCode: 'TTN-A', agentName: 'TTN A', nhom: 'N1',
    position: 'TTN', startDate: '2025-01-01',
  }];
  const tvvStructList = contracts.map(contract => structure(contract.agentCode, 'TTN-A'));
  const nydData = computeNYDData(contracts, phaseConfig, recruiters, [], tvvStructList);
  const rows = computeNYDResultRows(nydData, phaseConfig, tvvStructList);
  const stats = computeContestStats(contracts, [], [], [], phaseConfig, rows, tvvStructList);

  assert.equal(stats.achievedCount, 1);
  assert.equal(stats.totalBonus, 3_000_000);
});

test('Tổng IP NTD chỉ cộng TVVm do chính NTD tuyển khi chọn phạm vi TVVm', () => {
  const contracts = [
    makeContract('TVVM-MOI', 'TTN-A', 30_000_000),
    makeContract('TVV-CU', 'TTN-A', 40_000_000),
    makeContract('TVVM-KHAC', 'TTN-B', 50_000_000),
  ];
  const scopedConfig = {
    ...config,
    recruitedAgentScope: 'tvvm',
    useSecondaryCondition: false,
  } as ContestConfig;
  const recruiters = [{
    id: 'TTN-A', agentCode: 'TTN-A', agentName: 'TTN A', nhom: 'N1',
    position: 'TTN', startDate: '2025-01-01',
  }];
  const tvvStructList = [
    structure('TVVM-MOI', 'TTN-A'),
    { ...structure('TVV-CU', 'TTN-A'), ngayBatDau: '2024-01-01' },
    structure('TVVM-KHAC', 'TTN-B'),
  ];

  const [nyd] = computeNYDData(contracts, scopedConfig, recruiters, [], tvvStructList);
  const [row] = computeNYDResultRows([nyd], scopedConfig, tvvStructList);

  assert.equal(nyd.recruitFYP, 30_000_000);
  assert.deepEqual(nyd.contracts.filter(c => c.maDaiLyTD === 'TTN-A').map(c => c.agentCode), ['TVVM-MOI']);
  assert.equal(row.value, 30_000_000);
  assert.equal(row.secondaryCheck.totalIP, 30_000_000);
});

test('TVV bắt đầu đúng ngày hiệu lực chức vụ vẫn được tính', () => {
  const contract = makeContract('TVVM-MOI', 'TTN-A', 12_000_000);
  const filtered = filterByEffectiveDateRule(
    [contract],
    [{
      id: 'TTN-A', agentCode: 'TTN-A', agentName: 'TTN A', nhom: 'N1',
      position: 'TTN', startDate: '2025-01-01', ngayHieuLuc: '2026-01-01',
    }],
    [{ ...structure('TVVM-MOI', 'TTN-A'), ngayBatDau: '2026-01-01' }],
  );

  assert.equal(filtered.length, 1);
});
