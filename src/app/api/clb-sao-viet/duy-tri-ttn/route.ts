import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const REQUIRED_DONG_HANH_MONTHS = 3;

type MonthRef = {
  year: number;
  month: number;
  key: string;
  label: string;
};

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
    // Để tính thưởng chặng tại tháng đầu tiên trong bộ 3 tháng, chỉ cần lấy thêm tối đa 2 tháng trước đó.
    const rewardWindowStart = new Date(Date.UTC(months[0].year, months[0].month - 3, 1));

    const [rawMembers, tvvStruct, contracts] = await Promise.all([
      db.clbMember.findMany({ orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }] }),
      db.tVVStruct.findMany({
        select: {
          agentCode: true,
          agentName: true,
          ngayBatDau: true,
          maTVVTuyendung: true,
        },
      }),
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

    // Mục 3: lấy tất cả thành viên CLB có chức vụ TTN.
    // Chấp nhận các cách ghi TTN đang có trong hệ thống: TTN / Tiền trưởng nhóm / Trưởng tổ nhóm.
    const targetMap = new Map<string, (typeof rawMembers)[number]>();
    for (const member of rawMembers) {
      if (!isTTNRole(member.chucVu)) continue;
      const code = normalizeCode(member.agentCode);
      const fallback = `${normalizeText(member.agentName)}|${normalizeText(member.nhom)}`;
      const key = code || fallback;
      if (key && !targetMap.has(key)) targetMap.set(key, member);
    }
    const targets = Array.from(targetMap.values());

    const contractsByAgent = new Map<string, typeof contracts>();
    for (const contract of contracts) {
      const code = normalizeCode(contract.agentCode);
      if (!code || !contract.issueDate) continue;
      const list = contractsByAgent.get(code) || [];
      list.push(contract);
      contractsByAgent.set(code, list);
    }

    // Nguyên tắc chính sách Đồng Hành: TVVm thuộc TTN nào được xác định DUY NHẤT bằng maTVVTuyendung.
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
      const recruitedTVVs = (tvvByRecruiter.get(code) || []).filter((tvv) => normalizeCode(tvv.agentCode) !== code);

      const monthlyDongHanh: DongHanhMonth[] = months.map((month) => {
        const start = monthStart(month);
        const endExclusive = nextMonthStart(month);

        // TVVm tại đúng tháng đang xét: tính tròn tháng và dưới 12 tháng.
        const activeTVVm = recruitedTVVs.filter((tvv) =>
          isTVVmAtMonth(tvv.ngayBatDau ? new Date(tvv.ngayBatDau) : null, month),
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

        // Tổng thưởng TVVm nền của chính sách Đồng Hành = thưởng tháng + thưởng chặng
        // của tất cả TVVm do TTN tuyển đang còn trong 12 tháng tại tháng xét.
        let totalTVVmReward = 0;
        for (const tvv of activeTVVm) {
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

        // Chính sách Đồng Hành hiện hành:
        // >=3 TVVm HĐC: 200% × Tổng thưởng TVVm
        // =2 TVVm HĐC: 100% × Tổng thưởng TVVm
        // 0-1 TVVm HĐC: không có Thưởng Đồng Hành.
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
          key: month.key,
          label: month.label,
          tvvmHDC,
          fypTVVm,
          totalTVVmReward,
          rewardRate,
          rewardAmount,
          achieved: rewardAmount > 0,
        };
      });

      const achievedMonths = monthlyDongHanh.filter((month) => month.achieved).length;
      const passed = achievedMonths === REQUIRED_DONG_HANH_MONTHS;

      return {
        id: member.id,
        ad: member.ad || '',
        nhom: member.nhom || '',
        agentCode: member.agentCode || '',
        agentName: member.agentName || '',
        chucVu: member.chucVu || '',
        monthlyDongHanh,
        achievedMonths,
        passed,
        result: passed ? 'Đạt duy trì TTN' : 'Không đạt',
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
        requiredMonths: REQUIRED_DONG_HANH_MONTHS,
        totalMonths: 3,
        description: 'Đạt duy trì TTN khi đạt Thưởng Đồng Hành đủ 3/3 tháng liền trước đợt xét',
        rewardDescription: 'Tháng đạt khi tiền Thưởng Đồng Hành > 0; không dùng Thưởng Vượt Trội để thay thế',
      },
      summary: {
        total: rows.length,
        passed: passedCount,
        failed: rows.length - passedCount,
      },
      rows,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/duy-tri-ttn error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả duy trì TTN CLB Sao Việt' }, { status: 500 });
  }
}
