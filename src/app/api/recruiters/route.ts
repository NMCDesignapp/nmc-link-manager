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

// GET /api/recruiters - List all recruiters (NTD)
export async function GET() {
  try {
    const recruiters = await db.recruiter.findMany({
      select: {
        id: true, nhom: true, agentCode: true, agentName: true,
        position: true, startDate: true,
      },
      orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
    });
    return NextResponse.json(recruiters, {
      headers: { 'Cache-Control': 'no-store' },
    });
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

    // CSV import mode — use upsert by agentCode to preserve manual edits
    if (csvData) {
      const lines = csvData.split('\n').filter((line: string) => line.trim() !== '');
      const dataLines = lines.slice(1); // Skip header

      const recruiters: Array<{
        nhom: string;
        agentCode: string;
        agentName: string;
        position: string;
        startDate: Date | null;
      }> = [];

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
          startDate: safeDate(startDateStr),
        });
      }

      if (recruiters.length === 0) {
        return NextResponse.json(
          { error: 'Không tìm thấy dữ liệu hợp lệ trong CSV người tuyển dụng' },
          { status: 400 }
        );
      }

      // Upsert each recruiter by agentCode to preserve manual edits
      let upserted = 0;
      for (const r of recruiters) {
        try {
          await db.recruiter.upsert({
            where: { agentCode: r.agentCode },
            update: { nhom: r.nhom, agentName: r.agentName, position: r.position, startDate: r.startDate },
            create: r,
          });
          upserted++;
        } catch {
          // Skip individual errors
        }
      }

      return NextResponse.json({
        message: `Đã nhập ${upserted} người tuyển dụng`,
        count: upserted,
      });
    }

    // Bulk upsert mode (from members array) — preserves manual edits
    if (members && Array.isArray(members)) {
      const data = members
        .filter((m) => m.agentCode && m.agentName)
        .map((m) => ({
          nhom: m.nhom || '',
          agentCode: m.agentCode,
          agentName: m.agentName,
          position: m.position || '',
          startDate: safeDate(m.startDate),
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      // Use upsert-by-agentCode to preserve manual edits instead of deleteMany+createMany
      let upserted = 0;
      for (const item of data) {
        try {
          await db.recruiter.upsert({
            where: { agentCode: item.agentCode },
            update: { nhom: item.nhom, agentName: item.agentName, position: item.position, startDate: item.startDate },
            create: item,
          });
          upserted++;
        } catch {
          // Skip individual errors
        }
      }

      return NextResponse.json({
        message: `Đã nhập ${upserted} người tuyển dụng`,
        count: upserted,
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
        startDate: safeDate(startDate),
      },
    });

    return NextResponse.json(recruiter, { status: 201 });
  } catch (error) {
    console.error('Error creating recruiter:', error);
    return NextResponse.json({ error: 'Không thể thêm người tuyển dụng: ' + String(error) }, { status: 500 });
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
