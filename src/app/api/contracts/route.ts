import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/contracts - List all contracts with optional date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.effectiveDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.effectiveDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.effectiveDate = {
        lte: new Date(endDate),
      };
    }

    const contracts = await db.contract.findMany({
      where,
      orderBy: { effectiveDate: 'asc' },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách hợp đồng' },
      { status: 500 }
    );
  }
}

// POST /api/contracts - Create a new contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractNumber, agentCode, agentName, position, ban, nhom, maNhom, leaderAgentCode, recruiterCode, startDate, effectiveDate, issueDate, fyp, afyp, tinhLuot } = body;

    if (!contractNumber || !agentName || !effectiveDate || fyp === undefined) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin hợp đồng' },
        { status: 400 }
      );
    }

    const contract = await db.contract.create({
      data: {
        contractNumber,
        agentCode: agentCode || '',
        agentName,
        position: position || '',
        ban: ban || '',
        nhom: nhom || '',
        maNhom: maNhom || '',
        leaderAgentCode: leaderAgentCode || '',
        recruiterCode: recruiterCode || '',
        startDate: startDate ? new Date(startDate) : null,
        effectiveDate: new Date(effectiveDate),
        issueDate: new Date(issueDate || effectiveDate),
        fyp: parseFloat(fyp) || 0,
        afyp: parseFloat(afyp) || 0,
        tinhLuot: parseFloat(tinhLuot) || 0,
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Số hợp đồng đã tồn tại' },
        { status: 409 }
      );
    }
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: 'Không thể tạo hợp đồng mới' },
      { status: 500 }
    );
  }
}

// DELETE /api/contracts - Delete a contract by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp ID hợp đồng' },
        { status: 400 }
      );
    }

    await db.contract.delete({ where: { id } });

    return NextResponse.json({ message: 'Đã xóa hợp đồng thành công' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json(
      { error: 'Không thể xóa hợp đồng' },
      { status: 500 }
    );
  }
}
