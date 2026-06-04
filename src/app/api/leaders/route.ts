import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const leaders = await db.leaderInfo.findMany({ orderBy: { agentName: 'asc' } });
    return NextResponse.json(leaders);
  } catch (error) {
    console.error('GET /api/leaders error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk import mode (array of leaders)
    if (Array.isArray(body)) {
      const data = body
        .filter((r: any) => r.agentCode || r.agentName)
        .map((r: any) => ({
          agentCode: r.agentCode || '',
          agentName: r.agentName || '',
          position: r.position || '',
          ban: r.ban || '',
          nhom: r.nhom || '',
          maNhom: r.maNhom || '',
          salary: parseFloat(r.salary) || 0,
          phone: r.phone || '',
          email: r.email || '',
          note: r.note || '',
          startDate: r.startDate ? new Date(r.startDate) : null,
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      const result = await db.leaderInfo.createMany({ data, skipDuplicates: true });
      return NextResponse.json({ count: result.count }, { status: 201 });
    }

    // Single create mode
    const leader = await db.leaderInfo.create({
      data: {
        agentCode: body.agentCode || '',
        agentName: body.agentName || '',
        position: body.position || '',
        ban: body.ban || '',
        nhom: body.nhom || '',
        maNhom: body.maNhom || '',
        salary: parseFloat(body.salary) || 0,
        phone: body.phone || '',
        email: body.email || '',
        note: body.note || '',
        startDate: body.startDate ? new Date(body.startDate) : null,
      },
    });
    return NextResponse.json(leader, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Mã số đã tồn tại' }, { status: 400 });
    }
    console.error('POST /api/leaders error:', error);
    return NextResponse.json({ error: 'Failed to create leader' }, { status: 500 });
  }
}
