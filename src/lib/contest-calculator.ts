/**
 * contest-calculator.ts — Shared logic for contest (thi đua) result calculation.
 *
 * Extracted from src/app/thi-dua-chau/page.tsx to avoid duplication.
 * Both the Thi Đua page and the SavedContestInline component in Quản Lý use these
 * pure helpers + types so they always agree on how results are computed.
 */

// ===== Types =====
export interface Contract {
  id: string;
  contractNumber: string;
  agentCode: string;
  agentName: string;
  position: string;
  ban: string;
  nhom: string;
  maNhom: string;
  leaderAgentCode: string;
  recruiterCode: string;
  startDate: string | null;
  effectiveDate: string;
  issueDate: string;
  fyp: number;
  afyp: number;
  pdt10DT: number;
  tinhLuot3tr: number;
  maDaiLyTD: string;
  ngayBatDauLamViec: string | null;
  ad?: string;
}

export interface BonusTier {
  id: string;
  minFYP: number;
  maxFYP: number | null;
  bonusAmount: number;
  bonusType: 'money' | 'gift' | 'percent' | 'money_per_round' | 'money_per_tvv' | 'percent_fyc';
  bonusText: string;
  bonusPercent: number;
}

export interface GroupLeader {
  agentCode: string;
  agentName: string;
  position: string;
}

export interface GroupData {
  maNhom: string;
  nhom: string;
  leader: GroupLeader | null;
  totalFYP: number;
  totalAFYP: number;
  contractCount: number;
  activityRounds: number;
  contracts: Contract[];
  memberCount: number;
}

export interface NYDData {
  nydCode: string;
  nydName: string;
  nhom: string;
  position: string;
  startDate: string | null;
  recruitCount: number;
  recruitFYP: number;
  ownFYP: number;
  ownActivityRounds: number;
  contracts: Contract[];
}

export interface StaffMember {
  id: string;
  nhom: string;
  maNhom: string;
  agentCode: string;
  agentName: string;
  position: string;
  startDate: string | null;
}

export interface RecruiterMember {
  id: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  position: string;
  startDate: string | null;
  ngayHieuLuc?: string | null; // Ngày hiệu lực chức vụ gần nhất (mỗi lần thăng/hạ thì ghi đè)
}

// DS TVV (Cấu trúc) — dùng cho filterByEffectiveDate (lookup ngày bắt đầu LV của TVV)
// và cho Top N mode (hiển thị TẤT CẢ TVV tham gia, kể cả k có doanh số)
export interface TVVStructMember {
  id: string;
  agentCode: string;
  agentName: string;
  maBanNhom: string;
  chucVu: string;
  ngayBatDau: string | null; // Ngày bắt đầu làm việc của TVV
  maTVVTuyendung?: string;
  note?: string;
}

export type ConditionType =
  | 'per_contract_ip'
  | 'per_contract_afyp'
  | 'total_ip'
  | 'total_afyp'
  | 'activity_round'
  | 'activity_round_tvvm'
  | 'activity_round_standard'
  | 'activity_round_standard_tvvm'
  | 'activity_round_tvv90'
  | 'tvv_pass_count'
  | 'pass_count_ip_afyp'
  | 'top_n_ip';

export type TargetType = 'tvv' | 'nhom' | 'nyd';

/** Config snapshot extracted from a saved Contest row. */
export interface ContestConfig {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  issueDate?: string | null;
  conditionType: ConditionType;
  targetType: TargetType;
  bonusTiers: BonusTier[];
  posterUrl?: string;
  participants: string[]; // parsed from `participants` JSON
  usePhase2?: boolean;
  phase2StartDate?: string | null;
  phase2EndDate?: string | null;
  bonusTiers2: BonusTier[];
  useSecondaryCondition?: boolean;
  secondaryAFYPMin?: number;
  secondaryIPMin?: number;
  secondaryLuotHDMin?: number;
  secondaryLuotHDCMin?: number;
  secondaryLuotHDFilter?: string;
  secondaryLuotHDCFilter?: string;
  secondaryTotalAFYPMin?: number;
  secondaryTotalIPMin?: number;
  hideNotAchieved?: boolean;
  includeIndividualNTD?: boolean;
  includeIndividualTN?: boolean;
  luotHDThreshold: number;
  luotHDCTThreshold: number;
  tvv90MaxMonths: number;
  tvv90MinIP: number;
  referenceContestId?: string;
  includeTNInPassCount?: boolean;
  topN?: number;
  topNMinIP?: number;
  topNValueType?: 'ip' | 'afyp'; // Loại chỉ tiêu xét Top N: 'ip' (mặc định) hoặc 'afyp'
  filterByEffectiveDate?: boolean; // true: chỉ tính TVV có ngày LV > ngày hiệu lực chức vụ gần nhất của NTD recruiter
}

// ===== Helpers — mode detection =====
export function isActivityRoundMode(ct: ConditionType): boolean {
  return (
    ct === 'activity_round' ||
    ct === 'activity_round_tvvm' ||
    ct === 'activity_round_standard' ||
    ct === 'activity_round_standard_tvvm' ||
    ct === 'activity_round_tvv90'
  );
}
export function isTVVPassCountMode(ct: ConditionType): boolean {
  return ct === 'tvv_pass_count' || ct === 'pass_count_ip_afyp';
}
export function isPerContractMode(ct: ConditionType): boolean {
  return ct === 'per_contract_ip' || ct === 'per_contract_afyp';
}
export function isTotalMode(ct: ConditionType): boolean {
  return ct === 'total_ip' || ct === 'total_afyp';
}
export function isTVVmMode(ct: ConditionType): boolean {
  return ct === 'activity_round_tvvm' || ct === 'activity_round_standard_tvvm';
}
export function isStandardMode(ct: ConditionType): boolean {
  return ct === 'activity_round_standard' || ct === 'activity_round_standard_tvvm';
}
export function isTopNMode(ct: ConditionType): boolean {
  return ct === 'top_n_ip';
}

// ===== Helpers — entity eligibility =====
export function isTVVm(startDate: string | null, maxMonths: number = 12): boolean {
  if (!startDate) return false;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return false;
  const now = new Date();
  if (start.getTime() > now.getTime()) return false;
  const diffMonths =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return diffMonths >= 0 && diffMonths <= maxMonths;
}

const normalizeAgentCode = (value: string | null | undefined) =>
  String(value || '').trim().toUpperCase();

/** Ngày BĐLV chuẩn luôn lấy từ DS TVV Cấu trúc, không suy ra từ dòng hợp đồng. */
export function buildStructureStartDateMap(
  tvvStructList: TVVStructMember[] = []
): Map<string, string | null> {
  const map = new Map<string, string | null>();
  for (const member of tvvStructList) {
    const key = normalizeAgentCode(member.agentCode);
    if (key && !map.has(key)) map.set(key, member.ngayBatDau || null);
  }
  return map;
}

export function isTVV90Agent(
  contracts: Contract[],
  agentCode: string,
  maxMonths: number = 3,
  _minIP?: number,
  structureStartDate?: string | null
): boolean {
  const agentContract = contracts.find((c) => c.agentCode === agentCode);
  const startDate = structureStartDate || agentContract?.ngayBatDauLamViec || agentContract?.startDate;
  if (!startDate) return false;
  return isTVVm(startDate, maxMonths);
}

/** Count rows with tinhLuot3tr >= threshold. Applies TVVm/TVV90 filters per row. */
export function calculateLuot(
  contracts: Contract[],
  luotThreshold: number,
  conditionType: ConditionType,
  tvv90MaxMonths?: number,
  tvv90MinIP?: number,
  structureStartDates?: ReadonlyMap<string, string | null>
): number {
  let count = 0;
  for (const c of contracts) {
    const structureStartDate = structureStartDates?.get(normalizeAgentCode(c.agentCode));
    if (isTVVmMode(conditionType)) {
      const startDate = structureStartDates
        ? structureStartDate || null
        : c.ngayBatDauLamViec || c.startDate;
      if (!isTVVm(startDate)) continue;
    }
    if (conditionType === 'activity_round_tvv90') {
      if (!isTVV90Agent(contracts, c.agentCode, tvv90MaxMonths, tvv90MinIP, structureStartDate)) continue;
    }
    // Không cộng IP/AFYP: ngưỡng được so trực tiếp với giá trị đã xử lý trong TÍNH LƯỢT 3tr.
    // Đếm trực tiếp cột TÍNH LƯỢT 3tr; file nguồn đã khống chế tối đa 1 dòng dương/TVV/tháng.
    if (c.tinhLuot3tr >= luotThreshold) count++;
  }
  return count;
}

// ===== Unicode normalize (NFC vs NFD Vietnamese) =====
export function norm(s: string): string {
  return s.normalize('NFC');
}

function isPAGroup(nhom?: string | null, maNhom?: string | null): boolean {
  const values = [nhom, maNhom]
    .map(value => norm(value || '').toUpperCase().trim())
    .filter(Boolean);
  return values.some(value =>
    value === 'U104101014' ||
    /(^|[\s._\/-])PA(?:$|[\s._\/-]|\d)/.test(value)
  );
}

// ===== Bonus computation =====
export function computeBonusFromTier(
  tier: BonusTier,
  fyp: number,
  rounds?: number
): number {
  if (tier.bonusType === 'percent') return (tier.bonusPercent / 100) * fyp;
  if (tier.bonusType === 'percent_fyc')
    return (tier.bonusPercent / 100) * (fyp * 0.25);
  if (tier.bonusType === 'money_per_round')
    return tier.bonusAmount * (rounds || 0);
  if (tier.bonusType === 'money_per_tvv')
    return tier.bonusAmount * (rounds || 0);
  return tier.bonusAmount;
}

export function calculateBonusWithTiers(
  fyp: number,
  tiers: BonusTier[]
): { tier: BonusTier | null; tierIndex: number } {
  const sorted = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const tier = sorted[i];
    if (fyp >= tier.minFYP) return { tier, tierIndex: i };
  }
  return { tier: null, tierIndex: -1 };
}

export function getBonusAmountWithTiers(
  fyp: number,
  tiers: BonusTier[],
  rounds?: number
): number {
  const { tier } = calculateBonusWithTiers(fyp, tiers);
  if (!tier) return 0;
  return computeBonusFromTier(tier, fyp, rounds);
}

export function getRemainingToNextTier(
  fyp: number,
  tiers: BonusTier[]
): number | null {
  const sorted = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
  for (const tier of sorted) {
    if (tier.minFYP > fyp) return tier.minFYP - fyp;
  }
  return null;
}

export function calculateActivityRoundBonusWithTiers(
  activityRounds: number,
  tiers: BonusTier[]
): { tier: BonusTier | null; tierIndex: number } {
  const sorted = [...tiers].sort((a, b) => a.minFYP - b.minFYP);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const tier = sorted[i];
    if (activityRounds >= tier.minFYP) return { tier, tierIndex: i };
  }
  return { tier: null, tierIndex: -1 };
}

export function hasPercentBonus(tiers: BonusTier[]): boolean {
  return tiers.some(
    (t) => t.bonusType === 'percent' || t.bonusType === 'percent_fyc'
  );
}

// ===== Formatters =====
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

export function formatBonusAmount(
  tier: BonusTier,
  fyp?: number,
  rounds?: number
): string {
  if (tier.bonusType === 'gift' && tier.bonusText) return tier.bonusText;
  const amount = computeBonusFromTier(tier, fyp || 0, rounds);
  return formatCurrency(amount);
}

export function formatRate(tier: BonusTier): string {
  if (tier.bonusType === 'percent') return `${tier.bonusPercent}%`;
  if (tier.bonusType === 'percent_fyc') return `${tier.bonusPercent}%`;
  return '';
}

// ===== Labels =====
export function getConditionLabel(ct: ConditionType): string {
  switch (ct) {
    case 'per_contract_ip': return 'IP/HĐ';
    case 'per_contract_afyp': return 'AFYP/HĐ';
    case 'total_ip': return 'Tổng IP';
    case 'total_afyp': return 'Tổng AFYP';
    case 'activity_round': return 'Lượt HĐ';
    case 'activity_round_tvvm': return 'Lượt TVVm HĐ';
    case 'activity_round_standard': return 'Lượt HĐ Chuẩn';
    case 'activity_round_standard_tvvm': return 'Lượt TVVm HĐC';
    case 'activity_round_tvv90': return 'Lượt TVV90';
    case 'tvv_pass_count': return 'TVV đạt CTĐK';
    case 'pass_count_ip_afyp': return 'Đếm TVV đạt IP+AFYP';
    case 'top_n_ip': return 'Xét Top N IP';
  }
}

export function getIndividualMetricLabel(ct: ConditionType): string {
  if (isActivityRoundMode(ct)) return `${getConditionLabel(ct)} cá nhân`;
  if (ct === 'total_afyp' || ct === 'per_contract_afyp') return 'AFYP cá nhân';
  return 'IP cá nhân';
}

export function getTargetLabel(tt: TargetType): string {
  switch (tt) {
    case 'tvv': return 'TVV';
    case 'nhom': return 'Nhóm';
    case 'nyd': return 'NTD';
  }
}

// ===== Config parsing =====
/** Parse a raw SavedContest row (from /api/contests) into a ContestConfig object. */
export function parseContestConfig(raw: any): ContestConfig {
  let bonusTiers: BonusTier[] = [];
  try {
    const parsed = JSON.parse(raw.bonusTiers || '[]');
    if (Array.isArray(parsed)) bonusTiers = parsed;
  } catch { /* ignore */ }

  let bonusTiers2: BonusTier[] = [];
  try {
    const parsed = JSON.parse(raw.bonusTiers2 || '[]');
    if (Array.isArray(parsed)) bonusTiers2 = parsed;
  } catch { /* ignore */ }

  let participants: string[] = [];
  try {
    const parsed = JSON.parse(raw.participants || '[]');
    if (Array.isArray(parsed)) participants = parsed;
  } catch { /* ignore */ }

  return {
    id: raw.id,
    title: raw.title || 'Chương trình thi đua',
    startDate: raw.startDate,
    endDate: raw.endDate,
    issueDate: raw.issueDate,
    conditionType: (raw.conditionType || 'per_contract_ip') as ConditionType,
    targetType: (raw.targetType || 'tvv') as TargetType,
    bonusTiers,
    posterUrl: raw.posterUrl || '',
    participants,
    usePhase2: raw.usePhase2 ?? false,
    phase2StartDate: raw.phase2StartDate ?? null,
    phase2EndDate: raw.phase2EndDate ?? null,
    bonusTiers2,
    useSecondaryCondition: raw.useSecondaryCondition ?? false,
    secondaryAFYPMin: raw.secondaryAFYPMin ?? 0,
    secondaryIPMin: raw.secondaryIPMin ?? 0,
    secondaryLuotHDMin: raw.secondaryLuotHDMin ?? 0,
    secondaryLuotHDCMin: raw.secondaryLuotHDCMin ?? 0,
    secondaryLuotHDFilter: raw.secondaryLuotHDFilter ?? 'all',
    secondaryLuotHDCFilter: raw.secondaryLuotHDCFilter ?? 'all',
    secondaryTotalAFYPMin: raw.secondaryTotalAFYPMin ?? 0,
    secondaryTotalIPMin: raw.secondaryTotalIPMin ?? 0,
    hideNotAchieved: raw.hideNotAchieved ?? false,
    includeIndividualNTD: raw.includeIndividualNTD ?? false,
    includeIndividualTN: raw.includeIndividualTN ?? false,
    luotHDThreshold: raw.luotHDThreshold ?? 3_000_000,
    luotHDCTThreshold: raw.luotHDCTThreshold ?? 12_000_000,
    tvv90MaxMonths: raw.tvv90MaxMonths ?? 3,
    tvv90MinIP: raw.tvv90MinIP ?? 12_000_000,
    referenceContestId: raw.referenceContestId || '',
    includeTNInPassCount: raw.includeTNInPassCount ?? false,
    topN: raw.topN ?? 3,
    topNMinIP: raw.topNMinIP ?? 50_000_000,
    topNValueType: raw.topNValueType === 'afyp' ? 'afyp' : 'ip',
    filterByEffectiveDate: raw.filterByEffectiveDate ?? false,
  };
}

// ===== Phase 1: filter contracts by dates + secondary per-contract condition =====
export function filterContractsByContest(
  contracts: Contract[],
  config: ContestConfig
): Contract[] {
  let results = [...contracts];
  if (config.startDate) {
    const start = new Date(config.startDate);
    results = results.filter((c) => new Date(c.effectiveDate) >= start);
  }
  if (config.endDate) {
    const end = new Date(config.endDate);
    end.setHours(23, 59, 59, 999);
    results = results.filter((c) => new Date(c.effectiveDate) <= end);
  }
  if (config.issueDate) {
    const issueStart = new Date(config.issueDate);
    results = results.filter((c) => new Date(c.issueDate) >= issueStart);
  }
  if (config.useSecondaryCondition) {
    if ((config.secondaryAFYPMin ?? 0) > 0)
      results = results.filter((c) => c.afyp >= (config.secondaryAFYPMin ?? 0));
    if ((config.secondaryIPMin ?? 0) > 0)
      results = results.filter((c) => c.pdt10DT >= (config.secondaryIPMin ?? 0));
  }
  results.sort(
    (a, b) =>
      new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
  );
  return results;
}

// ===== Phase 2: filter by target (TVV / Nhóm / NTD) + DSO exclusion =====

/**
 * Filter contracts theo "Ngày hiệu lực chức vụ" của NTD recruiter.
 *
 * Quy tắc (khi config.filterByEffectiveDate === true):
 * - Mỗi contract có TVV (c.agentCode) được tuyển bởi NTD (c.maDaiLyTD).
 * - Lấy ngày bắt đầu LV của TVV từ tvvStructList (TVVStruct.ngayBatDau).
 * - Lấy ngày hiệu lực chức vụ gần nhất của NTD từ recruiterList (Recruiter.ngayHieuLuc).
 * - Chỉ giữ contract nếu: TVV.ngayBatDau > NTD.ngayHieuLuc
 *   (tức là TVV bắt đầu làm việc SAU ngày NTD được bổ nhiệm chức vụ hiện tại).
 * - Nếu TVV không có ngày bắt đầu LV → bỏ qua (không tính, do data thiếu).
 * - Nếu NTD không có ngày hiệu lực chức vụ → vẫn giữ contract (không có ràng buộc để loại).
 *
 * @param tvvStructList DS TVV từ /api/structure/tvv — chứa agentCode + ngayBatDau
 */
export function filterByEffectiveDateRule(
  contracts: Contract[],
  recruiterList: RecruiterMember[],
  tvvStructList: { agentCode: string; ngayBatDau: string | null }[]
): Contract[] {
  // Build map: agentCode → ngayHieuLuc (NTD recruiter)
  const ngayHieuLucMap = new Map<string, number>();
  for (const r of recruiterList) {
    if (r.agentCode && r.ngayHieuLuc) {
      const t = new Date(r.ngayHieuLuc).getTime();
      if (!isNaN(t)) ngayHieuLucMap.set(r.agentCode, t);
    }
  }
  // Build map: agentCode → ngayBatDau (TVV)
  const ngayBatDauMap = new Map<string, number>();
  for (const t of tvvStructList) {
    if (t.agentCode && t.ngayBatDau) {
      const ts = new Date(t.ngayBatDau).getTime();
      if (!isNaN(ts)) ngayBatDauMap.set(t.agentCode, ts);
    }
  }

  return contracts.filter((c) => {
    // Lấy NTD recruiter của contract này
    const recruiterCode = c.maDaiLyTD || '';
    if (!recruiterCode) return true; // Không có recruiter → không có ràng buộc → giữ
    const ngayHieuLucTs = ngayHieuLucMap.get(recruiterCode);
    if (!ngayHieuLucTs) return true; // NTD không có ngày hiệu lực → không có ràng buộc → giữ

    // Lấy ngày bắt đầu LV của TVV (người bán HĐ)
    const tvvCode = c.agentCode || '';
    const ngayBatDauTs = ngayBatDauMap.get(tvvCode);
    if (!ngayBatDauTs) return false; // TVV không có ngày LV → bỏ qua (theo yêu cầu user)

    // Chỉ giữ nếu TVV bắt đầu làm việc SAU ngày NTD được bổ nhiệm chức vụ
    return ngayBatDauTs > ngayHieuLucTs;
  });
}

export function filterDisplayContracts(
  filteredContracts: Contract[],
  config: ContestConfig,
  staffList: StaffMember[],
  recruiterList: RecruiterMember[],
  tvvStructList?: { agentCode: string; ngayBatDau: string | null }[]
): Contract[] {
  const subjectCodes = config.participants;
  const targetType = config.targetType;
  let contractsNoDSO = filteredContracts.filter(
    (c) =>
      !norm(c.nhom || '').toLowerCase().includes('dso') &&
      !norm(c.maNhom || '').toLowerCase().includes('dso')
  );

  // Áp dụng filter "ngày hiệu lực chức vụ" cho NTD và Nhóm (theo yêu cầu user)
  if (config.filterByEffectiveDate && tvvStructList && (targetType === 'nyd' || targetType === 'nhom')) {
    contractsNoDSO = filterByEffectiveDateRule(contractsNoDSO, recruiterList, tvvStructList);
  }

  if (targetType === 'tvv') {
    if (subjectCodes.length === 0) {
      // QUAN TRỌNG (fix user request): Khi không có DS đối tượng → dùng DS TVV
      // từ Cấu trúc Quản lý (tvvStructList) làm nguồn DS đối tượng, KHÔNG dùng
      // DS TVV từ file doanh số (Contracts). Lọc HĐ chỉ giữ lại HĐ của TVV có
      // trong Cấu trúc. Nếu tvvStructList rỗng (chưa load) → fallback cũ.
      if (tvvStructList && tvvStructList.length > 0) {
        const structCodes = new Set<string>();
        for (const t of tvvStructList) {
          if (t.agentCode) structCodes.add(t.agentCode);
        }
        return contractsNoDSO.filter((c) => structCodes.has(c.agentCode));
      }
      return contractsNoDSO;
    }
    return contractsNoDSO.filter(
      (c) =>
        subjectCodes.includes(c.agentCode) ||
        subjectCodes.includes(c.agentName)
    );
  }
  if (targetType === 'nhom') {
    const allowedMaNhom = new Set<string>();
    if (subjectCodes.length > 0) {
      for (const code of subjectCodes) {
        const codeLower = norm(code).toLowerCase();
        if (codeLower.includes('dso')) continue;
        const staff = staffList.find(
          (s) => norm(s.nhom || '').toLowerCase() === codeLower
        );
        if (staff?.maNhom) allowedMaNhom.add(staff.maNhom);
        else allowedMaNhom.add(code);
      }
    } else {
      for (const s of staffList) {
        const nhomLower = norm(s.nhom || '').toLowerCase();
        if (
          s.maNhom &&
          !nhomLower.includes('dso') &&
          !s.maNhom.toLowerCase().includes('dso')
        ) {
          allowedMaNhom.add(s.maNhom);
        }
      }
    }
    return contractsNoDSO.filter(
      (c) =>
        allowedMaNhom.has(c.maNhom) &&
        !norm(c.nhom || '').toLowerCase().includes('dso')
    );
  }
  if (targetType === 'nyd') {
    const ntdNoDSO = recruiterList.filter(
      (r) => !norm(r.nhom || '').toLowerCase().includes('dso')
    );
    if (subjectCodes.length > 0) {
      return contractsNoDSO.filter(
        (c) =>
          subjectCodes.includes(c.agentCode) ||
          subjectCodes.includes(c.agentName) ||
          (c.maDaiLyTD && subjectCodes.includes(c.maDaiLyTD))
      );
    }
    const ntdCodes = new Set(ntdNoDSO.map((r) => r.agentCode));
    return contractsNoDSO.filter(
      (c) => ntdCodes.has(c.agentCode) || ntdCodes.has(c.maDaiLyTD)
    );
  }
  return contractsNoDSO;
}

// ===== Grouped data (for targetType = nhom) =====
export function computeGroupedData(
  displayContracts: Contract[],
  config: ContestConfig,
  staffList: StaffMember[],
  recruiterList: RecruiterMember[],
  leadersList?: any[],
  tvvStructList?: TVVStructMember[]
): GroupData[] {
  if (config.targetType !== 'nhom') return [];
  const subjectCodes = config.participants;
  const conditionType = config.conditionType;
  const structureStartDates = buildStructureStartDateMap(tvvStructList);
  const map = new Map<string, GroupData>();

  // NGUỒN ĐÚNG: DS TB/TN (leadersList) — 30 nhóm, mỗi nhóm có 1 TB hoặc TN
  // Fallback: staffList nếu không có leadersList (backward compat)
  const groupSource = leadersList && leadersList.length > 0 ? leadersList : staffList;

  const allowedMaNhom = new Set<string>();
  if (subjectCodes.length > 0) {
    for (const code of subjectCodes) {
      const codeLower = norm(code).toLowerCase();
      if (codeLower.includes('dso')) continue;
      const found = groupSource.find(
        (s: any) => norm(s.nhom || '').toLowerCase() === codeLower
      );
      if (found?.maNhom) allowedMaNhom.add(found.maNhom);
      else allowedMaNhom.add(code);
    }
  } else {
    for (const s of groupSource) {
      const nhomLower = norm(s.nhom || '').toLowerCase();
      const maNhomLower = (s.maNhom || '').toLowerCase();
      if (s.maNhom && !nhomLower.includes('dso') && !maNhomLower.includes('dso')) {
        allowedMaNhom.add(s.maNhom);
      }
    }
  }

  // Step 1: build groups from DS TB/TN (hoặc staffList fallback)
  for (const s of groupSource) {
    if (!s.maNhom) continue;
    if (map.has(s.maNhom)) continue;
    const nhomLower = norm(s.nhom || '').toLowerCase();
    const maNhomLower = (s.maNhom || '').toLowerCase();
    if (nhomLower.includes('dso') || maNhomLower.includes('dso')) continue;
    if (allowedMaNhom.size > 0 && !allowedMaNhom.has(s.maNhom)) continue;
    map.set(s.maNhom, {
      maNhom: s.maNhom,
      nhom: s.nhom,
      leader: null,
      totalFYP: 0,
      totalAFYP: 0,
      contractCount: 0,
      activityRounds: 0,
      contracts: [],
      memberCount: 0,
    });
  }
  // Add subjectCodes not in groupSource
  if (subjectCodes.length > 0) {
    for (const maNhom of allowedMaNhom) {
      if (!map.has(maNhom)) {
        const found = groupSource.find((s: any) => s.maNhom === maNhom);
        const nhomName = found?.nhom || maNhom;
        map.set(maNhom, {
          maNhom,
          nhom: nhomName,
          leader: null,
          totalFYP: 0,
          totalAFYP: 0,
          contractCount: 0,
          activityRounds: 0,
          contracts: [],
          memberCount: 0,
        });
      }
    }
  }

  // Find leader — từ DS TB/TN (leadersList) hoặc staffList
  for (const [maNhom, g] of map) {
    // Ưu tiên: tìm trực tiếp từ leadersList (mỗi dòng = TB hoặc TN của nhóm)
    const leader = leadersList?.find((l: any) => l.maNhom === maNhom);
    if (leader) {
      g.leader = {
        agentCode: leader.agentCode,
        agentName: leader.agentName,
        position: leader.position,
      };
      continue;
    }
    // Fallback: tìm từ staffList
    const groupStaff = staffList.filter((s) => s.maNhom === maNhom);
    const truongBan = groupStaff.find(
      (s) => norm(s.position || '').toLowerCase().trim() === 'trưởng ban'
    );
    if (truongBan) {
      g.leader = {
        agentCode: truongBan.agentCode,
        agentName: truongBan.agentName,
        position: truongBan.position,
      };
      continue;
    }
    const truongNhom = groupStaff.find(
      (s) => norm(s.position || '').toLowerCase().trim() === 'trưởng nhóm'
    );
    if (truongNhom) {
      g.leader = {
        agentCode: truongNhom.agentCode,
        agentName: truongNhom.agentName,
        position: truongNhom.position,
      };
      continue;
    }
    // Fallback: DS TTN (recruiterList)
    const groupRecruiters = recruiterList.filter(
      (r) => r.nhom === g.nhom || r.nhom === g.maNhom
    );
    const rBan = groupRecruiters.find(
      (r) => norm(r.position || '').toLowerCase().trim() === 'trưởng ban'
    );
    if (rBan) {
      g.leader = {
        agentCode: rBan.agentCode,
        agentName: rBan.agentName,
        position: rBan.position,
      };
      continue;
    }
    const rNhom = groupRecruiters.find(
      (r) => norm(r.position || '').toLowerCase().trim() === 'trưởng nhóm'
    );
    if (rNhom) {
      g.leader = {
        agentCode: rNhom.agentCode,
        agentName: rNhom.agentName,
        position: rNhom.position,
      };
    }
  }

  // Map revenue into groups
  const mapKeyIndex = new Map<string, string>();
  for (const key of map.keys()) mapKeyIndex.set(key.toLowerCase(), key);

  const luotThreshold = isStandardMode(conditionType)
    ? config.luotHDCTThreshold
    : config.luotHDThreshold;
  // Build set of leader agentCodes (TB/TN) để loại trừ khi includeIndividualTN = false
  const leaderCodes = new Set<string>();
  if (!config.includeIndividualTN) {
    for (const [, g] of map) {
      if (g.leader?.agentCode) leaderCodes.add(g.leader.agentCode);
    }
  }
  const contractByNhom = new Map<
    string,
    { totalFYP: number; totalAFYP: number; contractCount: number }
  >();
  for (const c of displayContracts) {
    if (!c.maNhom) continue;
    // Nếu includeIndividualTN = false → bỏ qua HĐ của TB/TN (leader)
    if (!config.includeIndividualTN && leaderCodes.has(c.agentCode)) continue;
    const existing = contractByNhom.get(c.maNhom);
    if (existing) {
      existing.totalFYP += c.pdt10DT;
      existing.totalAFYP += c.afyp;
      existing.contractCount += 1;
    } else {
      contractByNhom.set(c.maNhom, {
        totalFYP: c.pdt10DT,
        totalAFYP: c.afyp,
        contractCount: 1,
      });
    }
  }
  for (const [cNhom, cData] of contractByNhom) {
    const actualKey = map.get(cNhom)
      ? cNhom
      : mapKeyIndex.get(cNhom.toLowerCase());
    const g = actualKey ? map.get(actualKey) : null;
    if (g) {
      g.totalFYP += cData.totalFYP;
      g.totalAFYP += cData.totalAFYP;
      g.contractCount += cData.contractCount;
    }
  }
  for (const [maNhom, g] of map) {
    const groupContracts = displayContracts.filter(
      (c) => {
        if (c.maNhom !== maNhom && (!c.maNhom || c.maNhom.toLowerCase() !== maNhom.toLowerCase())) return false;
        if (!config.includeIndividualTN && leaderCodes.has(c.agentCode)) return false;
        return true;
      }
    );
    g.contracts = groupContracts;
    g.activityRounds = calculateLuot(
      groupContracts,
      luotThreshold,
      conditionType,
      config.tvv90MaxMonths,
      config.tvv90MinIP,
      structureStartDates
    );
  }
  for (const g of Array.from(map.values())) {
    g.memberCount = staffList.filter((s) => s.maNhom === g.maNhom).length;
  }
  return Array.from(map.values());
}

// ===== TVV total rows (for targetType = tvv + total/per-contract modes) =====
export interface TVVTotalRow {
  agent: {
    agentCode: string;
    agentName: string;
    nhom: string;
    maNhom: string;
  };
  value: number;
  tier: BonusTier | null;
  remaining: number | null;
  phaseInfo: {
    phase1Bonus: number;
    phase2Bonus: number;
    phase1Tier: BonusTier | null;
    phase2Tier: BonusTier | null;
  };
}

export function computeTVVTotalRows(
  displayContracts: Contract[],
  config: ContestConfig,
  staffList: StaffMember[],
  recruiterList: RecruiterMember[],
  tvvStructList?: TVVStructMember[],
  priorityAgentCodes?: ReadonlySet<string>
): TVVTotalRow[] {
  if (config.targetType !== 'tvv' || isPerContractMode(config.conditionType)) {
    return [];
  }
  const subjectCodes = config.participants;
  const conditionType = config.conditionType;
  const bonusTiers = config.bonusTiers;
  const bonusTiers2 = config.bonusTiers2;
  const isAFYP = conditionType === 'total_afyp';
  const isActivityMode = isActivityRoundMode(conditionType);
  const isTopN = isTopNMode(conditionType);
  const topN = config.topN ?? 3;
  const topNMinIP = config.topNMinIP ?? 50_000_000;
  // Top N value type: 'ip' (default) or 'afyp'
  const topNValueType = config.topNValueType === 'afyp' ? 'afyp' : 'ip';
  const luotThreshold = isStandardMode(conditionType)
    ? config.luotHDCTThreshold
    : config.luotHDThreshold;
  const structureStartDates = buildStructureStartDateMap(tvvStructList);

  const agentMap = new Map<
    string,
    {
      agentCode: string;
      agentName: string;
      nhom: string;
      maNhom: string;
      totalFYP: number;
      totalAFYP: number;
      contractCount: number;
      activityRounds: number;
    }
  >();
  for (const c of displayContracts) {
    const key = c.agentCode;
    if (!key) continue;
    const existing = agentMap.get(key);
    if (existing) {
      existing.totalFYP += c.pdt10DT;
      existing.totalAFYP += c.afyp;
      existing.contractCount += 1;
    } else {
      agentMap.set(key, {
        agentCode: c.agentCode,
        agentName: c.agentName,
        nhom: c.nhom || c.maNhom || '',
        maNhom: c.maNhom || '',
        totalFYP: c.pdt10DT,
        totalAFYP: c.afyp,
        contractCount: 1,
        activityRounds: 0,
      });
    }
  }
  for (const [key, agent] of agentMap) {
    const agentContracts = displayContracts.filter(
      (c) => c.agentCode === key
    );
    agent.activityRounds = calculateLuot(
      agentContracts,
      luotThreshold,
      conditionType,
      config.tvv90MaxMonths,
      config.tvv90MinIP,
      structureStartDates
    );
  }
  // Add TVV from subjectCodes that have no contracts (value 0)
  if (subjectCodes.length > 0) {
    for (const code of subjectCodes) {
      const codeLower = norm(code).toLowerCase();
      const found = Array.from(agentMap.keys()).some(
        (k) => norm(k).toLowerCase() === codeLower
      );
      if (!found) {
        const structMember = tvvStructList?.find(
          (t) =>
            t.agentCode.toLowerCase() === codeLower ||
            norm(t.agentName || '').toLowerCase() === codeLower
        );
        const staff = staffList.find(
          (s) =>
            s.agentCode.toLowerCase() === codeLower ||
            norm(s.agentName || '').toLowerCase() === codeLower
        );
        const recruiter = !staff
          ? recruiterList.find(
              (r) =>
                r.agentCode.toLowerCase() === codeLower ||
                norm(r.agentName || '').toLowerCase() === codeLower
            )
          : null;
        const info = structMember || staff || recruiter;
        const resolvedCode = info?.agentCode || code;
        agentMap.set(resolvedCode, {
          agentCode: resolvedCode,
          agentName: info?.agentName || code,
          nhom: (info as StaffMember | RecruiterMember)?.nhom || '',
          maNhom: structMember?.maBanNhom || (info as StaffMember)?.maNhom || '',
          totalFYP: 0,
          totalAFYP: 0,
          contractCount: 0,
          activityRounds: 0,
        });
      }
    }
  } else if (isTopN && tvvStructList && tvvStructList.length > 0) {
    // Top N mode + KHÔNG có DS đối tượng → thêm TẤT CẢ TVV từ DS TVV (Cấu trúc) để hiển thị hết
    // Yêu cầu user: bảng kết quả phải hiển thị hết danh sách đối tượng tham gia thi đua,
    // không chỉ những người có doanh số. User dùng "Ẩn chưa đạt mức" để ẩn người k có doanh số.
    for (const t of tvvStructList) {
      if (!t.agentCode) continue;
      const codeLower = t.agentCode.toLowerCase();
      const found = Array.from(agentMap.keys()).some(
        (k) => norm(k).toLowerCase() === codeLower
      );
      if (!found) {
        agentMap.set(t.agentCode, {
          agentCode: t.agentCode,
          agentName: t.agentName || t.agentCode,
          nhom: '',
          maNhom: t.maBanNhom || '',
          totalFYP: 0,
          totalAFYP: 0,
          contractCount: 0,
          activityRounds: 0,
        });
      }
    }
  } else if (tvvStructList && tvvStructList.length > 0) {
    // FIX (user request): TẤT CẢ chế độ (total_ip / total_afyp / activity_round / ...)
    // khi KHÔNG có DS đối tượng → thêm TẤT CẢ TVV từ DS TVV (Cấu trúc Quản lý) vào
    // bảng kết quả. Trước đây chỉ TopN mode mới thêm → các chế độ khác chỉ hiện TVV
    // có doanh số, làm user tưởng "lấy DS đối tượng từ file doanh số".
    // TVV trong Cấu trúc mà không có HĐ → giá trị 0, sẽ hiện "chưa đạt" (user có thể
    // dùng "Ẩn chưa đạt mức" để ẩn).
    for (const t of tvvStructList) {
      if (!t.agentCode) continue;
      const codeLower = t.agentCode.toLowerCase();
      const found = Array.from(agentMap.keys()).some(
        (k) => norm(k).toLowerCase() === codeLower
      );
      if (!found) {
        agentMap.set(t.agentCode, {
          agentCode: t.agentCode,
          agentName: t.agentName || t.agentCode,
          nhom: '',
          maNhom: t.maBanNhom || '',
          totalFYP: 0,
          totalAFYP: 0,
          contractCount: 0,
          activityRounds: 0,
        });
      }
    }
  }
  // For top_n_ip mode: sort desc by value (IP or AFYP based on topNValueType), then assign tier by rank index
  // For other modes: use the standard calculateBonusWithTiers
  const allRows = Array.from(agentMap.values())
    .map((agent) => {
      // Top N mode: choose value source based on topNValueType ('ip' or 'afyp')
      const value = isTopN
        ? (topNValueType === 'afyp' ? agent.totalAFYP : agent.totalFYP)
        : isAFYP
        ? agent.totalAFYP
        : isActivityMode
        ? agent.activityRounds
        : agent.totalFYP;
      let tier: BonusTier | null = null;
      let remaining: number | null = null;
      if (isTopN) {
        // Tier will be assigned after sort by rank — placeholder null here
        // remaining = topNMinIP - value (how much more IP needed to qualify)
        remaining = value < topNMinIP ? topNMinIP - value : null;
      } else {
        const res = calculateBonusWithTiers(value, bonusTiers);
        tier = res.tier;
        remaining = getRemainingToNextTier(value, bonusTiers);
      }
      let phaseInfo = {
        phase1Bonus: 0,
        phase2Bonus: 0,
        phase1Tier: null as BonusTier | null,
        phase2Tier: null as BonusTier | null,
      };
      if (config.usePhase2 && config.phase2StartDate) {
        const p2Start = new Date(config.phase2StartDate);
        const agentContracts = displayContracts.filter(
          (c) => c.agentCode === agent.agentCode
        );
        const p1Contracts = agentContracts.filter(
          (c) => new Date(c.effectiveDate) < p2Start
        );
        const p2Contracts = agentContracts.filter(
          (c) => new Date(c.effectiveDate) >= p2Start
        );
        const p1Value = isAFYP
          ? p1Contracts.reduce((s, c) => s + c.afyp, 0)
          : p1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
        const p2Value = isAFYP
          ? p2Contracts.reduce((s, c) => s + c.afyp, 0)
          : p2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
        const p1Res = calculateBonusWithTiers(p1Value, bonusTiers);
        const p2Res = calculateBonusWithTiers(p2Value, bonusTiers2);
        phaseInfo = {
          phase1Bonus: p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value) : 0,
          phase2Bonus: p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Value) : 0,
          phase1Tier: p1Res.tier,
          phase2Tier: p2Res.tier,
        };
      }
      return { agent, value, tier, remaining, phaseInfo };
    })
    .sort((a, b) => {
      const valueDiff = b.value - a.value;
      if (valueDiff !== 0) return valueDiff;
      if (a.value === 0) {
        const aPA = isPAGroup(a.agent.nhom, a.agent.maNhom);
        const bPA = isPAGroup(b.agent.nhom, b.agent.maNhom);
        if (aPA !== bPA) return aPA ? 1 : -1;
      }
      const aPriority = priorityAgentCodes?.has(a.agent.agentCode) ? 1 : 0;
      const bPriority = priorityAgentCodes?.has(b.agent.agentCode) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return a.agent.agentName.localeCompare(b.agent.agentName, 'vi');
    });

  // For top_n_ip mode: assign tier by rank (only top N with IP >= topNMinIP get reward)
  if (isTopN) {
    // QUAN TRỌNG: Trong Top N mode, tier theo THỨ TỰ hạng (Mức 1 = Hạng 1, Mức 2 = Hạng 2, ...)
    // KHÔNG sort theo minFYP (sẽ sai: user setup Mức 1 minFYP=50M bonusAmount=1M,
    // Mức 2 minFYP=0 bonusAmount=500K → sort sẽ đặt Mức 2 lên trước → Hạng 1 nhận 500K thay vì 1M)
    const orderedTiers = [...bonusTiers];
    // Auto-create default tiers if user hasn't added any — Top N mode cần tier theo từng hạng
    // Nếu không có tier nào → Hạng 1 = 1 triệu, Hạng 2 = 500k, Hạng 3 = 300k (mặc định)
    const effectiveTiers = orderedTiers.length > 0
      ? orderedTiers
      : Array.from({ length: topN }, (_, i) => ({
          id: `default-tier-${i + 1}`,
          minFYP: 0,
          maxFYP: null,
          bonusAmount: i === 0 ? 1000000 : i === 1 ? 500000 : 300000,
          bonusType: 'money' as const,
          bonusText: '',
          bonusPercent: 0,
        }));
    return allRows.map((row, idx) => {
      const rank = idx + 1;
      const qualified = row.value >= topNMinIP && rank <= topN;
      const tierByRank = qualified && rank <= effectiveTiers.length ? effectiveTiers[rank - 1] : null;
      return {
        ...row,
        tier: tierByRank,
        remaining: row.value < topNMinIP ? topNMinIP - row.value : null,
      };
    });
  }

  return allRows;
}

// ===== Per-contract TVV rows (for isPerContractMode + targetType=tvv) =====
export interface TVVPerContractRow {
  contract: Contract;
  cValue: number;
  tier: BonusTier | null;
  remaining: number | null;
  phaseInfo: {
    phase1Bonus: number;
    phase2Bonus: number;
    phase1Tier: BonusTier | null;
    phase2Tier: BonusTier | null;
  };
  secondaryCheck: { passed: boolean; totalAFYP: number; totalIP: number };
  secondaryPassed: boolean;
  effectiveTier: BonusTier | null;
}

export function computeTVVPerContractRows(
  displayContracts: Contract[],
  config: ContestConfig,
  tvvStructList?: TVVStructMember[]
): TVVPerContractRow[] {
  if (config.targetType !== 'tvv' || !isPerContractMode(config.conditionType)) {
    return [];
  }
  const conditionType = config.conditionType;
  const bonusTiers = config.bonusTiers;
  const bonusTiers2 = config.bonusTiers2;
  const usePhase2 = config.usePhase2 ?? false;
  const phase2StartDate = config.phase2StartDate;
  const useSecondaryCondition = config.useSecondaryCondition ?? false;
  const secondaryTotalAFYPMin = config.secondaryTotalAFYPMin ?? 0;
  const secondaryTotalIPMin = config.secondaryTotalIPMin ?? 0;

  const getContractValue = (c: Contract): number =>
    conditionType === 'per_contract_afyp' ? c.afyp : c.pdt10DT;

  const checkSecondaryTotalCondition = (contracts: Contract[]) => {
    const totalAFYP = contracts.reduce((sum, c) => sum + c.afyp, 0);
    const totalIP = contracts.reduce((sum, c) => sum + c.pdt10DT, 0);
    if (!useSecondaryCondition) return { passed: true, totalAFYP, totalIP };
    let passed = true;
    if (secondaryTotalAFYPMin > 0 && totalAFYP < secondaryTotalAFYPMin) passed = false;
    if (secondaryTotalIPMin > 0 && totalIP < secondaryTotalIPMin) passed = false;
    return { passed, totalAFYP, totalIP };
  };

  const contractsForRows = [...displayContracts];
  if (tvvStructList && tvvStructList.length > 0) {
    const participants = config.participants;
    const candidates = participants.length === 0
      ? tvvStructList
      : tvvStructList.filter((member) =>
          participants.includes(member.agentCode) || participants.includes(member.agentName)
        );
    const existingCodes = new Set(contractsForRows.map((row) => norm(row.agentCode || '').toLowerCase()));
    const uniqueCandidates = new Map<string, TVVStructMember>();
    for (const member of candidates) {
      const key = norm(member.agentCode || '').toLowerCase();
      if (key && !uniqueCandidates.has(key)) uniqueCandidates.set(key, member);
    }
    for (const [key, member] of uniqueCandidates) {
      if (existingCodes.has(key)) continue;
      contractsForRows.push({
        id: `zero-sales-${member.agentCode}`,
        contractNumber: '',
        agentCode: member.agentCode,
        agentName: member.agentName || member.agentCode,
        position: member.chucVu || '',
        ban: '',
        nhom: '',
        maNhom: member.maBanNhom || '',
        leaderAgentCode: '',
        recruiterCode: '',
        startDate: member.ngayBatDau || null,
        effectiveDate: '',
        issueDate: '',
        fyp: 0,
        afyp: 0,
        pdt10DT: 0,
        tinhLuot3tr: 0,
        maDaiLyTD: member.maTVVTuyendung || '',
        ngayBatDauLamViec: member.ngayBatDau || null,
        ad: '',
      });
    }
  }

  return contractsForRows
    .map((c) => {
      const cValue = getContractValue(c);
      const { tier } = calculateBonusWithTiers(cValue, bonusTiers);
      const remaining = getRemainingToNextTier(cValue, bonusTiers);
      // Phase info
      let phaseInfo = {
        phase1Bonus: 0,
        phase2Bonus: 0,
        phase1Tier: null as BonusTier | null,
        phase2Tier: null as BonusTier | null,
      };
      if (usePhase2 && phase2StartDate) {
        const p2Start = new Date(phase2StartDate);
        const isPhase1 = new Date(c.effectiveDate) < p2Start;
        if (isPhase1) {
          const p1Res = calculateBonusWithTiers(cValue, bonusTiers);
          phaseInfo.phase1Bonus = p1Res.tier ? computeBonusFromTier(p1Res.tier, cValue) : 0;
          phaseInfo.phase1Tier = p1Res.tier;
        } else {
          const p2Res = calculateBonusWithTiers(cValue, bonusTiers2);
          phaseInfo.phase2Bonus = p2Res.tier ? computeBonusFromTier(p2Res.tier, cValue) : 0;
          phaseInfo.phase2Tier = p2Res.tier;
        }
      }
      const agentContracts = displayContracts.filter(
        (ac) => ac.agentCode === c.agentCode
      );
      const secondaryCheck = checkSecondaryTotalCondition(agentContracts);
      const secondaryPassed = secondaryCheck.passed;
      const effectiveTier = secondaryPassed
        ? tier
        : secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0
        ? null
        : tier;
      return {
        contract: c,
        cValue,
        tier,
        remaining,
        phaseInfo,
        secondaryCheck,
        secondaryPassed,
        effectiveTier,
      };
    })
    .sort((a, b) => {
      const valueDiff = b.cValue - a.cValue;
      if (valueDiff !== 0) return valueDiff;
      if (a.cValue === 0) {
        const aPA = isPAGroup(a.contract.nhom, a.contract.maNhom);
        const bPA = isPAGroup(b.contract.nhom, b.contract.maNhom);
        if (aPA !== bPA) return aPA ? 1 : -1;
      }
      return (a.contract.agentName || a.contract.agentCode).localeCompare(b.contract.agentName || b.contract.agentCode, 'vi');
    });
}

// ===== Stats summary =====
export interface ContestStats {
  totalFYP: number;
  totalBonus: number;
  achievedCount: number;
  notAchievedCount: number;
  filteredCount: number; // number of rows displayed
}

export function computeContestStats(
  displayContracts: Contract[],
  groupedData: GroupData[],
  tvvTotalRows: TVVTotalRow[],
  tvvPerContractRows: TVVPerContractRow[],
  config: ContestConfig
): ContestStats {
  const conditionType = config.conditionType;
  const targetType = config.targetType;
  const hideNotAchieved = config.hideNotAchieved ?? false;
  const usePhase2 = config.usePhase2 ?? false;
  const useSecondaryCondition = config.useSecondaryCondition ?? false;
  const secondaryTotalAFYPMin = config.secondaryTotalAFYPMin ?? 0;
  const secondaryTotalIPMin = config.secondaryTotalIPMin ?? 0;

  const totalFYP = displayContracts.reduce((s, c) => s + c.pdt10DT, 0);
  let achievedCount = 0;
  let notAchievedCount = 0;
  let totalBonus = 0;
  let filteredCount = 0;

  if (targetType === 'nhom') {
    const groups = [...groupedData];
    for (const g of groups) {
      let value: number;
      if (isActivityRoundMode(conditionType)) value = g.activityRounds;
      else if (conditionType === 'total_afyp') value = g.totalAFYP;
      else value = g.totalFYP;
      const { tier } = isActivityRoundMode(conditionType)
        ? calculateActivityRoundBonusWithTiers(value, config.bonusTiers)
        : calculateBonusWithTiers(value, config.bonusTiers);
      // Secondary check
      const totalAFYP = g.contracts.reduce((s, c) => s + c.afyp, 0);
      const totalIP = g.contracts.reduce((s, c) => s + c.pdt10DT, 0);
      let secondaryPassed = true;
      if (useSecondaryCondition) {
        if (secondaryTotalAFYPMin > 0 && totalAFYP < secondaryTotalAFYPMin) secondaryPassed = false;
        if (secondaryTotalIPMin > 0 && totalIP < secondaryTotalIPMin) secondaryPassed = false;
      }
      const effectiveTier = secondaryPassed ? tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : tier);
      if (hideNotAchieved && !effectiveTier) continue;
      filteredCount++;
      if (effectiveTier) {
        achievedCount++;
        if (usePhase2) {
          // Phase 2 bonus
          const p2Start = config.phase2StartDate ? new Date(config.phase2StartDate) : null;
          if (p2Start) {
            const p1Contracts = g.contracts.filter((c) => new Date(c.effectiveDate) < p2Start);
            const p2Contracts = g.contracts.filter((c) => new Date(c.effectiveDate) >= p2Start);
            const isAFYP = conditionType === 'total_afyp';
            const p1Value = isAFYP ? p1Contracts.reduce((s, c) => s + c.afyp, 0) : p1Contracts.reduce((s, c) => s + c.pdt10DT, 0);
            const p2Value = isAFYP ? p2Contracts.reduce((s, c) => s + c.afyp, 0) : p2Contracts.reduce((s, c) => s + c.pdt10DT, 0);
            const p1Res = calculateBonusWithTiers(p1Value, config.bonusTiers);
            const p2Res = calculateBonusWithTiers(p2Value, config.bonusTiers2);
            totalBonus += (p1Res.tier ? computeBonusFromTier(p1Res.tier, p1Value) : 0) + (p2Res.tier ? computeBonusFromTier(p2Res.tier, p2Value) : 0);
          }
        } else {
          totalBonus += computeBonusFromTier(
            effectiveTier,
            value,
            isActivityRoundMode(conditionType) ? value : undefined
          );
        }
      } else {
        notAchievedCount++;
      }
    }
  } else if (isPerContractMode(conditionType) && targetType === 'tvv') {
    for (const row of tvvPerContractRows) {
      if (hideNotAchieved && !row.tier) continue;
      if (!row.contract.nhom && !row.contract.maNhom) continue;
      filteredCount++;
      if (row.effectiveTier) {
        achievedCount++;
        if (usePhase2) {
          totalBonus += row.phaseInfo.phase1Bonus + row.phaseInfo.phase2Bonus;
        } else {
          totalBonus += computeBonusFromTier(row.effectiveTier, row.cValue);
        }
      } else {
        notAchievedCount++;
      }
    }
  } else if (targetType === 'tvv') {
    // total mode
    for (const row of tvvTotalRows) {
      if (hideNotAchieved && !row.tier) continue;
      if (!row.agent.nhom && !row.agent.maNhom) continue;
      filteredCount++;
      const agentContracts = displayContracts.filter((c) => c.agentCode === row.agent.agentCode);
      const totalAFYP = agentContracts.reduce((s, c) => s + c.afyp, 0);
      const totalIP = agentContracts.reduce((s, c) => s + c.pdt10DT, 0);
      let secondaryPassed = true;
      if (useSecondaryCondition) {
        if (secondaryTotalAFYPMin > 0 && totalAFYP < secondaryTotalAFYPMin) secondaryPassed = false;
        if (secondaryTotalIPMin > 0 && totalIP < secondaryTotalIPMin) secondaryPassed = false;
      }
      const effectiveTier = secondaryPassed ? row.tier : (secondaryTotalAFYPMin > 0 || secondaryTotalIPMin > 0 ? null : row.tier);
      if (effectiveTier) {
        achievedCount++;
        if (usePhase2) {
          totalBonus += row.phaseInfo.phase1Bonus + row.phaseInfo.phase2Bonus;
        } else {
          totalBonus += computeBonusFromTier(effectiveTier, row.value);
        }
      } else {
        notAchievedCount++;
      }
    }
  }

  return { totalFYP, totalBonus, achievedCount, notAchievedCount, filteredCount };
}

// ===== NYD data computation (extracted from thi-dua-chau/page.tsx) =====
// Compute NTD list with recruitCount / recruitFYP / ownFYP for targetType='nyd'.
// Used by SavedContestInline to render NYD table (previously "chưa hỗ trợ").
//
// Logic:
//   - For activity_round modes: recruitCount = tổng lượt HĐ của TVV do NTD tuyển
//     (lọc TVVm / TVV90 theo conditionType)
//   - For total modes: recruitCount = số TVV do NTD tuyển có FYP ≥ luotHDThreshold
//   - ownFYP = FYP cá nhân của NTD (chỉ tính vào value khi includeIndividualTN=true)
//   - value = isActivityMode ? recruitCount : (recruitFYP + (includeIndividualTN ? ownFYP : 0))
export function computeNYDData(
  displayContracts: Contract[],
  config: ContestConfig,
  recruiterList: RecruiterMember[],
  staffList: StaffMember[],
  tvvStructList?: TVVStructMember[]
): NYDData[] {
  if (config.targetType !== 'nyd') return [];
  const conditionType = config.conditionType;
  const subjectCodes = config.participants;
  const luotHDThreshold = config.luotHDThreshold ?? 3_000_000;
  const luotHDCTThreshold = config.luotHDCTThreshold ?? 12_000_000;
  const tvv90MaxMonths = config.tvv90MaxMonths ?? 3;
  const tvv90MinIP = config.tvv90MinIP ?? 12_000_000;
  const isAFYP = conditionType === 'total_afyp';
  const isActivityMode = isActivityRoundMode(conditionType);
  const luotThreshold = isStandardMode(conditionType) ? luotHDCTThreshold : luotHDThreshold;
  const structureStartDates = buildStructureStartDateMap(tvvStructList);

  const nydMap = new Map<string, NYDData>();

  // Step 1: Load NTD from Recruiter table (or subjectCodes)
  if (subjectCodes.length > 0) {
    for (const r of recruiterList) {
      if (subjectCodes.includes(r.agentCode) || subjectCodes.includes(r.agentName)) {
        nydMap.set(r.agentCode, {
          nydCode: r.agentCode,
          nydName: r.agentName,
          nhom: r.nhom,
          position: r.position || '',
          startDate: r.startDate,
          recruitCount: 0,
          recruitFYP: 0,
          ownFYP: 0,
          ownActivityRounds: 0,
          contracts: [],
        });
      }
    }
    // Add NTD from subjectCodes not in recruiterList
    for (const code of subjectCodes) {
      const codeLower = norm(code).toLowerCase();
      const found = Array.from(nydMap.keys()).some((k) => norm(k).toLowerCase() === codeLower);
      if (!found) {
        const staff = staffList.find(
          (s) =>
            s.agentCode.toLowerCase() === codeLower ||
            norm(s.agentName || '').toLowerCase() === codeLower
        );
        nydMap.set(code, {
          nydCode: staff?.agentCode || code,
          nydName: staff?.agentName || code,
          nhom: staff?.nhom || '',
          position: staff?.position || '',
          startDate: staff?.startDate || null,
          recruitCount: 0,
          recruitFYP: 0,
          ownFYP: 0,
          ownActivityRounds: 0,
          contracts: [],
        });
      }
    }
  } else {
    // No subject codes → all recruiters
    for (const r of recruiterList) {
      nydMap.set(r.agentCode, {
        nydCode: r.agentCode,
        nydName: r.agentName,
        nhom: r.nhom,
        position: r.position || '',
        startDate: r.startDate,
        recruitCount: 0,
        recruitFYP: 0,
        ownFYP: 0,
        ownActivityRounds: 0,
        contracts: [],
      });
    }
  }

  // Step 2: Build FYP lookup by agentCode
  const agentFYPLookup = new Map<
    string,
    { totalFYP: number; totalAFYP: number; activityRounds: number }
  >();
  for (const c of displayContracts) {
    const key = c.agentCode;
    if (!key) continue;
    const existing = agentFYPLookup.get(key);
    if (existing) {
      existing.totalFYP += c.pdt10DT;
      existing.totalAFYP += c.afyp;
    } else {
      agentFYPLookup.set(key, {
        totalFYP: c.pdt10DT,
        totalAFYP: c.afyp,
        activityRounds: 0,
      });
    }
  }
  // Calculate activityRounds per agent
  const agentContractsMap = new Map<string, Contract[]>();
  for (const c of displayContracts) {
    const key = c.agentCode;
    if (!key) continue;
    if (!agentContractsMap.has(key)) agentContractsMap.set(key, []);
    agentContractsMap.get(key)!.push(c);
  }
  for (const [key, cList] of agentContractsMap) {
    const data = agentFYPLookup.get(key);
    if (data)
      data.activityRounds = calculateLuot(
        cList,
        luotThreshold,
        conditionType,
        tvv90MaxMonths,
        tvv90MinIP,
        structureStartDates
      );
  }

  // Step 3: For each NTD, find recruited TVV and compute recruit data
  for (const [nydCode, nyd] of nydMap) {
    const recruitedContracts = displayContracts.filter(
      (c) => c.maDaiLyTD === nydCode && c.agentCode !== nydCode
    );

    if (isActivityMode) {
      let totalRounds = 0;
      let totalRecruitFYP = 0;
      let recruitedAgents = new Set(recruitedContracts.map((c) => c.agentCode));
      // Filter TVVm if mode is TVVm
      if (isTVVmMode(conditionType)) {
        recruitedAgents = new Set(
          [...recruitedAgents].filter((agentCode) => {
            const structureStartDate = structureStartDates.get(normalizeAgentCode(agentCode));
            return isTVVm(structureStartDate || null);
          })
        );
      }
      // Filter TVV90 if mode is TVV90
      if (conditionType === 'activity_round_tvv90') {
        recruitedAgents = new Set(
          [...recruitedAgents].filter((agentCode) => {
            const contract = recruitedContracts.find((c) => c.agentCode === agentCode);
            return contract
              ? isTVV90Agent(recruitedContracts, agentCode, tvv90MaxMonths, tvv90MinIP, structureStartDates.get(normalizeAgentCode(agentCode)))
              : false;
          })
        );
      }
      for (const agentCode of recruitedAgents) {
        const rv = agentFYPLookup.get(agentCode);
        if (rv) {
          totalRounds += rv.activityRounds;
          totalRecruitFYP += rv.totalFYP;
        }
      }
      nyd.recruitCount = totalRounds;
      nyd.recruitFYP = totalRecruitFYP;
    } else {
      // NTD FYP mode: get FYP from agentFYPLookup
      let recruitCount = 0;
      let recruitFYP = 0;
      const recruitedAgents = new Set(recruitedContracts.map((c) => c.agentCode));
      for (const agentCode of recruitedAgents) {
        const rv = agentFYPLookup.get(agentCode);
        const agentFYP = rv ? (isAFYP ? rv.totalAFYP : rv.totalFYP) : 0;
        if (agentFYP >= luotHDThreshold) recruitCount++;
        recruitFYP += agentFYP;
      }
      nyd.recruitCount = recruitCount;
      nyd.recruitFYP = recruitFYP;
    }

    // NTD's own FYP
    const ownRevenue = agentFYPLookup.get(nydCode);
    nyd.ownFYP = ownRevenue ? (isAFYP ? ownRevenue.totalAFYP : ownRevenue.totalFYP) : 0;
    nyd.ownActivityRounds = ownRevenue?.activityRounds ?? 0;
    nyd.contracts = [
      ...recruitedContracts,
      ...displayContracts.filter((c) => c.agentCode === nydCode),
    ];
  }

  return Array.from(nydMap.values());
}

// ===== NYD result rows (with tier + value) =====
export interface NYDResultRow {
  nyd: NYDData;
  value: number;
  tier: BonusTier | null;
  tierIndex: number;
  remaining: number | null;
}

export function computeNYDResultRows(
  nydData: NYDData[],
  config: ContestConfig
): NYDResultRow[] {
  if (config.targetType !== 'nyd') return [];
  const conditionType = config.conditionType;
  const isActivityMode = isActivityRoundMode(conditionType);
  const includeIndividualNTD = config.includeIndividualNTD ?? false;
  const bonusTiers = config.bonusTiers;

  return nydData
    .map((n) => {
      const value = isActivityMode
        ? n.recruitCount + (includeIndividualNTD ? n.ownActivityRounds : 0)
        : n.recruitFYP + (includeIndividualNTD ? n.ownFYP : 0);
      const { tier, tierIndex } = calculateBonusWithTiers(value, bonusTiers);
      const remaining = getRemainingToNextTier(value, bonusTiers);
      return { nyd: n, value, tier, tierIndex, remaining };
    })
    .sort((a, b) => b.value - a.value);
}

// ===== Group TVV pass count for 'pass_count_ip_afyp' mode =====
// Count TVV in group meeting BOTH:
//   - totalIP (pdt10DT) >= config.secondaryIPMin
//   - totalAFYP >= config.secondaryAFYPMin
// TVV list = unique agentCodes from displayContracts in group + staff in group
// (mimics thi-dua-chau/page.tsx getGroupTVVPassCountIPAFYP)
export function getGroupTVVPassCountIPAFYP(
  g: GroupData,
  displayContracts: Contract[],
  staffList: StaffMember[],
  config: ContestConfig
): number {
  if (config.conditionType !== 'pass_count_ip_afyp') return 0;
  const tnAgentCode = g.leader?.agentCode || '';
  const includeTNInPassCount = config.includeTNInPassCount ?? false;
  const passCountIPMin = config.secondaryIPMin ?? 0;
  const passCountAFYPMin = config.secondaryAFYPMin ?? 0;

  const agentCodes = new Set<string>();
  const groupContracts = displayContracts.filter(
    (c) =>
      c.maNhom === g.maNhom ||
      (c.maNhom && c.maNhom.toLowerCase() === g.maNhom.toLowerCase())
  );
  for (const c of groupContracts) {
    if (c.agentCode) agentCodes.add(c.agentCode);
  }
  // Also include TVV from staffList in group (no contracts → won't pass anyway)
  const groupStaff = staffList.filter(
    (s) =>
      s.maNhom === g.maNhom ||
      (s.maNhom && s.maNhom.toLowerCase() === g.maNhom.toLowerCase())
  );
  for (const s of groupStaff) agentCodes.add(s.agentCode);

  let count = 0;
  for (const code of agentCodes) {
    if (!includeTNInPassCount && tnAgentCode && code === tnAgentCode) continue;
    const tvvContracts = displayContracts.filter((c) => c.agentCode === code);
    const totalIP = tvvContracts.reduce((s, c) => s + c.pdt10DT, 0);
    const totalAFYP = tvvContracts.reduce((s, c) => s + c.afyp, 0);
    if (totalIP >= passCountIPMin && totalAFYP >= passCountAFYPMin) count++;
  }
  return count;
}

