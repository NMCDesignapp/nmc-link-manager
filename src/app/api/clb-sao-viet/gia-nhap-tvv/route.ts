import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ENTRY_IP_THRESHOLD = 60_000_000;

type MonthRef = { year: number; month: number; key: string; label: string };

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
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
    const windowStart = new Date(Date.UTC(months[0].year, months[0].month - 1, 1));
    const assessmentStart = new Date(Date.UTC(year, month - 1, 1));

    const [tvvStruct, clbMembers, banNhomRows, adRows, contracts] = await Promise.all([
      db.tVVStruct.findMany({
        select: { id: true, agentCode: true, agentName: true, maBanNhom: true, chucVu: true },
      }),
      db.clbMember.findMany({ select: { agentCode: true } }),
      db.banNhom.findMany({ select: { maBanNhom: true, tenBanNhom: true, maAD: true } }),
      db.aD.findMany({ select: { maAD: true, tenAD: true } }),
      db.contract.findMany({
        where: { issueDate: { gte: windowStart, lt: assessmentStart } },
        select: { agentCode: true, pdt10DT: true, issueDate: true },
      }),
    ]);

    const clbCodes = new Set(clbMembers.map((m) => normalizeCode(m.agentCode)).filter(Boolean));
    const banNhomByCode = new Map(banNhomRows.map((row) => [String(row.maBanNhom || '').trim(), row]));
    const adByCode = new Map(adRows.map((row) => [String(row.maAD || '').trim(), row.tenAD || row.maAD || '']));
    const monthKeys = new Set(months.map((m) => m.key));
    const totals = new Map<string, Map<string, number>>();

    for (const contract of contracts) {
      const code = normalizeCode(contract.agentCode);
      if (!code || !contract.issueDate) continue;
      const date = new Date(contract.issueDate);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthKeys.has(key)) continue;
      const byMonth = totals.get(code) || new Map<string, number>();
      byMonth.set(key, (byMonth.get(key) || 0) + Number(contract.pdt10DT || 0));
      totals.set(code, byMonth);
    }

    // Gia nhập TVV: lấy TOÀN BỘ DS TVV trong Cấu trúc, kể cả người đang là TB/TN/TTN.
    // Chỉ loại những mã đã có trong DS Thành viên CLB Sao Việt.
    const rows = tvvStruct
      .filter((tvv) => {
        const code = normalizeCode(tvv.agentCode);
        return Boolean(code) && !clbCodes.has(code);
      })
      .map((tvv) => {
        const code = normalizeCode(tvv.agentCode);
        const byMonth = totals.get(code) || new Map<string, number>();
        const monthlyIP = months.map((m) => Number(byMonth.get(m.key) || 0));
        const totalIP = monthlyIP.reduce((sum, value) => sum + value, 0);
        const passed = totalIP >= ENTRY_IP_THRESHOLD;
        const group = banNhomByCode.get(String(tvv.maBanNhom || '').trim());
        return {
          id: tvv.id,
          ad: group ? (adByCode.get(String(group.maAD || '').trim()) || group.maAD || '') : '',
          nhom: group?.tenBanNhom || '',
          maBanNhom: tvv.maBanNhom || '',
          agentCode: tvv.agentCode || '',
          agentName: tvv.agentName || '',
          chucVu: tvv.chucVu || '',
          monthlyIP,
          totalIP,
          passed,
          result: passed ? 'Đạt gia nhập TVV' : 'Chưa đạt',
        };
      })
      .sort((a, b) => String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' }));

    const passed = rows.filter((row) => row.passed).length;
    return NextResponse.json({
      assessment: { year, month, label: `1/${month}/${year}` },
      months,
      rule: {
        ipThreshold: ENTRY_IP_THRESHOLD,
        description: 'Gia nhập TVV khi Tổng IP 3 tháng liền trước từ 60.000.000 trở lên; doanh số tính theo Ngày phát hành',
      },
      summary: { total: rows.length, passed, failed: rows.length - passed },
      rows,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/gia-nhap-tvv error:', error);
    return NextResponse.json({ error: 'Không thể tính kết quả gia nhập TVV' }, { status: 500 });
  }
}
