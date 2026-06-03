import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.contractNumber !== undefined) data.contractNumber = body.contractNumber;
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.position !== undefined) data.position = body.position;
    if (body.ban !== undefined) data.ban = body.ban;
    if (body.nhom !== undefined) data.nhom = body.nhom;
    if (body.maNhom !== undefined) data.maNhom = body.maNhom;
    if (body.leaderAgentCode !== undefined) data.leaderAgentCode = body.leaderAgentCode;
    if (body.recruiterCode !== undefined) data.recruiterCode = body.recruiterCode;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.effectiveDate !== undefined) data.effectiveDate = new Date(body.effectiveDate);
    if (body.issueDate !== undefined) data.issueDate = body.issueDate ? new Date(body.issueDate) : new Date(body.effectiveDate || Date.now());
    if (body.fyp !== undefined) data.fyp = parseFloat(body.fyp) || 0;
    if (body.afyp !== undefined) data.afyp = parseFloat(body.afyp) || 0;
    if (body.tinhLuot !== undefined) data.tinhLuot = parseFloat(body.tinhLuot) || 0;

    const contract = await db.contract.update({ where: { id }, data });
    return NextResponse.json(contract);
  } catch (error) {
    console.error('PATCH /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật hợp đồng' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.contract.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa hợp đồng' }, { status: 500 });
  }
}
