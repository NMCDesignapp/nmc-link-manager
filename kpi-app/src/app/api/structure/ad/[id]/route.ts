import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.maAD !== undefined) data.maAD = body.maAD;
    if (body.tenAD !== undefined) data.tenAD = body.tenAD;
    if (body.maPhong !== undefined) data.maPhong = body.maPhong;
    if (body.note !== undefined) data.note = body.note;
    const item = await db.aD.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH /api/structure/ad/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật AD' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.aD.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/structure/ad/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa AD' }, { status: 500 });
  }
}
