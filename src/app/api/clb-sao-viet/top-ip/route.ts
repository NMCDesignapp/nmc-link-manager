import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GET as getPostAssessmentMembers } from '@/app/api/clb-sao-viet/tong-hop/route';

const TOP_IP_THRESHOLD = 80_000_000;
const TOP_COUNT = 3;

type MemberRow = {
  id?: string;
  ad?: string;
  nhom?: string;
  agentCode?: string;
  agentName?: string;
  chucVu?: string;
  note?: string;
  permanent?: boolean;
};

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function previousMonth(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 2, 1));
  const resultYear = date.getUTCFullYear();
  const resultMonth = date.getUTCMonth() + 1;
  return {
    year: resultYear,
    month: resultMonth,
    label: `T${resultMonth}/${resultYear}`,
    start: new Date(Date.UTC(resultYear, resultMonth - 1, 1)),
    end: new Date(Date.UTC(year, month - 1, 1)),
  };
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

    const performancePeriod = previousMonth(year, month);

    // Đối tượng bắt buộc lấy từ Mục 3 — DS thành viên CLB sau đợt xét.
    const aggregateRequest = new NextRequest(`http://clb-internal.local/api/clb-sao-viet/tong-hop?year=${year}&month=${month}`);
    const aggregateResponse = await getPostAssessmentMembers(aggregateRequest);
    const aggregateData = await aggregateResponse.json();
    if (!aggregateResponse.ok) {
      throw new Error(aggregateData?.error || 'Không thể đọc DS thành viên Mục 3');
    }
    const members: MemberRow[] = Array.isArray(aggregateData?.rows) ? aggregateData.rows : [];

    // IP của đúng 1 tháng liền trước đợt xét. Chỉ dùng Ngày PH (issueDate), không fallback effectiveDate.
    // pdt10DT là cột IP đang được dùng xuyên suốt các phép xét CLB hiện tại.
    const contracts = await db.contract.findMany({
      where: {
        issueDate: {
          gte: performancePeriod.start,
          lt: performancePeriod.end,
        },
      },
      select: {
        agentCode: true,
        pdt10DT: true,
        issueDate: true,
      },
    });

    const ipByCode = new Map<string, number>();
    for (const contract of contracts) {
      const code = normalizeCode(contract.agentCode);
      if (!code || !contract.issueDate) continue;
      ipByCode.set(code, (ipByCode.get(code) || 0) + Number(contract.pdt10DT || 0));
    }

    const rows = members
      .map((member) => {
        const code = normalizeCode(member.agentCode);
        const totalIP = Number(ipByCode.get(code) || 0);
        return {
          id: String(member.id || code || member.agentName || ''),
          ad: String(member.ad || ''),
          nhom: String(member.nhom || ''),
          agentCode: String(member.agentCode || ''),
          agentName: String(member.agentName || ''),
          chucVu: String(member.chucVu || ''),
          note: String(member.note || ''),
          permanent: Boolean(member.permanent),
          totalIP,
          qualified: totalIP >= TOP_IP_THRESHOLD,
          position: null as number | null,
          title: '' as string,
          result: totalIP >= TOP_IP_THRESHOLD ? 'Đủ điều kiện xét Top' : 'Chưa đủ 80 triệu',
        };
      })
      .sort((a, b) => {
        if (b.totalIP !== a.totalIP) return b.totalIP - a.totalIP;
        return a.agentName.localeCompare(b.agentName, 'vi', { sensitivity: 'base' });
      });

    const qualified = rows.filter((row) => row.qualified);
    const winners = qualified.slice(0, TOP_COUNT).map((row, index) => ({
      ...row,
      position: index + 1,
      title: index === 0 ? 'Quán quân' : 'Á quân',
      result: index === 0 ? 'QUÁN QUÂN' : 'Á QUÂN',
    }));

    const winnerByCode = new Map(winners.map((row) => [normalizeCode(row.agentCode), row]));
    const rankedRows = rows.map((row) => {
      const winner = winnerByCode.get(normalizeCode(row.agentCode));
      if (winner) return winner;
      return row;
    });

    return NextResponse.json({
      assessment: { year, month, label: `1/${month}/${year}` },
      performancePeriod: {
        year: performancePeriod.year,
        month: performancePeriod.month,
        label: performancePeriod.label,
      },
      rule: {
        ipThreshold: TOP_IP_THRESHOLD,
        winnerCount: TOP_COUNT,
        description: `Xét toàn bộ DS thành viên Mục 3; tính Tổng IP riêng ${performancePeriod.label} theo Ngày PH; chỉ người có IP từ 80.000.000 trở lên mới đủ điều kiện; chọn 1 Quán quân và 2 Á quân có IP cao nhất.`,
      },
      source: 'DS thành viên Mục 3 + Contract.pdt10DT của tháng liền trước, lọc tuyệt đối theo issueDate (Ngày PH)',
      summary: {
        totalMembers: rankedRows.length,
        qualified: qualified.length,
        winners: winners.length,
        champion: winners.filter((row) => row.title === 'Quán quân').length,
        runnersUp: winners.filter((row) => row.title === 'Á quân').length,
      },
      winners,
      rows: rankedRows,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/top-ip error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Không thể tính kết quả Top IP',
    }, { status: 500 });
  }
}
