import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.nhom !== undefined) data.nhom = body.nhom;
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.position !== undefined) data.position = body.position;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;

    const recruiter = await db.recruiter.update({ where: { id }, data });
    return NextResponse.json(recruiter);
  } catch (error) {
    console.error('PATCH /api/recruiters/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật người tuyển dụng' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.recruiter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/recruiters/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa người tuyển dụng' }, { status: 500 });
  }
}
