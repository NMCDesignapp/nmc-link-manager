import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const GROUP_IP_THRESHOLD = 120_000_000;
const TUYEN_LUYEN_REQUIRED_MONTHS = 2;

type MonthRef = {
  year: number;
  month: number;
  key: string;
  label: string;
};

type TuyenLuyenMonth = {
  key: string;
  label: string;
  tvvmHDC: number;
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
  return role === 'truong ban' || role === 'truong nhom';
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

function monthKey(dateValue: Date): string {
  return `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, '0')}`;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentYear = Number(searchParams.get('year'));
    const assessmentMonth = Number(searchParams.get('month'));

    if (!Number.isInteger(assessmentYear) || assessmentYear < 2020 || assessmentYear > 2100) {
      return NextResponse.json({ error: 'Năm xét không hợp lệ' }, { status: 400 });
    }
    if (!Number.isInteger(assessmentMonth) || assessmentMonth < 1 || assessmentMonth > 12) {
      return NextResponse.json({ error: 'Đợt xét không hợp lệ' }, { status: 400 });
    }

    const months = previousThreeMonths(assessmentYear, assessmentMonth);
    const assessmentStart = new Date(Date.UTC(assessmentYear, assessmentMonth - 1, 1));
    // Tuyển Luyện cần IP chặng của TVVm; với mỗi tháng xét chỉ cần lùi tối đa 2 tháng
    // so với tháng đầu tiên trong bộ 3 tháng.
    const rewardWindowStart = new Date(Date.UTC(months[0].year, months[0].month - 3, 1));

    const [rawMembers, tvvStruct, banNhomRows, leaderRows, staffRows, contracts] = await Promise.all([
      db.clbMember.findMany({ orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }] }),
      db.tVVStruct.findMany({
        select: { agentCode: true, agentName: true, maBanNhom: true, ngayBatDau: true, maTVVTuyendung: true },
      }),
      db.banNhom.findMany({ select: { maBanNhom: true, tenBanNhom: true } }),
      db.leaderInfo.findMany({ select: { agentCode: true, nhom: true, maNhom: true } }),
      db.staff.findMany({ select: { agentCode: true, nhom: true, maNhom: true } }),
      db.contract.findMany({
        where: {
          issueDate: {
            gte: rewardWindowStart,
            lt: assessmentStart,
          },
        },
        select: {
          agentCode: true,
          pdt10DT: true,
          issueDate: true,
        },
      }),
    ]);

    // Mục 2 chỉ xét đúng Trưởng ban + Trưởng nhóm trong DS thành viên CLB Sao Việt.
    // Khử trùng theo mã đại lý để tránh dữ liệu append cũ làm xét lặp.
    const targetMap = new Map<string, (typeof rawMembers)[number]>();
    for (const member of rawMembers) {
      if (!isLeaderRole(member.chucVu)) continue;
      const code = normalizeCode(member.agentCode);
      const fallback = `${normalizeText(member.agentName)}|${normalizeText(member.nhom)}`;
      const key = code || fallback;
      if (key && !targetMap.has(key)) targetMap.set(key, member);
    }
    const targets = Array.from(targetMap.values());

    const leaderByCode = new Map(leaderRows.map((row) => [normalizeCode(row.agentCode), row]));
    const banNhomByName = new Map(banNhomRows.map((row) => [normalizeText(row.tenBanNhom), row.maBanNhom]));

    const tvvByGroupCode = new Map<string, Set<string>>();
    for (const tvv of tvvStruct) {
      const groupCode = String(tvv.maBanNhom || '').trim();
      const code = normalizeCode(tvv.agentCode);
      if (!groupCode || !code) continue;
      const set = tvvByGroupCode.get(groupCode) || new Set<string>();
      set.add(code);
      tvvByGroupCode.set(groupCode, set);
    }

    const staffByGroupName = new Map<string, Set<string>>();
    for (const staff of staffRows) {
      const key = normalizeText(staff.nhom);
      const code = normalizeCode(staff.agentCode);
      if (!key || !code) continue;
      const set = staffByGroupName.get(key) || new Set<string>();
      set.add(code);
      staffByGroupName.set(key, set);
    }

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

    const rows = targets.map((member) => {
      const code = normalizeCode(member.agentCode);
      const groupNameKey = normalizeText(member.nhom);
      const leader = leaderByCode.get(code);
      const groupCode = String(leader?.maNhom || banNhomByName.get(groupNameKey) || '').trim();

      // Nguồn thành viên nhóm: ưu tiên Cấu trúc TVV theo mã Ban/Nhóm; fallback Staff theo tên nhóm.
      const groupAgentCodes = new Set<string>();
      if (groupCode && tvvByGroupCode.has(groupCode)) {
        for (const agentCode of tvvByGroupCode.get(groupCode) || []) groupAgentCodes.add(agentCode);
      }
      if (groupAgentCodes.size === 0 && groupNameKey && staffByGroupName.has(groupNameKey)) {
        for (const agentCode of staffByGroupName.get(groupNameKey) || []) groupAgentCodes.add(agentCode);
      }
      // Luôn cộng cá nhân TN/TB vào IP nhóm, đúng yêu cầu người dùng.
      if (code) groupAgentCodes.add(code);

      const monthlyGroupIP = months.map((month) => {
        const start = monthStart(month);
        const endExclusive = nextMonthStart(month);
        let total = 0;
        for (const agentCode of groupAgentCodes) total += sumAgentIP(agentCode, start, endExclusive);
        return total;
      });
      const totalGroupIP = monthlyGroupIP.reduce((sum, value) => sum + value, 0);
      const groupIpPassed = totalGroupIP >= GROUP_IP_THRESHOLD;

      // Thưởng Tuyển Luyện: dùng đúng nguyên tắc chính sách đã có của Main App:
      // - TVVm do TB/TN tuyển được xác định DUY NHẤT bằng maTVVTuyendung.
      // - TVVm tính tròn tháng, dưới 12 tháng tại tháng đang xét.
      // - HĐC của chính sách Tuyển Luyện = có ít nhất 1 HĐ phát hành trong tháng.
      // - Thưởng Tuyển Luyện = tỷ lệ 100% / 125% / 150% × Tổng thưởng TVVm tháng.
      const recruitedTVVs = tvvByRecruiter.get(code) || [];
      const monthlyTuyenLuyen: TuyenLuyenMonth[] = months.map((month) => {
        const start = monthStart(month);
        const endExclusive = nextMonthStart(month);
        const tvvmHDC = recruitedTVVs.filter((tvv) => {
          if (!isTVVmAtMonth(tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null, month)) return false;
          const tvvCode = normalizeCode(tvv.agentCode);
          return (contractsByAgent.get(tvvCode) || []).some((contract) => {
            if (!contract.issueDate) return false;
            const date = new Date(contract.issueDate);
            return date >= start && date < endExclusive;
          });
        });

        let totalTVVmReward = 0;
        for (const tvv of tvvmHDC) {
          const tvvCode = normalizeCode(tvv.agentCode);
          const tvvStart = tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null;
          const monthlyIP = sumAgentIP(tvvCode, start, endExclusive);
          const monthlyReward = monthlyIP >= 12_000_000 ? 1_000_000 : 0;

          let stageReward = 0;
          if (tvvStart && !Number.isNaN(tvvStart.getTime())) {
            const range = stageRange(tvvStart, month);
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

        let rate = 0;
        if (tvvmHDC.length >= 3) rate = 1.5;
        else if (tvvmHDC.length === 2) rate = 1.25;
        else if (tvvmHDC.length === 1) rate = 1;
        const rewardAmount = Math.round(totalTVVmReward * rate);

        return {
          key: month.key,
          label: month.label,
          tvvmHDC: tvvmHDC.length,
          rewardAmount,
          achieved: rewardAmount > 0,
        };
      });

      const tuyenLuyenMonths = monthlyTuyenLuyen.filter((month) => month.achieved).length;
      const tuyenLuyenPassed = tuyenLuyenMonths >= TUYEN_LUYEN_REQUIRED_MONTHS;
      const passed = groupIpPassed || tuyenLuyenPassed;
      const passedBy = groupIpPassed && tuyenLuyenPassed
        ? 'Cả hai chỉ tiêu'
        : groupIpPassed
          ? 'IP nhóm'
          : tuyenLuyenPassed
            ? 'Tuyển luyện'
            : '';

      return {
        id: member.id,
        ad: member.ad || '',
        nhom: member.nhom || leader?.nhom || '',
        agentCode: member.agentCode || '',
        agentName: member.agentName || '',
        chucVu: member.chucVu || '',
        monthlyGroupIP,
        totalGroupIP,
        groupIpPassed,
        monthlyTuyenLuyen,
        tuyenLuyenMonths,
        tuyenLuyenPassed,
        passedBy,
        passed,
        result: passed ? 'Đạt duy trì TN' : 'Không đạt',
      };
    }).sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

    const passedCount = rows.filter((row) => row.passed).length;

    return NextResponse.json({
      assessment: {
        year: assessmentYear,
        month: assessmentMonth,
        label: `1/${assessmentMonth}/${assessmentYear}`,
      },
      months,
      rule: {
        groupIpThreshold: GROUP_IP_THRESHOLD,
        tuyenLuyenRequiredMonths: TUYEN_LUYEN_REQUIRED_MONTHS,
        totalMonths: 3,
        description: 'Đạt duy trì TN khi Tổng IP nhóm 3 tháng từ 120.000.000 trở lên HOẶC đạt thưởng Tuyển Luyện ít nhất 2/3 tháng',
      },
      summary: {
        total: rows.length,
        passed: passedCount,
        failed: rows.length - passedCount,
        passedByGroupIP: rows.filter((row) => row.groupIpPassed).length,
        passedByTuyenLuyen: rows.filter((row) => row.tuyenLuyenPassed).length,
      },
      rows,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/duy-tri-tn error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả duy trì TN CLB Sao Việt' }, { status: 500 });
  }
}
