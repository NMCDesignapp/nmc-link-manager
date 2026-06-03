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
