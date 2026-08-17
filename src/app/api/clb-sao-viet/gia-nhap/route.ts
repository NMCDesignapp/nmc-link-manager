import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const TVV_TOTAL_IP_THRESHOLD = 60_000_000;
const TN_GROUP_IP_THRESHOLD = 150_000_000;
const TTN_REQUIRED_DONG_HANH_MONTHS = 3;

type EntryType = 'tvv' | 'tn' | 'ttn';
type MonthRef = { year: number; month: number; key: string; label: string };

type DongHanhMonth = {
  key: string;
  label: string;
  tvvmHDC: number;
  fypTVVm: number;
  totalTVVmReward: number;
  rewardRate: number;
  rewardAmount: number;
  achieved: boolean;
};

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLeaderRole(value: unknown): boolean {
  const role = normalizeText(value);
  return role === 'tb'
    || role === 'tn'
    || role === 'truong ban'
    || role === 'truong nhom'
    || role.includes('truong ban')
    || role.includes('truong nhom');
}

function isTTNRole(value: unknown): boolean {
  const role = normalizeText(value);
  return role === 'ttn'
    || role === 'tien truong nhom'
    || role === 'truong to nhom'
    || role.includes('tien truong nhom')
    || role.includes('truong to nhom');
}

function isTVVCandidateRole(value: unknown): boolean {
  const role = normalizeText(value);
  if (!role) return true;
  return !isLeaderRole(role) && !isTTNRole(role);
}

function previousThreeMonths(assessmentYear: number, assessmentMonth: number): MonthRef[] {
  const result: MonthRef[] = [];
  for (let offset = 3; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(assessmentYear, assessmentMonth - 1 - offset, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    result.push({
      year,
      month,
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `T${month}/${year}`,
    });
  }
  return result;
}

function monthStart(ref: MonthRef): Date {
  return new Date(Date.UTC(ref.year, ref.month - 1, 1));
}

function nextMonthStart(ref: MonthRef): Date {
  return new Date(Date.UTC(ref.year, ref.month, 1));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function diffMonths(startDate: Date, target: MonthRef): number {
  return (target.year - startDate.getUTCFullYear()) * 12 + (target.month - (startDate.getUTCMonth() + 1));
}

function isTVVmAtMonth(startDate: Date | null, target: MonthRef): boolean {
  if (!startDate || Number.isNaN(startDate.getTime())) return false;
  const diff = diffMonths(startDate, target);
  return diff >= 0 && diff < 12;
}

function stageRange(startDate: Date, target: MonthRef): { start: Date; endExclusive: Date; stage: number } | null {
  const diff = diffMonths(startDate, target);
  if (diff < 0 || diff >= 12) return null;
  const stage = Math.floor(diff / 3) + 1;
  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + (stage - 1) * 3, 1));
  const naturalEnd = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + stage * 3, 1));
  const targetEnd = nextMonthStart(target);
  return { start, endExclusive: naturalEnd < targetEnd ? naturalEnd : targetEnd, stage };
}

function validateAssessment(year: number, month: number): string | null {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) return 'Năm xét không hợp lệ';
  if (!Number.isInteger(month) || month < 1 || month > 12) return 'Đợt xét không hợp lệ';
  return null;
}

function assessmentMeta(year: number, month: number) {
  return { year, month, label: `1/${month}/${year}` };
}

function buildOrgMaps(
  banNhomRows: Array<{ maBanNhom: string; tenBanNhom: string; maAD: string }>,
  adRows: Array<{ maAD: string; tenAD: string }>,
) {
  const groupByCode = new Map(banNhomRows.map((row) => [String(row.maBanNhom || '').trim(), row]));
  const groupByName = new Map(banNhomRows.map((row) => [normalizeText(row.tenBanNhom), row]));
  const adByCode = new Map(adRows.map((row) => [String(row.maAD || '').trim(), row]));

  const resolve = (groupCode: string, groupName: string) => {
    const group = groupByCode.get(String(groupCode || '').trim()) || groupByName.get(normalizeText(groupName));
    const ad = group ? adByCode.get(String(group.maAD || '').trim()) : undefined;
    return {
      nhom: group?.tenBanNhom || groupName || '',
      ad: ad?.tenAD || group?.maAD || '',
      groupCode: group?.maBanNhom || groupCode || '',
    };
  };

  return { resolve, groupByName };
}

async function calculateTVV(year: number, month: number, months: MonthRef[]) {
  const windowStart = monthStart(months[0]);
  const assessmentStart = new Date(Date.UTC(year, month - 1, 1));
  const monthKeys = new Set(months.map((item) => item.key));

  const [tvvStruct, clbMembers, banNhomRows, adRows, contracts] = await Promise.all([
    db.tVVStruct.findMany({
      select: {
        id: true,
        agentCode: true,
        agentName: true,
        maBanNhom: true,
        chucVu: true,
        ngayBatDau: true,
      },
    }),
    db.clbMember.findMany({ select: { agentCode: true } }),
    db.banNhom.findMany({ select: { maBanNhom: true, tenBanNhom: true, maAD: true } }),
    db.aD.findMany({ select: { maAD: true, tenAD: true } }),
    db.contract.findMany({
      where: { issueDate: { gte: windowStart, lt: assessmentStart } },
      select: { agentCode: true, pdt10DT: true, issueDate: true },
    }),
  ]);

  const existingCodes = new Set(clbMembers.map((member) => normalizeCode(member.agentCode)).filter(Boolean));
  const { resolve } = buildOrgMaps(banNhomRows, adRows);
  const totalsByAgent = new Map<string, Map<string, number>>();

  for (const contract of contracts) {
    const code = normalizeCode(contract.agentCode);
    if (!code || !contract.issueDate) continue;
    const key = monthKey(new Date(contract.issueDate));
    if (!monthKeys.has(key)) continue;
    const monthly = totalsByAgent.get(code) || new Map<string, number>();
    monthly.set(key, (monthly.get(key) || 0) + Number(contract.pdt10DT || 0));
    totalsByAgent.set(code, monthly);
  }

  const rows = tvvStruct
    .filter((tvv) => {
      const code = normalizeCode(tvv.agentCode);
      return Boolean(code) && !existingCodes.has(code) && isTVVCandidateRole(tvv.chucVu);
    })
    .map((tvv) => {
      const code = normalizeCode(tvv.agentCode);
      const monthly = totalsByAgent.get(code) || new Map<string, number>();
      const monthlyIP = months.map((item) => Number(monthly.get(item.key) || 0));
      const totalIP = monthlyIP.reduce((sum, value) => sum + value, 0);
      const passed = totalIP >= TVV_TOTAL_IP_THRESHOLD;
      const org = resolve(tvv.maBanNhom, '');
      return {
        id: tvv.id,
        ad: org.ad,
        nhom: org.nhom,
        agentCode: tvv.agentCode || '',
        agentName: tvv.agentName || '',
        chucVu: tvv.chucVu || 'TVV',
        startDate: tvv.ngayBatDau,
        monthlyIP,
        totalIP,
        passed,
        result: passed ? 'Đạt gia nhập TVV' : 'Chưa đạt',
      };
    })
    .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

  const passed = rows.filter((row) => row.passed).length;
  return {
    type: 'tvv' as const,
    assessment: assessmentMeta(year, month),
    months,
    rule: {
      totalIpThreshold: TVV_TOTAL_IP_THRESHOLD,
      description: 'Gia nhập TVV khi Tổng IP của 3 tháng liền trước đạt từ 60.000.000 trở lên; doanh số tính theo Ngày phát hành.',
    },
    summary: { total: rows.length, passed, failed: rows.length - passed },
    rows,
  };
}

async function calculateTN(year: number, month: number, months: MonthRef[]) {
  const windowStart = monthStart(months[0]);
  const assessmentStart = new Date(Date.UTC(year, month - 1, 1));
  const monthKeys = new Set(months.map((item) => item.key));

  const [leaders, clbMembers, tvvStruct, staffRows, banNhomRows, adRows, contracts] = await Promise.all([
    db.leaderInfo.findMany({
      select: { id: true, agentCode: true, agentName: true, position: true, ban: true, nhom: true, maNhom: true },
    }),
    db.clbMember.findMany({ select: { agentCode: true } }),
    db.tVVStruct.findMany({ select: { agentCode: true, maBanNhom: true } }),
    db.staff.findMany({ select: { agentCode: true, nhom: true, maNhom: true } }),
    db.banNhom.findMany({ select: { maBanNhom: true, tenBanNhom: true, maAD: true } }),
    db.aD.findMany({ select: { maAD: true, tenAD: true } }),
    db.contract.findMany({
      where: { issueDate: { gte: windowStart, lt: assessmentStart } },
      select: { agentCode: true, pdt10DT: true, issueDate: true },
    }),
  ]);

  const existingCodes = new Set(clbMembers.map((member) => normalizeCode(member.agentCode)).filter(Boolean));
  const { resolve, groupByName } = buildOrgMaps(banNhomRows, adRows);

  const tvvByGroup = new Map<string, Set<string>>();
  for (const tvv of tvvStruct) {
    const groupCode = String(tvv.maBanNhom || '').trim();
    const code = normalizeCode(tvv.agentCode);
    if (!groupCode || !code) continue;
    const set = tvvByGroup.get(groupCode) || new Set<string>();
    set.add(code);
    tvvByGroup.set(groupCode, set);
  }

  const staffByGroupCode = new Map<string, Set<string>>();
  const staffByGroupName = new Map<string, Set<string>>();
  for (const staff of staffRows) {
    const code = normalizeCode(staff.agentCode);
    if (!code) continue;
    const groupCode = String(staff.maNhom || '').trim();
    const groupName = normalizeText(staff.nhom);
    if (groupCode) {
      const set = staffByGroupCode.get(groupCode) || new Set<string>();
      set.add(code);
      staffByGroupCode.set(groupCode, set);
    }
    if (groupName) {
      const set = staffByGroupName.get(groupName) || new Set<string>();
      set.add(code);
      staffByGroupName.set(groupName, set);
    }
  }

  const totalsByAgent = new Map<string, Map<string, number>>();
  for (const contract of contracts) {
    const code = normalizeCode(contract.agentCode);
    if (!code || !contract.issueDate) continue;
    const key = monthKey(new Date(contract.issueDate));
    if (!monthKeys.has(key)) continue;
    const monthly = totalsByAgent.get(code) || new Map<string, number>();
    monthly.set(key, (monthly.get(key) || 0) + Number(contract.pdt10DT || 0));
    totalsByAgent.set(code, monthly);
  }

  const sumAgentMonth = (agentCode: string, key: string) => Number(totalsByAgent.get(agentCode)?.get(key) || 0);

  const rows = leaders
    .filter((leader) => {
      const code = normalizeCode(leader.agentCode);
      if (!code || existingCodes.has(code)) return false;
      const position = normalizeText(leader.position);
      return !position || isLeaderRole(position);
    })
    .map((leader) => {
      const code = normalizeCode(leader.agentCode);
      const groupName = leader.nhom || '';
      const groupNameKey = normalizeText(groupName);
      const mappedGroup = groupByName.get(groupNameKey);
      const groupCode = String(leader.maNhom || mappedGroup?.maBanNhom || '').trim();
      const groupAgentCodes = new Set<string>();

      for (const agentCode of tvvByGroup.get(groupCode) || []) groupAgentCodes.add(agentCode);
      for (const agentCode of staffByGroupCode.get(groupCode) || []) groupAgentCodes.add(agentCode);
      if (groupAgentCodes.size === 0) {
        for (const agentCode of staffByGroupName.get(groupNameKey) || []) groupAgentCodes.add(agentCode);
      }
      groupAgentCodes.add(code); // luôn tính cả doanh số cá nhân TB/TN

      const monthlyGroupIP = months.map((item) => {
        let total = 0;
        for (const agentCode of groupAgentCodes) total += sumAgentMonth(agentCode, item.key);
        return total;
      });
      const totalGroupIP = monthlyGroupIP.reduce((sum, value) => sum + value, 0);
      const passed = totalGroupIP >= TN_GROUP_IP_THRESHOLD;
      const org = resolve(groupCode, groupName);

      return {
        id: leader.id,
        ad: org.ad || leader.ban || '',
        nhom: org.nhom || groupName,
        agentCode: leader.agentCode || '',
        agentName: leader.agentName || '',
        chucVu: leader.position || 'TN',
        monthlyGroupIP,
        totalGroupIP,
        passed,
        result: passed ? 'Đạt gia nhập TN' : 'Chưa đạt',
      };
    })
    .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

  const passed = rows.filter((row) => row.passed).length;
  return {
    type: 'tn' as const,
    assessment: assessmentMeta(year, month),
    months,
    rule: {
      groupIpThreshold: TN_GROUP_IP_THRESHOLD,
      description: 'Gia nhập TN khi Tổng IP nhóm của 3 tháng liền trước đạt từ 150.000.000 trở lên; có tính cả doanh số cá nhân TB/TN và dùng Ngày phát hành.',
    },
    summary: { total: rows.length, passed, failed: rows.length - passed },
    rows,
  };
}

async function calculateTTN(year: number, month: number, months: MonthRef[]) {
  const assessmentStart = new Date(Date.UTC(year, month - 1, 1));
  const rewardWindowStart = new Date(Date.UTC(months[0].year, months[0].month - 3, 1));

  const [recruiters, clbMembers, tvvStruct, banNhomRows, adRows, contracts] = await Promise.all([
    db.recruiter.findMany({
      select: { id: true, nhom: true, agentCode: true, agentName: true, position: true, startDate: true },
    }),
    db.clbMember.findMany({ select: { agentCode: true } }),
    db.tVVStruct.findMany({
      select: { agentCode: true, agentName: true, ngayBatDau: true, maTVVTuyendung: true },
    }),
    db.banNhom.findMany({ select: { maBanNhom: true, tenBanNhom: true, maAD: true } }),
    db.aD.findMany({ select: { maAD: true, tenAD: true } }),
    db.contract.findMany({
      where: { issueDate: { gte: rewardWindowStart, lt: assessmentStart } },
      select: { agentCode: true, pdt10DT: true, issueDate: true },
    }),
  ]);

  const existingCodes = new Set(clbMembers.map((member) => normalizeCode(member.agentCode)).filter(Boolean));
  const { resolve } = buildOrgMaps(banNhomRows, adRows);

  const contractsByAgent = new Map<string, typeof contracts>();
  for (const contract of contracts) {
    const code = normalizeCode(contract.agentCode);
    if (!code || !contract.issueDate) continue;
    const list = contractsByAgent.get(code) || [];
    list.push(contract);
    contractsByAgent.set(code, list);
  }

  const tvvByRecruiter = new Map<string, typeof tvvStruct>();
  for (const tvv of tvvStruct) {
    const recruiter = normalizeCode(tvv.maTVVTuyendung);
    if (!recruiter) continue;
    const list = tvvByRecruiter.get(recruiter) || [];
    list.push(tvv);
    tvvByRecruiter.set(recruiter, list);
  }

  const sumAgentIP = (agentCode: string, start: Date, endExclusive: Date): number => {
    return (contractsByAgent.get(agentCode) || []).reduce((sum, contract) => {
      if (!contract.issueDate) return sum;
      const date = new Date(contract.issueDate);
      if (date < start || date >= endExclusive) return sum;
      return sum + Number(contract.pdt10DT || 0);
    }, 0);
  };

  const rows = recruiters
    .filter((recruiter) => {
      const code = normalizeCode(recruiter.agentCode);
      return Boolean(code) && !existingCodes.has(code);
    })
    .map((recruiter) => {
      const code = normalizeCode(recruiter.agentCode);
      const recruitedTVVs = (tvvByRecruiter.get(code) || []).filter((tvv) => normalizeCode(tvv.agentCode) !== code);

      const monthlyDongHanh: DongHanhMonth[] = months.map((item) => {
        const start = monthStart(item);
        const endExclusive = nextMonthStart(item);
        const activeTVVm = recruitedTVVs.filter((tvv) =>
          isTVVmAtMonth(tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null, item),
        );

        let fypTVVm = 0;
        let tvvmHDC = 0;
        for (const tvv of activeTVVm) {
          const tvvCode = normalizeCode(tvv.agentCode);
          const monthlyIP = sumAgentIP(tvvCode, start, endExclusive);
          fypTVVm += monthlyIP;
          const hasIssuedContract = (contractsByAgent.get(tvvCode) || []).some((contract) => {
            if (!contract.issueDate) return false;
            const date = new Date(contract.issueDate);
            return date >= start && date < endExclusive;
          });
          if (hasIssuedContract) tvvmHDC += 1;
        }

        let totalTVVmReward = 0;
        for (const tvv of activeTVVm) {
          const tvvCode = normalizeCode(tvv.agentCode);
          const tvvStart = tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null;
          const monthlyIP = sumAgentIP(tvvCode, start, endExclusive);
          const monthlyReward = monthlyIP >= 12_000_000 ? 1_000_000 : 0;

          let stageReward = 0;
          if (tvvStart && !Number.isNaN(tvvStart.getTime())) {
            const range = stageRange(tvvStart, item);
            if (range) {
              const stageIP = sumAgentIP(tvvCode, range.start, range.endExclusive);
              if (range.stage === 1) {
                if (stageIP >= 100_000_000) stageReward = 6_000_000;
                else if (stageIP >= 50_000_000) stageReward = 3_000_000;
              } else if (range.stage >= 2 && range.stage <= 4 && stageIP >= 100_000_000) {
                stageReward = 3_000_000;
              }
            }
          }
          totalTVVmReward += monthlyReward + stageReward;
        }

        let multiplier = 0;
        let rewardRate = 0;
        if (tvvmHDC >= 3) {
          multiplier = 2;
          rewardRate = 200;
        } else if (tvvmHDC === 2) {
          multiplier = 1;
          rewardRate = 100;
        }
        const rewardAmount = Math.round(totalTVVmReward * multiplier);
        return {
          key: item.key,
          label: item.label,
          tvvmHDC,
          fypTVVm,
          totalTVVmReward,
          rewardRate,
          rewardAmount,
          achieved: rewardAmount > 0,
        };
      });

      const achievedMonths = monthlyDongHanh.filter((item) => item.achieved).length;
      const passed = achievedMonths === TTN_REQUIRED_DONG_HANH_MONTHS;
      const org = resolve('', recruiter.nhom || '');
      return {
        id: recruiter.id,
        ad: org.ad,
        nhom: org.nhom || recruiter.nhom || '',
        agentCode: recruiter.agentCode || '',
        agentName: recruiter.agentName || '',
        chucVu: recruiter.position || 'TTN',
        startDate: recruiter.startDate,
        monthlyDongHanh,
        achievedMonths,
        passed,
        result: passed ? 'Đạt gia nhập TTN' : 'Chưa đạt',
      };
    })
    .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

  const passed = rows.filter((row) => row.passed).length;
  return {
    type: 'ttn' as const,
    assessment: assessmentMeta(year, month),
    months,
    rule: {
      requiredMonths: TTN_REQUIRED_DONG_HANH_MONTHS,
      totalMonths: 3,
      description: 'Gia nhập TTN khi đạt Thưởng Đồng Hành đủ 3/3 tháng liền trước đợt xét, cùng chỉ tiêu với Xét duy trì TTN.',
      rewardDescription: 'Tháng đạt khi tiền Thưởng Đồng Hành > 0; không dùng Thưởng Vượt Trội để thay thế.',
    },
    summary: { total: rows.length, passed, failed: rows.length - passed },
    rows,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));
    const type = String(searchParams.get('type') || '') as EntryType;
    const validationError = validateAssessment(year, month);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    if (!['tvv', 'tn', 'ttn'].includes(type)) {
      return NextResponse.json({ error: 'Loại xét gia nhập không hợp lệ' }, { status: 400 });
    }

    const months = previousThreeMonths(year, month);
    const data = type === 'tvv'
      ? await calculateTVV(year, month, months)
      : type === 'tn'
        ? await calculateTN(year, month, months)
        : await calculateTTN(year, month, months);

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/gia-nhap error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả xét gia nhập CLB Sao Việt' }, { status: 500 });
  }
}
