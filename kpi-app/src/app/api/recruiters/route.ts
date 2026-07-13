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

// Self-heal migration: đảm bảo cột ngayHieuLuc tồn tại (Vercel không tự chạy migrate deploy)
async function ensureNgayHieuLucColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Recruiter" ADD COLUMN IF NOT EXISTS "ngayHieuLuc" TIMESTAMP(3)');
  } catch (e) {
    console.warn('[ensureNgayHieuLucColumn] Skipped:', (e as Error)?.message);
  }
}

// GET /api/recruiters - List all recruiters (NTD)
export async function GET() {
  try {
    let recruiters;
    try {
      recruiters = await db.recruiter.findMany({
        select: {
          id: true, nhom: true, agentCode: true, agentName: true,
          position: true, startDate: true, ngayHieuLuc: true,
        },
        orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
      });
    } catch (err) {
      // Có thể do thiếu cột ngayHieuLuc — self-heal rồi retry
      console.warn('[GET /api/recruiters] First attempt failed, trying self-heal:', (err as Error)?.message);
      await ensureNgayHieuLucColumn();
      recruiters = await db.recruiter.findMany({
        select: {
          id: true, nhom: true, agentCode: true, agentName: true,
          position: true, startDate: true, ngayHieuLuc: true,
        },
        orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
      });
    }
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
    // Đảm bảo DB có cột ngayHieuLuc trước khi query/create (self-heal)
    await ensureNgayHieuLucColumn();
    const { members, csvData } = body as {
      members?: Array<{
        nhom?: string;
        agentCode: string;
        agentName: string;
        position?: string;
        startDate?: string;
        ngayHieuLuc?: string;
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
        ngayHieuLuc: Date | null;
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

        // Column mapping (7 columns):
        // 0: STT, 1: Nhóm, 2: Mã số, 3: Họ tên, 4: Chức vụ, 5: Ngày bắt đầu, 6: Ngày hiệu lực chức vụ
        const nhom = columns[1] || '';
        const agentCode = columns[2] || '';
        const agentName = columns[3] || '';
        const position = columns[4] || '';
        const startDateStr = columns[5] || '';
        const ngayHieuLucStr = columns[6] || '';

        if (!agentCode || !agentName) continue;

        recruiters.push({
          nhom,
          agentCode,
          agentName,
          position,
          startDate: safeDate(startDateStr),
          ngayHieuLuc: safeDate(ngayHieuLucStr),
        });
      }

      if (recruiters.length === 0) {
        return NextResponse.json(
          { error: 'Không tìm thấy dữ liệu hợp lệ trong CSV người tuyển dụng' },
          { status: 400 }
        );
      }

      // Upsert recruiters — update existing, create new
      let created = 0;
      let updated = 0;
      for (const r of recruiters) {
        try {
          const existing = await db.recruiter.findUnique({ where: { agentCode: r.agentCode } });
          if (existing) {
            await db.recruiter.update({ where: { agentCode: r.agentCode }, data: r });
            updated++;
          } else {
            await db.recruiter.create({ data: r });
            created++;
          }
        } catch {
          // Skip errors
        }
      }

      return NextResponse.json({
        message: `Đã nhập ${created} mới, cập nhật ${updated} người tuyển dụng`,
        count: created + updated,
        created,
        updated,
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
          ngayHieuLuc: safeDate(m.ngayHieuLuc),
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      // Upsert recruiters — update existing, create new
      let created = 0;
      let updated = 0;
      for (const item of data) {
        try {
          const existing = await db.recruiter.findUnique({ where: { agentCode: item.agentCode } });
          if (existing) {
            await db.recruiter.update({ where: { agentCode: item.agentCode }, data: item });
            updated++;
          } else {
            await db.recruiter.create({ data: item });
            created++;
          }
        } catch {
          // Skip errors
        }
      }

      return NextResponse.json({
        message: `Đã nhập ${created} mới, cập nhật ${updated} người tuyển dụng`,
        count: created + updated,
        created,
        updated,
      });
    }

    // Single create mode
    const { nhom, agentCode, agentName, position, startDate, ngayHieuLuc } = body;
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
        ngayHieuLuc: safeDate(ngayHieuLuc),
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
