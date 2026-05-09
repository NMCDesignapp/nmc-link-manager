import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

// GET /api/recruiters - List all recruiters (NTD)
export async function GET() {
  try {
    const recruiters = await db.recruiter.findMany({
      orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
    });
    return NextResponse.json(recruiters);
  } catch (error) {
    console.error('Error fetching recruiters:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách người tuyển dụng' },
      { status: 500 }
    );
  }
}

// POST /api/recruiters - Bulk upsert from CSV or members array
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { members, csvData } = body as {
      members?: Array<{
        nhom?: string;
        agentCode: string;
        agentName: string;
        position?: string;
        startDate?: string;
      }>;
      csvData?: string;
    };

    // CSV import mode
    if (csvData) {
      await db.recruiter.deleteMany();
      const lines = csvData.split('\n').filter((line: string) => line.trim() !== '');
      const dataLines = lines.slice(1); // Skip header

      const recruiters = [];
      for (const line of dataLines) {
        const columns: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') { inQuotes = !inQuotes; }
          else if (char === ',' && !inQuotes) { columns.push(current.trim()); current = ''; }
          else { current += char; }
        }
        columns.push(current.trim());

        // Column mapping (6 columns):
        // 0: STT, 1: Nhóm, 2: Mã số, 3: Họ tên, 4: Chức vụ, 5: Ngày bắt đầu
        const nhom = columns[1] || '';
        const agentCode = columns[2] || '';
        const agentName = columns[3] || '';
        const position = columns[4] || '';
        const startDateStr = columns[5] || '';

        if (!agentCode || !agentName) continue;

        recruiters.push({
          nhom,
          agentCode,
          agentName,
          position,
          startDate: parseDate(startDateStr),
        });
      }

      if (recruiters.length === 0) {
        return NextResponse.json(
          { error: 'Không tìm thấy dữ liệu hợp lệ trong CSV người tuyển dụng' },
          { status: 400 }
        );
      }

      const result = await db.recruiter.createMany({
        data: recruiters,
        skipDuplicates: true,
      });

      return NextResponse.json({
        message: `Đã nhập ${result.count} người tuyển dụng`,
        count: result.count,
      });
    }

    // Bulk upsert mode (from members array)
    if (members && Array.isArray(members)) {
      await db.recruiter.deleteMany();
      const data = members
        .filter((m) => m.agentCode && m.agentName)
        .map((m) => ({
          nhom: m.nhom || '',
          agentCode: m.agentCode,
          agentName: m.agentName,
          position: m.position || '',
          startDate: m.startDate ? parseDate(m.startDate) : null,
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      const result = await db.recruiter.createMany({ data, skipDuplicates: true });
      return NextResponse.json({
        message: `Đã nhập ${result.count} người tuyển dụng`,
        count: result.count,
      });
    }

    // Single create mode
    const { nhom, agentCode, agentName, position, startDate } = body;
    if (!agentCode || !agentName) {
      return NextResponse.json({ error: 'Vui lòng nhập mã số và họ tên' }, { status: 400 });
    }

    const recruiter = await db.recruiter.create({
      data: {
        nhom: nhom || '',
        agentCode,
        agentName,
        position: position || '',
        startDate: startDate ? parseDate(startDate) : null,
      },
    });

    return NextResponse.json(recruiter, { status: 201 });
  } catch (error) {
    console.error('Error creating recruiter:', error);
    return NextResponse.json({ error: 'Không thể thêm người tuyển dụng' }, { status: 500 });
  }
}

// DELETE /api/recruiters - Delete all
export async function DELETE() {
  try {
    await db.recruiter.deleteMany();
    return NextResponse.json({ message: 'Đã xóa toàn bộ danh sách người tuyển dụng' });
  } catch (error) {
    console.error('Error deleting recruiters:', error);
    return NextResponse.json({ error: 'Không thể xóa danh sách người tuyển dụng' }, { status: 500 });
  }
}
