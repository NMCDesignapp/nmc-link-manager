import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.maBanNhom !== undefined) data.maBanNhom = body.maBanNhom;
    if (body.tenBanNhom !== undefined) data.tenBanNhom = body.tenBanNhom;
    if (body.maAD !== undefined) data.maAD = body.maAD;
    if (body.note !== undefined) data.note = body.note;
    const item = await db.banNhom.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH /api/structure/bannhom/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật Ban/Nhóm' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.banNhom.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/structure/bannhom/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa Ban/Nhóm' }, { status: 500 });
  }
}
