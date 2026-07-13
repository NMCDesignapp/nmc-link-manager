import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Parse date string (supports dd/mm/yyyy, yyyy-mm-dd, ISO) - UTC safe
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const s = dateStr.trim();
  // yyyy-mm-dd → UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  // dd/mm/yyyy → UTC
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const leader = await db.leaderInfo.update({
      where: { id },
      data: {
        ...(body.agentCode !== undefined && { agentCode: body.agentCode }),
        ...(body.agentName !== undefined && { agentName: body.agentName }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.ban !== undefined && { ban: body.ban }),
        ...(body.nhom !== undefined && { nhom: body.nhom }),
        ...(body.maNhom !== undefined && { maNhom: body.maNhom }),
        ...(body.salary !== undefined && { salary: parseFloat(body.salary) || 0 }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.note !== undefined && { note: body.note }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? parseDate(body.startDate) : null }),
      },
    });
    return NextResponse.json(leader);
  } catch (error) {
    console.error('PATCH /api/leaders/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update leader' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.leaderInfo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/leaders/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete leader' }, { status: 500 });
  }
}
