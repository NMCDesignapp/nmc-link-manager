import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.maPhong !== undefined) data.maPhong = body.maPhong;
    if (body.tenPhong !== undefined) data.tenPhong = body.tenPhong;
    if (body.note !== undefined) data.note = body.note;
    const item = await db.phong.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH /api/structure/phong/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật phòng' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.phong.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/structure/phong/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa phòng' }, { status: 500 });
  }
}
