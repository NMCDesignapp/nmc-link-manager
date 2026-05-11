import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/staff - List all staff members
export async function GET() {
  try {
    const staff = await db.staff.findMany({
      select: {
        id: true, nhom: true, maNhom: true, agentCode: true, agentName: true,
        position: true, startDate: true,
      },
      orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
    });
    return NextResponse.json(staff, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách nhân sự' },
      { status: 500 }
    );
  }
}

// POST /api/staff - Create or bulk upsert staff members
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { members } = body as {
      members?: Array<{
        nhom?: string;
        maNhom?: string;
        agentCode: string;
        agentName: string;
        position?: string;
        startDate?: string;
      }>;
    };

    // Bulk upsert mode
    if (members && Array.isArray(members)) {
      // Clear existing staff first
      await db.staff.deleteMany();

      const staffData = members
        .filter((m) => m.agentCode && m.agentName)
        .map((m) => ({
          nhom: m.nhom || '',
          maNhom: m.maNhom || '',
          agentCode: m.agentCode,
          agentName: m.agentName,
          position: m.position || '',
          startDate: m.startDate ? new Date(m.startDate) : null,
        }));

      if (staffData.length === 0) {
        return NextResponse.json(
          { error: 'Không có nhân sự hợp lệ để nhập' },
          { status: 400 }
        );
      }

      const result = await db.staff.createMany({
        data: staffData,
        skipDuplicates: true,
      });

      return NextResponse.json({
        message: `Đã nhập ${result.count} nhân sự`,
        count: result.count,
      });
    }

    // Single create mode
    const {
      nhom,
      maNhom,
      agentCode,
      agentName,
      position,
      startDate,
    } = body;

    if (!agentCode || !agentName) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mã số và họ tên' },
        { status: 400 }
      );
    }

    const staff = await db.staff.upsert({
      where: { agentCode },
      update: {
        nhom: nhom || '',
        maNhom: maNhom || '',
        agentName,
        position: position || '',
        startDate: startDate ? new Date(startDate) : null,
      },
      create: {
        nhom: nhom || '',
        maNhom: maNhom || '',
        agentCode,
        agentName,
        position: position || '',
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Mã số đã tồn tại' },
        { status: 409 }
      );
    }
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Không thể thêm nhân sự' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff - Delete all staff
export async function DELETE() {
  try {
    await db.staff.deleteMany();
    return NextResponse.json({ message: 'Đã xóa toàn bộ danh sách nhân sự' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { error: 'Không thể xóa danh sách nhân sự' },
      { status: 500 }
    );
  }
}
