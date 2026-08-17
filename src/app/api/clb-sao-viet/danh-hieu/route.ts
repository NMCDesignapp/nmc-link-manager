import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { GET as getPostAssessmentMembers } from '@/app/api/clb-sao-viet/tong-hop/route';

const CA_NHAN = {
  vang: [300, 350, 400, 450, 500, 550, 600],
  bachkim: [500, 580, 660, 740, 820, 900, 980],
  kimcuong: [825, 970, 1115, 1260, 1405, 1550, 1695],
};
const TN_TD = {
  vangFyp: [250, 300, 350, 400, 450, 500, 550],
  vangHdc: [5, 6, 7, 7, 8, 8, 9],
  bachkimFyp: [600, 700, 800, 900, 1000, 1100, 1200],
  bachkimHdc: [7, 8, 9, 10, 11, 12, 13],
};
const TN_KTM = {
  vang: [875, 1020, 1165, 1310, 1455, 1600, 1745],
  bachkim: [1900, 2220, 2540, 2860, 3180, 3500, 3820],
  kimcuong: [2850, 3350, 3850, 4350, 4850, 5350, 5850],
};
const MONTHLY_FYP_MIN = 12_000_000;

function normalizeCode(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function normalizePosition(value: unknown) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN');
}

function isTBorTN(value: unknown) {
  const p = normalizePosition(value);
  if (!p) return false;
  if (p.includes('tiền trưởng nhóm') || p.includes('trưởng tổ nhóm')) return false;
  if (p === 'ttn' || p.includes('ttn ') || p.includes(' ttn')) return false;
  if (p.includes('trưởng ban') || p.includes('trưởng nhóm')) return true;
  const tokens = p.split(/[\s,;/|\\-]+/).filter(Boolean);
  return tokens.includes('tb') || tokens.includes('tn');
}

function performancePeriod(year: number, month: number) {
  const date = new Date(year, month - 2, 1); // tháng liền trước đợt xét
  const performanceYear = date.getFullYear();
  const performanceMonth = date.getMonth() + 1;
  const thresholdIndex = performanceMonth <= 6 ? 0 : performanceMonth >= 12 ? 6 : performanceMonth - 6;
  return {
    year: performanceYear,
    month: performanceMonth,
    thresholdIndex,
    label: `T${performanceMonth}/${performanceYear}`,
  };
}

function highestRank(value: number, thresholds: { vang: number; bachkim: number; kimcuong: number }, eligible = true) {
  if (!eligible) return 'Chưa đạt';
  if (value >= thresholds.kimcuong) return 'Kim Cương';
  if (value >= thresholds.bachkim) return 'Bạch Kim';
  if (value >= thresholds.vang) return 'Vàng';
  return 'Chưa đạt';
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

    // Nguồn đối tượng DUY NHẤT: DS thành viên sau đợt xét (Mục 3).
    // Không lấy đối tượng trực tiếp từ Cấu trúc.
    const aggregateResponse = await getPostAssessmentMembers(
      new NextRequest(`http://clb-internal.local/api/clb-sao-viet/tong-hop?year=${year}&month=${month}`),
    );
    const aggregate = await aggregateResponse.json();
    if (!aggregateResponse.ok) {
      throw new Error(aggregate?.error || 'Không thể đọc DS thành viên sau đợt xét');
    }
    const members = Array.isArray(aggregate?.rows) ? aggregate.rows : [];

    // Doanh số/chỉ số dùng đúng các nguồn đang cấp cho 3 bảng theo dõi CLB Sao Việt.
    // Chạy tuần tự để tránh connection burst.
    const caNhanData = await withRetry(() => db.saoVietData.findMany({ where: { program: 'ca-nhan' } }));
    const tnKtmData = await withRetry(() => db.saoVietData.findMany({ where: { program: 'tn-ktm' } }));
    const tnTdData = await withRetry(() => db.saoVietData.findMany({ where: { program: 'tn-td' } }));

    const period = performancePeriod(year, month);
    const start = new Date(period.year, period.month - 1, 1);
    const end = new Date(period.year, period.month, 1);
    // Giống bảng theo dõi hiện tại: issueDate được ưu tiên; chỉ fallback effectiveDate nếu issueDate null.
    const monthContracts = await withRetry(() => db.contract.findMany({
      where: {
        OR: [
          { issueDate: { gte: start, lt: end } },
          { issueDate: null, effectiveDate: { gte: start, lt: end } },
        ],
      },
      select: { agentCode: true, fyp: true, issueDate: true, effectiveDate: true },
    }));

    const caNhanMap = new Map(caNhanData.map((row) => [normalizeCode(row.agentCode), row]));
    const tnKtmMap = new Map(tnKtmData.map((row) => [normalizeCode(row.agentCode), row]));
    const tnTdMap = new Map(tnTdData.map((row) => [normalizeCode(row.agentCode), row]));
    const monthlyFyp = new Map<string, number>();
    for (const contract of monthContracts) {
      const code = normalizeCode(contract.agentCode);
      if (!code) continue;
      monthlyFyp.set(code, (monthlyFyp.get(code) || 0) + Number(contract.fyp || 0));
    }

    const idx = period.thresholdIndex;
    const caNhanThresholds = {
      vang: CA_NHAN.vang[idx] * 1_000_000,
      bachkim: CA_NHAN.bachkim[idx] * 1_000_000,
      kimcuong: CA_NHAN.kimcuong[idx] * 1_000_000,
    };
    const tnKtmThresholds = {
      vang: TN_KTM.vang[idx] * 1_000_000,
      bachkim: TN_KTM.bachkim[idx] * 1_000_000,
      kimcuong: TN_KTM.kimcuong[idx] * 1_000_000,
    };
    const tnTdThresholds = {
      vang: { fyp: TN_TD.vangFyp[idx] * 1_000_000, hdc: TN_TD.vangHdc[idx] },
      bachkim: { fyp: TN_TD.bachkimFyp[idx] * 1_000_000, hdc: TN_TD.bachkimHdc[idx] },
    };

    const tvvRows = members.map((member: any) => {
      const code = normalizeCode(member.agentCode);
      const synced = caNhanMap.get(code);
      const fypLuyKe = Number(synced?.fyp || 0);
      const fypThang = monthlyFyp.get(code) || 0;
      const eligible = fypThang >= MONTHLY_FYP_MIN;
      return {
        ad: String(member.ad || ''),
        nhom: String(member.nhom || synced?.nhomKD || ''),
        agentCode: String(member.agentCode || ''),
        agentName: String(member.agentName || synced?.agentName || ''),
        chucVu: String(member.chucVu || ''),
        fypThang,
        fypLuyKe,
        eligible,
        rank: highestRank(fypLuyKe, caNhanThresholds, eligible),
      };
    }).sort((a: any, b: any) => b.fypLuyKe - a.fypLuyKe);

    const leaderMembers = members.filter((member: any) => isTBorTN(member.chucVu));
    const tnKtmRows = leaderMembers.map((member: any) => {
      const code = normalizeCode(member.agentCode);
      const synced = tnKtmMap.get(code);
      const fypLuyKe = Number(synced?.fyp || 0);
      return {
        ad: String(member.ad || ''),
        nhom: String(member.nhom || synced?.nhomKD || ''),
        agentCode: String(member.agentCode || ''),
        agentName: String(member.agentName || synced?.agentName || ''),
        chucVu: String(member.chucVu || ''),
        fypLuyKe,
        rank: highestRank(fypLuyKe, tnKtmThresholds, true),
      };
    }).sort((a: any, b: any) => b.fypLuyKe - a.fypLuyKe);

    const tnTdRows = leaderMembers.map((member: any) => {
      const code = normalizeCode(member.agentCode);
      const synced = tnTdMap.get(code);
      const fypTVVm = Number(synced?.fypTVVm || 0);
      const slTvvmHDC = Number(synced?.slTvvmHDC || 0);
      let rank = 'Chưa đạt';
      if (fypTVVm >= tnTdThresholds.bachkim.fyp && slTvvmHDC >= tnTdThresholds.bachkim.hdc) rank = 'Bạch Kim';
      else if (fypTVVm >= tnTdThresholds.vang.fyp && slTvvmHDC >= tnTdThresholds.vang.hdc) rank = 'Vàng';
      return {
        ad: String(member.ad || ''),
        nhom: String(member.nhom || synced?.nhomKD || ''),
        agentCode: String(member.agentCode || ''),
        agentName: String(member.agentName || synced?.agentName || ''),
        chucVu: String(member.chucVu || ''),
        fypTVVm,
        slTvvmHDC,
        rank,
      };
    }).sort((a: any, b: any) => b.fypTVVm - a.fypTVVm);

    const countRanks = (rows: Array<{ rank: string }>) => ({
      total: rows.length,
      vang: rows.filter((row) => row.rank === 'Vàng').length,
      bachkim: rows.filter((row) => row.rank === 'Bạch Kim').length,
      kimcuong: rows.filter((row) => row.rank === 'Kim Cương').length,
      chuaDat: rows.filter((row) => row.rank === 'Chưa đạt').length,
    });

    return NextResponse.json({
      assessment: { year, month, label: `1/${month}/${year}` },
      performancePeriod: period,
      source: 'DS thành viên Mục 3 + dữ liệu đồng bộ hiện tại của 3 bảng theo dõi CLB Sao Việt',
      thresholds: {
        tvv: { ...caNhanThresholds, monthlyFypMin: MONTHLY_FYP_MIN },
        tnKtm: tnKtmThresholds,
        tnTd: tnTdThresholds,
      },
      tvv: { summary: countRanks(tvvRows), rows: tvvRows },
      tnKtm: { summary: countRanks(tnKtmRows), rows: tnKtmRows },
      tnTd: { summary: countRanks(tnTdRows), rows: tnTdRows },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/danh-hieu error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể xét danh hiệu CLB' }, { status: 500 });
  }
}
