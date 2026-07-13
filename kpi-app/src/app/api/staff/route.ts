import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper: safe date parse - ensures date string is treated as UTC midnight
function safeDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

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
      headers: { 'Cache-Control': 'no-store' },
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

    // Bulk upsert mode — batch insert then update for speed
    if (members && Array.isArray(members)) {
      const staffData = members
        .filter((m) => m.agentCode && m.agentName)
        .map((m) => ({
          nhom: m.nhom || '',
          maNhom: m.maNhom || '',
          agentCode: m.agentCode,
          agentName: m.agentName,
          position: m.position || '',
          startDate: safeDate(m.startDate),
        }));

      if (staffData.length === 0) {
        return NextResponse.json(
          { error: 'Không có nhân sự hợp lệ để nhập' },
          { status: 400 }
        );
      }

      // Step 1: Insert new records in one batch (skip existing agentCodes)
      let created = 0;
      try {
        const result = await db.staff.createMany({
          data: staffData,
          skipDuplicates: true,
        });
        created = result.count;
      } catch {
        // Fallback if createMany fails
      }

      // Step 2: Update existing records individually (only those that were skipped)
      const existingCodes = new Set(
        (await db.staff.findMany({
          where: { agentCode: { in: staffData.map(d => d.agentCode) } },
          select: { agentCode: true },
        })).map(s => s.agentCode)
      );

      let updated = 0;
      const itemsToUpdate = staffData.filter(d => existingCodes.has(d.agentCode));
      for (const item of itemsToUpdate) {
        try {
          await db.staff.update({
            where: { agentCode: item.agentCode },
            data: { nhom: item.nhom, maNhom: item.maNhom, agentName: item.agentName, position: item.position, startDate: item.startDate },
          });
          updated++;
        } catch {
          // Skip individual errors
        }
      }

      const total = created + updated;
      return NextResponse.json({
        message: `Đã nhập ${total} nhân sự (mới: ${created}, cập nhật: ${updated})`,
        count: total,
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
        startDate: safeDate(startDate),
      },
      create: {
        nhom: nhom || '',
        maNhom: maNhom || '',
        agentCode,
        agentName,
        position: position || '',
        startDate: safeDate(startDate),
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
      { error: 'Không thể thêm nhân sự: ' + String(error) },
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
