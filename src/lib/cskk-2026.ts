import { getQuarterlyAwardCount } from './quarterly-award-counts-2026.ts';

export type CskkKind = 'leader' | 'tvv';

export interface CskkSourceContract {
  agentCode?: string;
  fyp?: number;
  pdt10DT?: number;
  effectiveDate?: string | null;
  issueDate?: string | null;
  nguonDuLieu?: string | null;
  maNhom?: string;
  nhom?: string;
}

export interface CskkPerson {
  agentCode?: string;
  agentName?: string;
  position?: string;
  nhom?: string;
  maNhom?: string;
  maBanNhom?: string;
}

export interface CskkRow {
  key: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  totalFyp: number;
  alternateCount: number;
}

export interface CskkStatus {
  achievedIndex: number;
  reward: string;
  title: string;
  uniform: string;
}

const text = (value: unknown) => String(value || '').trim();
const code = (value: unknown) => text(value).toUpperCase();
const groupKey = (groupCode: unknown, groupName: unknown) => code(groupCode) || text(groupName).toLocaleLowerCase('vi-VN');

const isTbTn = (position: unknown) => {
  const normalized = text(position).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!normalized || normalized.includes('ttn') || normalized.includes('truong to nhom')) return false;
  return normalized.includes('truong ban') || normalized.includes('truong nhom') || /(^|\W)(tb|tn)(\W|$)/.test(normalized);
};

// CSKK TVV: kỳ doanh số và tháng HĐC được chốt DUY NHẤT theo Ngày phát hành (Ngày PH).
// Không dùng Ngày hiệu lực hay nhãn tháng sheet để chuyển hợp đồng sang tháng khác.
// Một tháng HĐC = tổng IP (pdt10DT) của cùng mã TVV trong tháng PH >= 12 triệu.
// Cột "TÍNH LƯỢT" là chỉ tiêu cấp hợp đồng, không thể dùng làm số tháng HĐC.
const contractDate = (contract: CskkSourceContract): Date | null => {
  if (!contract.issueDate) return null;
  const date = new Date(contract.issueDate);
  return Number.isFinite(date.getTime()) ? date : null;
};

const inYearThrough = (contract: CskkSourceContract, year: number, now: Date) => {
  const date = contractDate(contract);
  return Boolean(date && date.getUTCFullYear() === year && date.getTime() <= now.getTime());
};

export function buildCskkRows(
  contracts: CskkSourceContract[],
  leaders: CskkPerson[],
  tvvMembers: CskkPerson[],
  groups: Array<{ maBanNhom?: string; maNhom?: string; tenBanNhom?: string; nhom?: string; maAD?: string }> = [],
  now = new Date(),
): { leaders: CskkRow[]; tvv: CskkRow[] } {
  const year = 2026;
  const groupNameByKey = new Map<string, string>();
  const bancaGroupKeys = new Set<string>();
  const isBancaValue = (value: unknown) => {
    const normalized = code(value).replace(/[\s_-]+/g, '');
    return normalized === 'A473DSO000' || normalized === 'BANCA' || normalized === 'DSO' || normalized.includes('BANCA');
  };
  for (const group of groups) {
    const key = groupKey(group.maBanNhom || group.maNhom, group.tenBanNhom || group.nhom);
    if (key) groupNameByKey.set(key, text(group.tenBanNhom || group.nhom || group.maBanNhom || group.maNhom));
    if (key && [group.maBanNhom, group.maNhom, group.tenBanNhom, group.nhom, group.maAD].some(isBancaValue)) bancaGroupKeys.add(key);
  }

  const memberByCode = new Map<string, CskkPerson>();
  for (const member of tvvMembers) {
    const key = code(member.agentCode);
    if (key && !memberByCode.has(key)) memberByCode.set(key, member);
  }

  const fypByGroup = new Map<string, number>();
  const fypByAgent = new Map<string, number>();
  const monthlyIpByAgent = new Map<string, Map<number, number>>();
  for (const contract of contracts) {
    if (!inYearThrough(contract, year, now)) continue;
    const agentCode = code(contract.agentCode);
    const member = memberByCode.get(agentCode);
    const memberGroupCode = member?.maBanNhom || member?.maNhom;
    const memberGroupName = member?.nhom;
    const resolvedGroup = groupKey(memberGroupCode || contract.maNhom, memberGroupName || contract.nhom);
    const fyp = Number(contract.fyp || 0);
    if (resolvedGroup) fypByGroup.set(resolvedGroup, (fypByGroup.get(resolvedGroup) || 0) + fyp);
    if (agentCode) {
      fypByAgent.set(agentCode, (fypByAgent.get(agentCode) || 0) + fyp);
      const month = contractDate(contract)?.getUTCMonth();
      if (month !== undefined) {
        const monthly = monthlyIpByAgent.get(agentCode) || new Map<number, number>();
        monthly.set(month, (monthly.get(month) || 0) + Number(contract.pdt10DT || 0));
        monthlyIpByAgent.set(agentCode, monthly);
      }
    }
  }

  const leaderRows = new Map<string, CskkRow>();
  for (const leader of leaders.filter(item => isTbTn(item.position))) {
    const leaderCode = code(leader.agentCode);
    const resolvedGroup = groupKey(leader.maNhom || leader.maBanNhom, leader.nhom);
    if (!leaderCode || !resolvedGroup) continue;
    const key = `${leaderCode}:${resolvedGroup}`;
    if (leaderRows.has(key)) continue;
    leaderRows.set(key, {
      key,
      nhom: text(leader.nhom) || groupNameByKey.get(resolvedGroup) || text(leader.maNhom || leader.maBanNhom) || '—',
      agentCode: leaderCode,
      agentName: text(leader.agentName) || leaderCode,
      totalFyp: fypByGroup.get(resolvedGroup) || 0,
      alternateCount: getQuarterlyAwardCount(leaderCode, 'tbTn') || 0,
    });
  }

  const tvvRows = new Map<string, CskkRow>();
  for (const member of tvvMembers) {
    const agentCode = code(member.agentCode);
    const resolvedGroup = groupKey(member.maBanNhom || member.maNhom, member.nhom);
    const isBanca = bancaGroupKeys.has(resolvedGroup) || [member.maBanNhom, member.maNhom, member.nhom].some(isBancaValue);
    if (!agentCode || isBanca || tvvRows.has(agentCode)) continue;
    const standardMonths = [...(monthlyIpByAgent.get(agentCode)?.values() || [])].filter(value => value >= 12_000_000).length;
    tvvRows.set(agentCode, {
      key: agentCode,
      nhom: text(member.nhom) || groupNameByKey.get(resolvedGroup) || text(member.maBanNhom || member.maNhom) || '—',
      agentCode,
      agentName: text(member.agentName) || agentCode,
      totalFyp: fypByAgent.get(agentCode) || 0,
      alternateCount: standardMonths,
    });
  }

  const byFypThenConditionThenName = (a: CskkRow, b: CskkRow) => b.totalFyp - a.totalFyp || b.alternateCount - a.alternateCount || a.agentName.localeCompare(b.agentName, 'vi');
  return { leaders: [...leaderRows.values()].sort(byFypThenConditionThenName), tvv: [...tvvRows.values()].sort(byFypThenConditionThenName) };
}

export function getCskkStatus(kind: CskkKind, totalFyp: number, alternateCount = 0): CskkStatus {
  if (kind === 'leader') {
    if (totalFyp >= 3_500_000_000) return { achievedIndex: 3, reward: 'Healthcare – 300tr', title: 'TN Ngoại hạng', uniform: '1 bộ đầy đủ + phụ kiện' };
    if (totalFyp >= 2_500_000_000) return { achievedIndex: 2, reward: 'Healthcare – 200tr', title: 'TN Cao cấp', uniform: '1 bộ đầy đủ + phụ kiện' };
    if (totalFyp >= 1_500_000_000) return { achievedIndex: 1, reward: 'Healthcare – 150tr', title: 'TN Ưu tú', uniform: '1 bộ đầy đủ + phụ kiện' };
    if (totalFyp >= 500_000_000) return { achievedIndex: 0, reward: 'Healthcare – 100tr', title: '', uniform: '02 sơ mi + 01 áo phông + phụ kiện' };
    if (totalFyp >= 200_000_000 || alternateCount >= 1) return { achievedIndex: 0, reward: 'BaoVietCare – 50tr', title: '', uniform: '02 sơ mi + 01 áo phông + phụ kiện' };
    return { achievedIndex: -1, reward: '', title: '', uniform: '' };
  }

  if (totalFyp >= 750_000_000) return { achievedIndex: 3, reward: 'Healthcare – 200tr', title: 'TVV Ngoại hạng', uniform: '1 bộ đầy đủ + phụ kiện' };
  if (totalFyp >= 500_000_000) return { achievedIndex: 2, reward: 'Healthcare – 150tr', title: 'TVV Cao cấp', uniform: '1 bộ đầy đủ + phụ kiện' };
  if (totalFyp >= 250_000_000) return { achievedIndex: 1, reward: 'Healthcare – 100tr', title: 'TVV Xuất sắc', uniform: '02 sơ mi + 01 áo phông + phụ kiện' };
  if (totalFyp >= 100_000_000 || alternateCount >= 5) return { achievedIndex: 0, reward: 'BaoVietCare – 50tr', title: '', uniform: '01 sơ mi' };
  return { achievedIndex: -1, reward: '', title: '', uniform: '' };
}

export const CSKK_THRESHOLDS: Record<CskkKind, number[]> = {
  leader: [200_000_000, 1_500_000_000, 2_500_000_000, 3_500_000_000],
  tvv: [100_000_000, 250_000_000, 500_000_000, 750_000_000],
};
