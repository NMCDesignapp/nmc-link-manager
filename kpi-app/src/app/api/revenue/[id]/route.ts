import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const revenue = await db.monthlyRevenue.update({
      where: { id },
      data: {
        ...(body.month !== undefined && { month: body.month }),
        ...(body.maNhom !== undefined && { maNhom: body.maNhom }),
        ...(body.nhom !== undefined && { nhom: body.nhom }),
        ...(body.agentCode !== undefined && { agentCode: body.agentCode }),
        ...(body.agentName !== undefined && { agentName: body.agentName }),
        ...(body.totalFYP !== undefined && { totalFYP: parseFloat(body.totalFYP) || 0 }),
        ...(body.totalAFYP !== undefined && { totalAFYP: parseFloat(body.totalAFYP) || 0 }),
        ...(body.contractCount !== undefined && { contractCount: parseInt(body.contractCount) || 0 }),
        ...(body.activityRounds !== undefined && { activityRounds: parseInt(body.activityRounds) || 0 }),
        ...(body.note !== undefined && { note: body.note }),
      },
    });
    return NextResponse.json(revenue);
  } catch (error) {
    console.error('PATCH /api/revenue/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update revenue' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.monthlyRevenue.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/revenue/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete revenue' }, { status: 500 });
  }
}
