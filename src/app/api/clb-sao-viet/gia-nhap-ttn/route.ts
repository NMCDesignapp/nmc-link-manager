import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const REQUIRED_DONG_HANH_MONTHS = 3;

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

function isTTNRole(value: unknown): boolean {
  const role = normalizeText(value);
  return role === 'ttn' || role === 'tien truong nhom' || role === 'truong to nhom';
}

function previousThreeMonths(year: number, month: number): MonthRef[] {
  const result: MonthRef[] = [];
  for (let offset = 3; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    result.push({ year: y, month: m, key: `${y}-${String(m).padStart(2, '0')}`, label: `T${m}/${y}` });
  }
  return result;
}

function monthStart(ref: MonthRef): Date {
  return new Date(Date.UTC(ref.year, ref.month - 1, 1));
}

function nextMonthStart(ref: MonthRef): Date {
  return new Date(Date.UTC(ref.year, ref.month, 1));
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

function stageRewardEntitlement(stage: number, stageIP: number): number {
  if (stage === 1) {
    if (stageIP >= 100_000_000) return 6_000_000;
    if (stageIP >= 50_000_000) return 3_000_000;
    return 0;
  }
  if (stage >= 2 && stage <= 4 && stageIP >= 100_000_000) return 3_000_000;
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'Năm xét không hợp lệ' }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Đợt xét không hợp lệ' }, { status: 400 });
    }

    const months = previousThreeMonths(year, month);
    const assessmentStart = new Date(Date.UTC(year, month - 1, 1));
    const rewardWindowStart = new Date(Date.UTC(months[0].year, months[0].month - 3, 1));

    const [recruiters, clbMembers, tvvStruct, banNhomRows, adRows, contracts] = await Promise.all([
      db.recruiter.findMany({
        select: { id: true, nhom: true, agentCode: true, agentName: true, position: true },
      }),
      db.clbMember.findMany({ select: { agentCode: true } }),
      db.tVVStruct.findMany({
        select: { agentCode: true, agentName: true, ngayBatDau: true, maTVVTuyendung: true },
      }),
      db.banNhom.findMany({ select: { tenBanNhom: true, maAD: true } }),
      db.aD.findMany({ select: { maAD: true, tenAD: true } }),
      db.contract.findMany({
        where: { issueDate: { gte: rewardWindowStart, lt: assessmentStart } },
        select: { agentCode: true, pdt10DT: true, issueDate: true },
      }),
    ]);

    const clbCodes = new Set(clbMembers.map((m) => normalizeCode(m.agentCode)).filter(Boolean));
    const groupByName = new Map(banNhomRows.map((row) => [normalizeText(row.tenBanNhom), row]));
    const adByCode = new Map(adRows.map((row) => [String(row.maAD || '').trim(), row.tenAD || row.maAD || '']));

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
      const recruiterCode = normalizeCode(tvv.maTVVTuyendung);
      if (!recruiterCode) continue;
      const list = tvvByRecruiter.get(recruiterCode) || [];
      list.push(tvv);
      tvvByRecruiter.set(recruiterCode, list);
    }

    const sumAgentIP = (agentCode: string, start: Date, endExclusive: Date): number =>
      (contractsByAgent.get(agentCode) || []).reduce((sum, contract) => {
        if (!contract.issueDate) return sum;
        const date = new Date(contract.issueDate);
        if (date < start || date >= endExclusive) return sum;
        return sum + Number(contract.pdt10DT || 0);
      }, 0);

    const rows = recruiters
      .filter((recruiter) => isTTNRole(recruiter.position))
      .filter((recruiter) => {
        const code = normalizeCode(recruiter.agentCode);
        return Boolean(code) && !clbCodes.has(code);
      })
      .map((recruiter) => {
        const code = normalizeCode(recruiter.agentCode);
        const recruitedTVVs = (tvvByRecruiter.get(code) || []).filter((tvv) => normalizeCode(tvv.agentCode) !== code);
        const monthlyDongHanh: DongHanhMonth[] = months.map((ref) => {
          const start = monthStart(ref);
          const endExclusive = nextMonthStart(ref);
          const activeTVVm = recruitedTVVs.filter((tvv) =>
            isTVVmAtMonth(tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null, ref),
          );

          let fypTVVm = 0;
          let tvvmHDC = 0;
          let totalTVVmReward = 0;

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

            const monthlyReward = monthlyIP >= 12_000_000 ? 1_000_000 : 0;
            let stageReward = 0;
            const tvvStart = tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null;
            if (tvvStart && !Number.isNaN(tvvStart.getTime())) {
              const range = stageRange(tvvStart, ref);
              if (range) {
                const currentStageIP = sumAgentIP(tvvCode, range.start, range.endExclusive);
                const previousStageIP = sumAgentIP(tvvCode, range.start, start);
                stageReward = Math.max(
                  0,
                  stageRewardEntitlement(range.stage, currentStageIP)
                    - stageRewardEntitlement(range.stage, previousStageIP),
                );
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
            key: ref.key,
            label: ref.label,
            tvvmHDC,
            fypTVVm,
            totalTVVmReward,
            rewardRate,
            rewardAmount,
            achieved: rewardAmount > 0,
          };
        });

        const achievedMonths = monthlyDongHanh.filter((item) => item.achieved).length;
        const passed = achievedMonths === REQUIRED_DONG_HANH_MONTHS;
        const group = groupByName.get(normalizeText(recruiter.nhom));
        return {
          id: recruiter.id,
          ad: group ? (adByCode.get(String(group.maAD || '').trim()) || group.maAD || '') : '',
          nhom: recruiter.nhom || '',
          agentCode: recruiter.agentCode || '',
          agentName: recruiter.agentName || '',
          chucVu: recruiter.position || '',
          monthlyDongHanh,
          achievedMonths,
          passed,
          result: passed ? 'Đạt gia nhập TTN' : 'Chưa đạt',
        };
      })
      .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

    const passed = rows.filter((row) => row.passed).length;
    return NextResponse.json({
      assessment: { year, month, label: `1/${month}/${year}` },
      months,
      rule: {
        requiredMonths: REQUIRED_DONG_HANH_MONTHS,
        totalMonths: 3,
        description: 'Gia nhập TTN khi đạt Thưởng Đồng Hành đủ 3/3 tháng liền trước đợt xét',
        rewardDescription: 'Mỗi phần thưởng vượt chặng của TVVm chỉ ghi nhận một lần trong cùng chặng',
      },
      summary: { total: rows.length, passed, failed: rows.length - passed },
      rows,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/gia-nhap-ttn error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả gia nhập TTN' }, { status: 500 });
  }
}
