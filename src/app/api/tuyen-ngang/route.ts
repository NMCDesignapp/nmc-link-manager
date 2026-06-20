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

// GET /api/tuyen-ngang - List all TTN Tuyển Ngang
export async function GET() {
  try {
    const rows = await db.tuyenNgang.findMany({
      select: {
        id: true, nhom: true, agentCode: true, agentName: true,
        ngayBatDau: true, ngayHieuLuc: true,
        maNguoiTuyenDung: true, tenNguoiTuyenDung: true,
      },
      orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
    });
    return NextResponse.json(rows, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching tuyen-ngang:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách TTN Tuyển Ngang' },
      { status: 500 }
    );
  }
}

// POST /api/tuyen-ngang - Bulk upsert from CSV or members array
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { members, csvData } = body as {
      members?: Array<{
        nhom?: string;
        agentCode: string;
        agentName: string;
        ngayBatDau?: string;
        ngayHieuLuc?: string;
        maNguoiTuyenDung?: string;
        tenNguoiTuyenDung?: string;
      }>;
      csvData?: string;
    };

    // CSV import mode — use upsert by agentCode
    // Columns: STT, NHÓM, MÃ TVV, HỌ TÊN, Ngày bắt đầu LV, Ngày hiệu lực CV, MÃ NGƯỜI TD, TÊN NGƯỜI TD
    if (csvData) {
      const lines = csvData.split('\n').filter((line: string) => line.trim() !== '');
      const dataLines = lines.slice(1); // Skip header

      const rows: Array<{
        nhom: string;
        agentCode: string;
        agentName: string;
        ngayBatDau: Date | null;
        ngayHieuLuc: Date | null;
        maNguoiTuyenDung: string;
        tenNguoiTuyenDung: string;
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

        // Column mapping (8 columns):
        // 0: STT, 1: Nhóm, 2: Mã TVV, 3: Họ tên, 4: Ngày bắt đầu LV, 5: Ngày hiệu lực CV, 6: Mã người TD, 7: Tên người TD
        const nhom = columns[1] || '';
        const agentCode = columns[2] || '';
        const agentName = columns[3] || '';
        const ngayBatDauStr = columns[4] || '';
        const ngayHieuLucStr = columns[5] || '';
        const maNguoiTuyenDung = columns[6] || '';
        const tenNguoiTuyenDung = columns[7] || '';

        if (!agentCode || !agentName) continue;

        rows.push({
          nhom,
          agentCode,
          agentName,
          ngayBatDau: safeDate(ngayBatDauStr),
          ngayHieuLuc: safeDate(ngayHieuLucStr),
          maNguoiTuyenDung,
          tenNguoiTuyenDung,
        });
      }

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'Không tìm thấy dữ liệu hợp lệ trong CSV TTN Tuyển Ngang' },
          { status: 400 }
        );
      }

      let created = 0;
      let updated = 0;
      for (const r of rows) {
        try {
          const existing = await db.tuyenNgang.findUnique({ where: { agentCode: r.agentCode } });
          if (existing) {
            await db.tuyenNgang.update({ where: { agentCode: r.agentCode }, data: r });
            updated++;
          } else {
            await db.tuyenNgang.create({ data: r });
            created++;
          }
        } catch {
          // Skip errors
        }
      }

      return NextResponse.json({
        message: `Đã nhập ${created} mới, cập nhật ${updated} TTN Tuyển Ngang`,
        count: created + updated,
        created,
        updated,
      });
    }

    // Bulk upsert mode (from members array)
    if (members && Array.isArray(members)) {
      const data = members
        .filter((m) => m.agentCode && m.agentName)
        .map((m) => ({
          nhom: m.nhom || '',
          agentCode: m.agentCode,
          agentName: m.agentName,
          ngayBatDau: safeDate(m.ngayBatDau),
          ngayHieuLuc: safeDate(m.ngayHieuLuc),
          maNguoiTuyenDung: m.maNguoiTuyenDung || '',
          tenNguoiTuyenDung: m.tenNguoiTuyenDung || '',
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      let created = 0;
      let updated = 0;
      for (const item of data) {
        try {
          const existing = await db.tuyenNgang.findUnique({ where: { agentCode: item.agentCode } });
          if (existing) {
            await db.tuyenNgang.update({ where: { agentCode: item.agentCode }, data: item });
            updated++;
          } else {
            await db.tuyenNgang.create({ data: item });
            created++;
          }
        } catch {
          // Skip errors
        }
      }

      return NextResponse.json({
        message: `Đã nhập ${created} mới, cập nhật ${updated} TTN Tuyển Ngang`,
        count: created + updated,
        created,
        updated,
      });
    }

    // Single create mode
    const { nhom, agentCode, agentName, ngayBatDau, ngayHieuLuc, maNguoiTuyenDung, tenNguoiTuyenDung } = body;
    if (!agentCode || !agentName) {
      return NextResponse.json({ error: 'Vui lòng nhập mã TVV và họ tên' }, { status: 400 });
    }

    const row = await db.tuyenNgang.create({
      data: {
        nhom: nhom || '',
        agentCode,
        agentName,
        ngayBatDau: safeDate(ngayBatDau),
        ngayHieuLuc: safeDate(ngayHieuLuc),
        maNguoiTuyenDung: maNguoiTuyenDung || '',
        tenNguoiTuyenDung: tenNguoiTuyenDung || '',
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Error creating tuyen-ngang:', error);
    return NextResponse.json({ error: 'Không thể thêm TTN Tuyển Ngang: ' + String(error) }, { status: 500 });
  }
}

// DELETE /api/tuyen-ngang - Delete all
export async function DELETE() {
  try {
    await db.tuyenNgang.deleteMany();
    return NextResponse.json({ message: 'Đã xóa toàn bộ danh sách TTN Tuyển Ngang' });
  } catch (error) {
    console.error('Error deleting tuyen-ngang:', error);
    return NextResponse.json({ error: 'Không thể xóa danh sách TTN Tuyển Ngang' }, { status: 500 });
  }
}
