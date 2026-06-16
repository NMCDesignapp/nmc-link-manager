import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: safe date parse
function safeDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.maBanNhom !== undefined) data.maBanNhom = body.maBanNhom;
    if (body.chucVu !== undefined) data.chucVu = body.chucVu;
    if (body.ngayBatDau !== undefined) data.ngayBatDau = body.ngayBatDau ? safeDate(body.ngayBatDau) : null;
    if (body.maTVVTuyendung !== undefined) data.maTVVTuyendung = body.maTVVTuyendung;
    if (body.note !== undefined) data.note = body.note;
    const item = await db.tVVStruct.update({ where: { id }, data });
    return NextResponse.json(item);
  } catch (error) {
    console.error('PATCH /api/structure/tvv/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật TVV' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.tVVStruct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/structure/tvv/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa TVV' }, { status: 500 });
  }
}
