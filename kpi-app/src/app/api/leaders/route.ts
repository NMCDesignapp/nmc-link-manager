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
          agentCode: String(r.agentCode || ''),
          agentName: String(r.agentName || ''),
          position: String(r.position || ''),
          ban: String(r.ban || ''),
          nhom: String(r.nhom || ''),
          maNhom: String(r.maNhom || ''),
          salary: typeof r.salary === 'number' ? r.salary : (parseFloat(String(r.salary || '0').replace(/,/g, '')) || 0),
          phone: String(r.phone || ''),
          email: String(r.email || ''),
          note: String(r.note || ''),
          startDate: r.startDate ? new Date(r.startDate + 'T00:00:00Z') : null,
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      // Use upsert to update existing leaders and create new ones
      let created = 0;
      let updated = 0;
      for (const item of data) {
        if (!item.agentCode) continue;
        try {
          const existing = await db.leaderInfo.findUnique({ where: { agentCode: item.agentCode } });
          if (existing) {
            await db.leaderInfo.update({ where: { agentCode: item.agentCode }, data: item });
            updated++;
          } else {
            await db.leaderInfo.create({ data: item });
            created++;
          }
        } catch {
          // Skip errors silently
        }
      }
      return NextResponse.json({ count: created + updated, created, updated }, { status: 201 });
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
        salary: typeof body.salary === 'number' ? body.salary : (parseFloat(body.salary) || 0),
        phone: body.phone || '',
        email: body.email || '',
        note: body.note || '',
        startDate: body.startDate ? new Date(body.startDate + 'T00:00:00Z') : null,
      },
    });
    return NextResponse.json(leader, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Mã số đã tồn tại' }, { status: 400 });
    }
    console.error('POST /api/leaders error:', error);
    return NextResponse.json({ error: 'Failed to create leader: ' + String(error) }, { status: 500 });
  }
}
