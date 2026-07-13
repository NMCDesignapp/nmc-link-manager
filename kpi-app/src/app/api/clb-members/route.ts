import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/clb-members — list all CLB members (đồng bộ đa thiết bị)
export async function GET() {
  try {
    const rows = await db.clbMember.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/clb-members error:', error);
    return NextResponse.json({ error: 'Failed to fetch CLB members' }, { status: 500 });
  }
}

// POST /api/clb-members
// - Single create: { ad, nhom, agentCode, agentName, chucVu, note }
// - Bulk import (append): array of same shape → inserts all (không xóa dữ liệu cũ)
// - Bulk REPLACE: { mode: 'replace', rows: [...] } → xóa hết rồi insert rows mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Mode: replace toàn bộ (dùng khi user muốn sync từ Excel, xóa data cũ)
    if (body && typeof body === 'object' && body.mode === 'replace' && Array.isArray(body.rows)) {
      const data = body.rows
        .filter((r: any) => r.agentCode || r.agentName)
        .map((r: any) => ({
          ad: String(r.ad || ''),
          nhom: String(r.nhom || ''),
          agentCode: String(r.agentCode || ''),
          agentName: String(r.agentName || ''),
          chucVu: String(r.chucVu || ''),
          note: String(r.note || ''),
        }));
      await db.clbMember.deleteMany({});
      if (data.length > 0) {
        await db.clbMember.createMany({ data });
      }
      return NextResponse.json({ count: data.length, mode: 'replace' }, { status: 201 });
    }

    // Bulk import (append)
    if (Array.isArray(body)) {
      const data = body
        .filter((r: any) => r.agentCode || r.agentName)
        .map((r: any) => ({
          ad: String(r.ad || ''),
          nhom: String(r.nhom || ''),
          agentCode: String(r.agentCode || ''),
          agentName: String(r.agentName || ''),
          chucVu: String(r.chucVu || ''),
          note: String(r.note || ''),
        }));
      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }
      await db.clbMember.createMany({ data });
      return NextResponse.json({ count: data.length, mode: 'append' }, { status: 201 });
    }

    // Single create
    const created = await db.clbMember.create({
      data: {
        ad: String(body.ad || ''),
        nhom: String(body.nhom || ''),
        agentCode: String(body.agentCode || ''),
        agentName: String(body.agentName || ''),
        chucVu: String(body.chucVu || ''),
        note: String(body.note || ''),
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/clb-members error:', error);
    return NextResponse.json({ error: 'Failed to create CLB member: ' + String(error) }, { status: 500 });
  }
}

// DELETE /api/clb-members — xóa toàn bộ (body: { mode: 'delete-all' })
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode');
    if (mode === 'delete-all') {
      await db.clbMember.deleteMany({});
      return NextResponse.json({ success: true, deleted: 'all' });
    }
    return NextResponse.json({ error: 'Use /api/clb-members/[id] for single delete' }, { status: 400 });
  } catch (error) {
    console.error('DELETE /api/clb-members error:', error);
    return NextResponse.json({ error: 'Failed to delete CLB members' }, { status: 500 });
  }
}
