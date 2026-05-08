import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff/[id] - Get single staff member
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = await db.staff.findUnique({ where: { id } });
    if (!staff) {
      return NextResponse.json(
        { error: 'Không tìm thấy nhân sự' },
        { status: 404 }
      );
    }
    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Không thể tải thông tin nhân sự' },
      { status: 500 }
    );
  }
}

// PATCH /api/staff/[id] - Update staff member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { agentName, position, ban, nhom, maNhom, leaderAgentCode, recruiterCode, startDate } = body;

    const staff = await db.staff.update({
      where: { id },
      data: {
        ...(agentName !== undefined && { agentName }),
        ...(position !== undefined && { position }),
        ...(ban !== undefined && { ban }),
        ...(nhom !== undefined && { nhom }),
        ...(maNhom !== undefined && { maNhom }),
        ...(leaderAgentCode !== undefined && { leaderAgentCode }),
        ...(recruiterCode !== undefined && { recruiterCode }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: 'Không thể cập nhật nhân sự' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/[id] - Delete single staff member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.staff.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xóa nhân sự thành công' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { error: 'Không thể xóa nhân sự' },
      { status: 500 }
    );
  }
}
