import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeNYDResultRows,
  computeNYDData,
  computeContestStats,
  computeBonusFromContracts,
  computeBonusFromTier,
  calculateActivityRoundBonusWithTiers,
  calculateBonusWithTiers,
  doesTVVPassReferenceContest,
  getReferenceContestPassingAgentCodes,
  computeTVVTotalRows,
  computeTVVPerContractRows,
  evaluateSecondaryConditions,
  filterByEffectiveDateRule,
  getGroupTVVPassCountForReference,
  usesPerContractIPPercentReward,
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

test('thưởng % IP và % Tổng IP độc lập với chỉ tiêu xét AFYP', () => {
  const percentIP: BonusTier = { ...tier, bonusType: 'percent', bonusPercent: 10 };
  const percentTotalIP: BonusTier = { ...tier, bonusType: 'percent_total_ip', bonusPercent: 10 };
  const percentFYC: BonusTier = { ...tier, bonusType: 'percent_fyc', bonusPercent: 10 };

  assert.equal(computeBonusFromTier(percentIP, 30_000_000, undefined, 70_000_000), 3_000_000);
  assert.equal(computeBonusFromTier(percentTotalIP, 30_000_000, undefined, 70_000_000), 7_000_000);
  assert.equal(computeBonusFromTier(percentFYC, 30_000_000, undefined, 70_000_000), 750_000);
  assert.equal(usesPerContractIPPercentReward('per_contract_afyp', [percentIP]), true);
  assert.equal(usesPerContractIPPercentReward('per_contract_afyp', [tier]), false);
  assert.equal(usesPerContractIPPercentReward('per_contract_ip', [percentIP]), false);
});

test('mọi loại thưởng phần trăm luôn lấy đúng cột IP của hợp đồng', () => {
  const percentIP: BonusTier = { ...tier, bonusType: 'percent', bonusPercent: 5 };
  const percentTotalIP: BonusTier = { ...tier, bonusType: 'percent_total_ip', bonusPercent: 5 };
  const percentFYC: BonusTier = { ...tier, bonusType: 'percent_fyc', bonusPercent: 5 };
  const contractIP = makeContract('TVV-1', 'TTN-A', 4_000_000);
  const anotherContract = makeContract('TVV-1', 'TTN-A', 6_000_000);
  contractIP.afyp = 40_000_000;
  anotherContract.afyp = 60_000_000;

  assert.equal(computeBonusFromContracts(percentIP, [contractIP], undefined, [contractIP, anotherContract]), 200_000);
  assert.equal(computeBonusFromContracts(percentTotalIP, [contractIP], undefined, [contractIP, anotherContract]), 500_000);
  assert.equal(computeBonusFromContracts(percentFYC, [contractIP], undefined, [contractIP, anotherContract]), 50_000);
});

test('mốc Đến là giới hạn thật và không tự nhận mức thưởng trong khoảng trống', () => {
  const tiers: BonusTier[] = [
    { ...tier, id: '10-20', minFYP: 10, maxFYP: 20 },
    { ...tier, id: '30+', minFYP: 30, maxFYP: null },
  ];

  assert.equal(calculateBonusWithTiers(20, tiers).tier?.id, '10-20');
  assert.equal(calculateBonusWithTiers(25, tiers).tier, null);
  assert.equal(calculateBonusWithTiers(30, tiers).tier?.id, '30+');
  assert.equal(calculateActivityRoundBonusWithTiers(25, tiers).tier, null);
});

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

test('Tổng IP 45 triệu kết hợp ít nhất 2 HĐ riêng biệt có IP từ 12 triệu', () => {
  const options = {
    useSecondaryCondition: true,
    secondaryTotalIPMin: 45_000_000,
    secondaryContractCountMin: 2,
    secondaryContractIPMin: 12_000_000,
  };
  // IP 22 + 11 + 12 = 45 triệu; chỉ hợp đồng 22 và 12 triệu đạt ngưỡng đếm.
  const passing = [
    makeContract('TVV-1', 'TN-1', 22_000_000),
    makeContract('TVV-2', 'TN-1', 11_000_000),
    makeContract('TVV-3', 'TN-1', 12_000_000),
  ];
  const actual = evaluateSecondaryConditions(passing, options);
  assert.equal(actual.totalIP, 45_000_000);
  assert.equal(actual.qualifyingContractCount, 2);
  assert.equal(actual.passed, true);

  // Cùng tổng IP nhưng chỉ có 1 HĐ từ 12 triệu trở lên: không đạt.
  const insufficientCount = [
    makeContract('TVV-1', 'TN-1', 23_000_000),
    makeContract('TVV-2', 'TN-1', 11_000_000),
    makeContract('TVV-3', 'TN-1', 11_000_000),
  ];
  const failedCount = evaluateSecondaryConditions(insufficientCount, options);
  assert.equal(failedCount.totalIP, 45_000_000);
  assert.equal(failedCount.qualifyingContractCount, 1);
  assert.equal(failedCount.passed, false);

  // Có đủ 2 HĐ đạt ngưỡng, nhưng Tổng IP chỉ 44 triệu: không đạt.
  const insufficientIP = [
    makeContract('TVV-1', 'TN-1', 20_000_000),
    makeContract('TVV-2', 'TN-1', 12_000_000),
    makeContract('TVV-3', 'TN-1', 12_000_000),
  ];
  assert.equal(evaluateSecondaryConditions(insufficientIP, options).passed, false);
});

test('Không đếm trùng số HĐ, và chương trình cũ không bật chỉ tiêu vẫn không bị ảnh hưởng', () => {
  const a = makeContract('TVV-A', 'TN-A', 15_000_000);
  const b = makeContract('TVV-B', 'TN-A', 20_000_000);
  const duplicate = { ...a, id: 'different-database-row' };
  const options = { useSecondaryCondition: true, secondaryContractCountMin: 3, secondaryContractIPMin: 12_000_000 };
  const result = evaluateSecondaryConditions([a, duplicate, b], options);
  assert.equal(result.qualifyingContractCount, 2);
  assert.equal(result.passed, false);
  assert.equal(evaluateSecondaryConditions([a, b], { useSecondaryCondition: false, secondaryContractCountMin: 3, secondaryContractIPMin: 12_000_000 }).passed, true);
  assert.equal(evaluateSecondaryConditions([a, b], { useSecondaryCondition: true }).passed, true);
});

test('đếm TVV tham chiếu hàng loạt khớp kết quả từng TVV, cả IP và chỉ tiêu HĐ độc lập', () => {
  const contracts = [
    { ...makeContract('TVV-1', 'NTD', 22_000_000), id: 'c1', contractNumber: 'HD-1' },
    { ...makeContract('TVV-1', 'NTD', 12_000_000), id: 'c2', contractNumber: 'HD-2' },
    { ...makeContract('TVV-1', 'NTD', 11_000_000), id: 'c3', contractNumber: 'HD-3' },
    { ...makeContract('TVV-2', 'NTD', 30_000_000), id: 'c4', contractNumber: 'HD-4' },
    { ...makeContract('TVV-3', 'NTD', 10_000_000), id: 'c5', contractNumber: 'HD-5' },
  ];
  const members = ['TVV-1', 'TVV-2', 'TVV-3'].map((code) => structure(code, 'NTD'));
  const ref = {
    ...config, targetType: 'tvv', conditionType: 'total_ip',
    bonusTiers: JSON.stringify([{ ...tier, minFYP: 45_000_000 }]),
    bonusTiers2: JSON.stringify([]),
    participants: JSON.stringify([]),
    useSecondaryCondition: true,
    secondaryContractCountMin: 2,
    secondaryContractIPMin: 12_000_000,
    secondaryLuotHDCMin: 0,
    secondaryLuotHDMin: 0,
  };
  const passing = getReferenceContestPassingAgentCodes(ref, contracts, [], [], members);
  assert.deepEqual([...passing], ['TVV-1']);
  for (const code of ['TVV-1', 'TVV-2', 'TVV-3']) {
    assert.equal(passing.has(code), doesTVVPassReferenceContest(code, ref, contracts, [], [], members));
  }
  assert.equal(getReferenceContestPassingAgentCodes(null, contracts, [], [], members).size, 0);
  assert.equal(getReferenceContestPassingAgentCodes({ ...ref, targetType: 'nhom' }, contracts, [], [], members).size, 0);
});

test('đếm TVV tham chiếu từng HĐ không tính trùng TVV; không có dữ liệu không tự đạt', () => {
  const contracts = [
    { ...makeContract('TVV-1', 'NTD', 15_000_000), id: 'a', contractNumber: 'a' },
    { ...makeContract('TVV-1', 'NTD', 20_000_000), id: 'b', contractNumber: 'b' },
    { ...makeContract('TVV-2', 'NTD', 7_000_000), id: 'c', contractNumber: 'c' },
  ];
  const members = ['TVV-1', 'TVV-2', 'TVV-3'].map(code => structure(code, 'NTD'));
  const ref = {
    ...config, conditionType: 'per_contract_ip', targetType: 'tvv',
    bonusTiers: JSON.stringify([{ ...tier, minFYP: 12_000_000 }]),
    bonusTiers2: JSON.stringify([]),
    participants: JSON.stringify([]),
    useSecondaryCondition: false,
  };
  assert.deepEqual([...getReferenceContestPassingAgentCodes(ref, contracts, [], [], members)], ['TVV-1']);
  assert.equal(getReferenceContestPassingAgentCodes(ref, [], [], [], []).size, 0);
});

test('bộ tính tham chiếu và bảng TVV không quét lại toàn bộ hợp đồng theo từng TVV', () => {
  const manyContracts: Contract[] = [];
  const members: TVVStructMember[] = [];
  for (let i = 0; i < 1200; i++) {
    const code = `TVV-${i}`;
    members.push(structure(code, 'NTD'));
    manyContracts.push({
      ...makeContract(code, 'NTD', 12_000_000),
      id: `hda-${i}`, contractNumber: `hda-${i}`,
    });
    manyContracts.push({
      ...makeContract(code, 'NTD', 13_000_000),
      id: `hdb-${i}`, contractNumber: `hdb-${i}`,
    });
  }
  const ref = {
    ...config, targetType: 'tvv', conditionType: 'total_ip',
    useSecondaryCondition: false,
    bonusTiers: JSON.stringify([{ ...tier, minFYP: 20_000_000 }]),
    bonusTiers2: JSON.stringify([]),
    participants: JSON.stringify([]),
  };
  const start = performance.now();
  const passing = getReferenceContestPassingAgentCodes(ref, manyContracts, [], [], members);
  assert.equal(passing.size, 1200);
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 4500, `Tính 1200 TVV tham chiếu mất ${Math.round(elapsed)}ms; có thể vẫn quét lặp`);
  const rows = computeTVVTotalRows(manyContracts, {
    ...config, targetType: 'tvv', useSecondaryCondition: false,
    bonusTiers: [{ ...tier, minFYP: 20_000_000 }], participants: [],
  }, [], [], members);
  assert.equal(rows.filter(row => Boolean(row.tier)).length, 1200);
  const perContract = computeTVVPerContractRows(manyContracts, {
    ...config, targetType: 'tvv', conditionType: 'per_contract_ip',
    useSecondaryCondition: false,
    bonusTiers: [{ ...tier, minFYP: 12_000_000 }], participants: [],
  }, members);
  assert.equal(perContract.filter(row => Boolean(row.effectiveTier)).length, 2400);
});
