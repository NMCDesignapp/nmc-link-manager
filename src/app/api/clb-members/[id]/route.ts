import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/clb-members/[id] — update single field
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await db.clbMember.update({
      where: { id },
      data: {
        ...(body.ad !== undefined && { ad: String(body.ad) }),
        ...(body.nhom !== undefined && { nhom: String(body.nhom) }),
        ...(body.agentCode !== undefined && { agentCode: String(body.agentCode) }),
        ...(body.agentName !== undefined && { agentName: String(body.agentName) }),
        ...(body.chucVu !== undefined && { chucVu: String(body.chucVu) }),
        ...(body.note !== undefined && { note: String(body.note) }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/clb-members/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update CLB member' }, { status: 500 });
  }
}

// DELETE /api/clb-members/[id] — delete single
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.clbMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/clb-members/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete CLB member' }, { status: 500 });
  }
}
