import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const where: any = {};
    if (month) where.month = month;
    const revenue = await db.monthlyRevenue.findMany({
      where,
      orderBy: [{ month: 'desc' }, { nhom: 'asc' }],
    });
    return NextResponse.json(revenue);
  } catch (error) {
    console.error('GET /api/revenue error:', error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support bulk create with members array (per-month replace mode)
    // Chỉ xóa dữ liệu của tháng đang import, giữ nguyên các tháng khác
    if (body.members && Array.isArray(body.members)) {
      const members = body.members as Array<{
        month?: string;
        maNhom?: string;
        nhom?: string;
        agentCode?: string;
        agentName?: string;
        totalFYP?: number | string;
        totalAFYP?: number | string;
        contractCount?: number | string;
        activityRounds?: number | string;
        note?: string;
      }>;

      const data = members
        .filter((m) => m.month || m.agentCode || m.agentName)
        .map((m) => ({
          month: String(m.month || ''),
          maNhom: String(m.maNhom || ''),
          nhom: String(m.nhom || ''),
          agentCode: String(m.agentCode || ''),
          agentName: String(m.agentName || ''),
          totalFYP: typeof m.totalFYP === 'number' ? m.totalFYP : (parseFloat(String(m.totalFYP || '0').replace(/,/g, '')) || 0),
          totalAFYP: typeof m.totalAFYP === 'number' ? m.totalAFYP : (parseFloat(String(m.totalAFYP || '0').replace(/,/g, '')) || 0),
          contractCount: typeof m.contractCount === 'number' ? Math.round(m.contractCount) : (parseInt(String(m.contractCount || '0').replace(/,/g, '')) || 0),
          activityRounds: typeof m.activityRounds === 'number' ? Math.round(m.activityRounds) : (parseInt(String(m.activityRounds || '0').replace(/,/g, '')) || 0),
          note: String(m.note || ''),
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu doanh số hợp lệ' }, { status: 400 });
      }

      // Tìm tất cả các tháng trong data import
      const monthsInData = [...new Set(data.map(d => d.month).filter(Boolean))];
      if (monthsInData.length > 0) {
        // Chỉ xóa dữ liệu của các tháng đang import (thay thế tháng đó, giữ tháng khác)
        await db.monthlyRevenue.deleteMany({
          where: { month: { in: monthsInData } }
        });
      }

      const result = await db.monthlyRevenue.createMany({ data, skipDuplicates: true });
      return NextResponse.json({
        count: result.count,
        months: monthsInData,
        message: `Đã nhập ${result.count} dòng doanh số cho tháng: ${monthsInData.join(', ')}`
      }, { status: 201 });
    }

    // Support bulk create (plain array - append mode)
    if (Array.isArray(body)) {
      const results = await db.monthlyRevenue.createMany({ data: body.map((r: any) => ({
        month: String(r.month || ''),
        maNhom: String(r.maNhom || ''),
        nhom: String(r.nhom || ''),
        agentCode: String(r.agentCode || ''),
        agentName: String(r.agentName || ''),
        totalFYP: typeof r.totalFYP === 'number' ? r.totalFYP : (parseFloat(String(r.totalFYP || '0').replace(/,/g, '')) || 0),
        totalAFYP: typeof r.totalAFYP === 'number' ? r.totalAFYP : (parseFloat(String(r.totalAFYP || '0').replace(/,/g, '')) || 0),
        contractCount: typeof r.contractCount === 'number' ? Math.round(r.contractCount) : (parseInt(String(r.contractCount || '0').replace(/,/g, '')) || 0),
        activityRounds: typeof r.activityRounds === 'number' ? Math.round(r.activityRounds) : (parseInt(String(r.activityRounds || '0').replace(/,/g, '')) || 0),
        note: String(r.note || ''),
      }))});
      return NextResponse.json({ count: results.count }, { status: 201 });
    }

    // Single create mode
    const revenue = await db.monthlyRevenue.create({
      data: {
        month: String(body.month || ''),
        maNhom: String(body.maNhom || ''),
        nhom: String(body.nhom || ''),
        agentCode: String(body.agentCode || ''),
        agentName: String(body.agentName || ''),
        totalFYP: parseFloat(body.totalFYP) || 0,
        totalAFYP: parseFloat(body.totalAFYP) || 0,
        contractCount: parseInt(body.contractCount) || 0,
        activityRounds: parseInt(body.activityRounds) || 0,
        note: String(body.note || ''),
      },
    });
    return NextResponse.json(revenue, { status: 201 });
  } catch (error) {
    console.error('POST /api/revenue error:', error);
    return NextResponse.json({ error: 'Failed to create revenue: ' + String(error) }, { status: 500 });
  }
}
