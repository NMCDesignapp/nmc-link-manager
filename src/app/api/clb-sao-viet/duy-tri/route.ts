import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const IP_THRESHOLD = 12_000_000;
const REQUIRED_MONTHS = 2;

type MonthRef = {
  year: number;
  month: number;
  key: string;
  label: string;
};

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
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
    const windowStart = new Date(Date.UTC(months[0].year, months[0].month - 1, 1));
    const assessmentStart = new Date(Date.UTC(assessmentYear, assessmentMonth - 1, 1));

    const [rawMembers, contracts] = await Promise.all([
      db.clbMember.findMany({ orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }] }),
      db.contract.findMany({
        where: {
          OR: [
            {
              issueDate: {
                gte: windowStart,
                lt: assessmentStart,
              },
            },
            {
              AND: [
                { issueDate: null },
                {
                  OR: months.map((m) => ({
                    namTD: m.year,
                    thangTD: m.month,
                  })),
                },
              ],
            },
          ],
        },
        select: {
          agentCode: true,
          pdt10DT: true,
          issueDate: true,
          namTD: true,
          thangTD: true,
        },
      }),
    ]);

    // Dữ liệu CLB đôi khi từng được import kiểu append. Chỉ giữ một dòng cho mỗi mã đại lý
    // để một thành viên không bị xét lặp. Với dòng không có mã, dùng tên + nhóm làm khóa dự phòng.
    const memberMap = new Map<string, (typeof rawMembers)[number]>();
    for (const member of rawMembers) {
      const code = normalizeCode(member.agentCode);
      const fallback = `${String(member.agentName || '').trim().toUpperCase()}|${String(member.nhom || '').trim().toUpperCase()}`;
      const key = code || fallback;
      if (key && !memberMap.has(key)) memberMap.set(key, member);
    }
    const members = Array.from(memberMap.values());

    const monthKeySet = new Set(months.map((m) => m.key));
    const totalsByAgent = new Map<string, Map<string, number>>();

    for (const contract of contracts) {
      const code = normalizeCode(contract.agentCode);
      if (!code) continue;

      let key = '';
      if (contract.issueDate) {
        const date = new Date(contract.issueDate);
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      } else if (contract.namTD && contract.thangTD) {
        key = `${contract.namTD}-${String(contract.thangTD).padStart(2, '0')}`;
      }
      if (!monthKeySet.has(key)) continue;

      const byMonth = totalsByAgent.get(code) || new Map<string, number>();
      byMonth.set(key, (byMonth.get(key) || 0) + Number(contract.pdt10DT || 0));
      totalsByAgent.set(code, byMonth);
    }

    const rows = members
      .map((member) => {
        const code = normalizeCode(member.agentCode);
        const byMonth = totalsByAgent.get(code) || new Map<string, number>();
        const monthlyIP = months.map((month) => Number(byMonth.get(month.key) || 0));
        const qualifyingMonths = monthlyIP.filter((value) => value >= IP_THRESHOLD).length;
        const passed = qualifyingMonths >= REQUIRED_MONTHS;

        return {
          id: member.id,
          ad: member.ad || '',
          nhom: member.nhom || '',
          agentCode: member.agentCode || '',
          agentName: member.agentName || '',
          chucVu: member.chucVu || '',
          note: member.note || '',
          monthlyIP,
          qualifyingMonths,
          passed,
          result: passed ? 'Đạt duy trì' : 'Không đạt',
        };
      })
      .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

    const passedCount = rows.filter((row) => row.passed).length;

    return NextResponse.json(
      {
        assessment: {
          year: assessmentYear,
          month: assessmentMonth,
          label: `1/${assessmentMonth}/${assessmentYear}`,
        },
        rule: {
          ipThreshold: IP_THRESHOLD,
          requiredMonths: REQUIRED_MONTHS,
          totalMonths: 3,
          description: 'Đạt duy trì khi có ít nhất 2/3 tháng có Tổng IP từ 12.000.000 trở lên',
        },
        months,
        summary: {
          total: rows.length,
          passed: passedCount,
          failed: rows.length - passedCount,
        },
        rows,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('GET /api/clb-sao-viet/duy-tri error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả duy trì CLB Sao Việt' }, { status: 500 });
  }
}
