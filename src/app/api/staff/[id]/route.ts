import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.nhom !== undefined) data.nhom = body.nhom;
    if (body.maNhom !== undefined) data.maNhom = body.maNhom;
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.position !== undefined) data.position = body.position;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;

    const staff = await db.staff.update({ where: { id }, data });
    return NextResponse.json(staff);
  } catch (error) {
    console.error('PATCH /api/staff/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật nhân sự' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/staff/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa nhân sự' }, { status: 500 });
  }
}
