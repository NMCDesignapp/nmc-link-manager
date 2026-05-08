import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) {
    // Try ISO format
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

// GET /api/recruiters - List all recruiters
export async function GET() {
  try {
    const recruiters = await db.recruiter.findMany({
      orderBy: [{ ban: 'asc' }, { nhom: 'asc' }, { nydName: 'asc' }],
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

// POST /api/recruiters - Bulk upsert from CSV or single create
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { members, csvData } = body as {
      members?: Array<{
        nydCode: string;
        nydName: string;
        position?: string;
        ban?: string;
        nhom?: string;
        maNhom?: string;
        recruitedAgentCode: string;
        recruitedAgentName?: string;
        recruitedStartDate?: string;
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

        // Column mapping:
        // 0: STT, 1: Mã NYD, 2: Tên NYD, 3: Chức vụ, 4: Ban,
        // 5: Nhóm, 6: Mã nhóm, 7: Mã TVV được tuyển, 8: Tên TVV, 9: Ngày bắt đầu TVV
        const nydCode = columns[1] || '';
        const nydName = columns[2] || '';
        const position = columns[3] || '';
        const ban = columns[4] || '';
        const nhom = columns[5] || '';
        const maNhom = columns[6] || '';
        const recruitedAgentCode = columns[7] || '';
        const recruitedAgentName = columns[8] || '';
        const recruitedStartDateStr = columns[9] || '';

        if (!nydCode || !recruitedAgentCode) continue;

        recruiters.push({
          nydCode,
          nydName,
          position,
          ban,
          nhom,
          maNhom,
          recruitedAgentCode,
          recruitedAgentName,
          recruitedStartDate: parseDate(recruitedStartDateStr),
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
        message: `Đã nhập ${result.count} dòng người tuyển dụng`,
        count: result.count,
      });
    }

    // Bulk upsert mode (from members array)
    if (members && Array.isArray(members)) {
      await db.recruiter.deleteMany();
      const data = members
        .filter((m) => m.nydCode && m.recruitedAgentCode)
        .map((m) => ({
          nydCode: m.nydCode,
          nydName: m.nydName || '',
          position: m.position || '',
          ban: m.ban || '',
          nhom: m.nhom || '',
          maNhom: m.maNhom || '',
          recruitedAgentCode: m.recruitedAgentCode,
          recruitedAgentName: m.recruitedAgentName || '',
          recruitedStartDate: m.recruitedStartDate ? parseDate(m.recruitedStartDate) : null,
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      const result = await db.recruiter.createMany({ data, skipDuplicates: true });
      return NextResponse.json({
        message: `Đã nhập ${result.count} dòng người tuyển dụng`,
        count: result.count,
      });
    }

    // Single create mode
    const { nydCode, nydName, position, ban, nhom, maNhom, recruitedAgentCode, recruitedAgentName, recruitedStartDate } = body;
    if (!nydCode || !recruitedAgentCode) {
      return NextResponse.json({ error: 'Vui lòng nhập mã NYD và mã TVV được tuyển' }, { status: 400 });
    }

    const recruiter = await db.recruiter.create({
      data: {
        nydCode, nydName: nydName || '', position: position || '',
        ban: ban || '', nhom: nhom || '', maNhom: maNhom || '',
        recruitedAgentCode, recruitedAgentName: recruitedAgentName || '',
        recruitedStartDate: recruitedStartDate ? parseDate(recruitedStartDate) : null,
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
