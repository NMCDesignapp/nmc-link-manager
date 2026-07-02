import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pending-members — list all pending members
export async function GET() {
  try {
    const rows = await db.pendingMember.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/pending-members error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending members' }, { status: 500 });
  }
}

// POST /api/pending-members
// - Single create
// - Bulk import (append): array
// - Bulk REPLACE: { mode: 'replace', rows: [...] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseNum = (v: any) => typeof v === 'number' ? v : (parseFloat(String(v ?? '0').replace(/,/g, '')) || 0);

    // Mode: replace toàn bộ
    if (body && typeof body === 'object' && body.mode === 'replace' && Array.isArray(body.rows)) {
      const data = body.rows
        .filter((r: any) => r.agentCode || r.agentName)
        .map((r: any) => ({
          ad: String(r.ad || ''),
          nhom: String(r.nhom || ''),
          agentCode: String(r.agentCode || ''),
          agentName: String(r.agentName || ''),
          chucVu: String(r.chucVu || ''),
          ipT2: parseNum(r.ipT2),
          ipT1: parseNum(r.ipT1),
          ipT0: parseNum(r.ipT0),
          note: String(r.note || ''),
        }));
      await db.pendingMember.deleteMany({});
      if (data.length > 0) {
        await db.pendingMember.createMany({ data });
      }
      return NextResponse.json({ count: data.length, mode: 'replace' }, { status: 201 });
    }

    // Bulk append
    if (Array.isArray(body)) {
      const data = body
        .filter((r: any) => r.agentCode || r.agentName)
        .map((r: any) => ({
          ad: String(r.ad || ''),
          nhom: String(r.nhom || ''),
          agentCode: String(r.agentCode || ''),
          agentName: String(r.agentName || ''),
          chucVu: String(r.chucVu || ''),
          ipT2: parseNum(r.ipT2),
          ipT1: parseNum(r.ipT1),
          ipT0: parseNum(r.ipT0),
          note: String(r.note || ''),
        }));
      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }
      await db.pendingMember.createMany({ data });
      return NextResponse.json({ count: data.length, mode: 'append' }, { status: 201 });
    }

    // Single create
    const created = await db.pendingMember.create({
      data: {
        ad: String(body.ad || ''),
        nhom: String(body.nhom || ''),
        agentCode: String(body.agentCode || ''),
        agentName: String(body.agentName || ''),
        chucVu: String(body.chucVu || ''),
        ipT2: parseNum(body.ipT2),
        ipT1: parseNum(body.ipT1),
        ipT0: parseNum(body.ipT0),
        note: String(body.note || ''),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/pending-members error:', error);
    return NextResponse.json({ error: 'Failed to create pending member: ' + String(error) }, { status: 500 });
  }
}

// DELETE /api/pending-members?mode=delete-all
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    if (mode === 'delete-all') {
      await db.pendingMember.deleteMany({});
      return NextResponse.json({ success: true, deleted: 'all' });
    }
    return NextResponse.json({ error: 'Use /api/pending-members/[id] for single delete' }, { status: 400 });
  } catch (error) {
    console.error('DELETE /api/pending-members error:', error);
    return NextResponse.json({ error: 'Failed to delete pending members' }, { status: 500 });
  }
}
