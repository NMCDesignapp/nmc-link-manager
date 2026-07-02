import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/pending-members/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parseNum = (v: any) => typeof v === 'number' ? v : (parseFloat(String(v ?? '0').replace(/,/g, '')) || 0);
    const updated = await db.pendingMember.update({
      where: { id },
      data: {
        ...(body.ad !== undefined && { ad: String(body.ad) }),
        ...(body.nhom !== undefined && { nhom: String(body.nhom) }),
        ...(body.agentCode !== undefined && { agentCode: String(body.agentCode) }),
        ...(body.agentName !== undefined && { agentName: String(body.agentName) }),
        ...(body.chucVu !== undefined && { chucVu: String(body.chucVu) }),
        ...(body.ipT2 !== undefined && { ipT2: parseNum(body.ipT2) }),
        ...(body.ipT1 !== undefined && { ipT1: parseNum(body.ipT1) }),
        ...(body.ipT0 !== undefined && { ipT0: parseNum(body.ipT0) }),
        ...(body.note !== undefined && { note: String(body.note) }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/pending-members/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update pending member' }, { status: 500 });
  }
}

// DELETE /api/pending-members/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.pendingMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pending-members/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete pending member' }, { status: 500 });
  }
}
