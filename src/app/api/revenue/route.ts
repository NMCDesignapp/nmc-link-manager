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
    // Support bulk create
    if (Array.isArray(body)) {
      const results = await db.monthlyRevenue.createMany({ data: body.map((r: any) => ({
        month: r.month || '',
        maNhom: r.maNhom || '',
        nhom: r.nhom || '',
        agentCode: r.agentCode || '',
        agentName: r.agentName || '',
        totalFYP: parseFloat(r.totalFYP) || 0,
        totalAFYP: parseFloat(r.totalAFYP) || 0,
        contractCount: parseInt(r.contractCount) || 0,
        activityRounds: parseInt(r.activityRounds) || 0,
        note: r.note || '',
      }))});
      return NextResponse.json({ count: results.count }, { status: 201 });
    }
    const revenue = await db.monthlyRevenue.create({
      data: {
        month: body.month || '',
        maNhom: body.maNhom || '',
        nhom: body.nhom || '',
        agentCode: body.agentCode || '',
        agentName: body.agentName || '',
        totalFYP: parseFloat(body.totalFYP) || 0,
        totalAFYP: parseFloat(body.totalAFYP) || 0,
        contractCount: parseInt(body.contractCount) || 0,
        activityRounds: parseInt(body.activityRounds) || 0,
        note: body.note || '',
      },
    });
    return NextResponse.json(revenue, { status: 201 });
  } catch (error) {
    console.error('POST /api/revenue error:', error);
    return NextResponse.json({ error: 'Failed to create revenue' }, { status: 500 });
  }
}
