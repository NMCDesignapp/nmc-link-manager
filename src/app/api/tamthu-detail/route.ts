import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { isAuthorizedDataHubRequest, isDataHubImport } from '@/lib/data-hub-auth';

export const dynamic = 'force-dynamic';

type DetailRow = Record<string, unknown>;

function value(row: DetailRow, ...keys: string[]) {
  for (const key of keys) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function numberValue(v: string) {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const rows = await withRetry(() => db.tamthuDetail.findMany({
      orderBy: { rowNo: 'asc' },
      select: { rowNo: true, nhom: true, maNhom: true, agentCode: true, agentName: true, effectiveDate: true, issueDate: true, pdt: true, afyp: true, contractStatus: true },
    }));
    return NextResponse.json({ rows, count: rows.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const prismaError = error as { code?: string; meta?: { modelName?: string; table?: string } };
    if (
      prismaError?.code === 'P2021'
      && `${prismaError.meta?.modelName || ''} ${prismaError.meta?.table || ''}`.includes('TamthuDetail')
    ) {
      console.warn('[tamthu-detail] Table is not migrated; returning an empty read-only snapshot');
      return NextResponse.json(
        { rows: [], count: 0, available: false },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    console.error('tamthu detail get error:', error);
    return NextResponse.json({ rows: [], count: 0, error: 'Không thể tải chi tiết tạm thu.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isDataHubImport(body) || !isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Array.isArray(body.rows)) return NextResponse.json({ error: 'Thiếu dữ liệu Sheet2.' }, { status: 400 });

    const rows = (body.rows as DetailRow[])
      .map((row, index) => ({
        rowNo: Number(value(row, 'STT')) || index + 1,
        nhom: value(row, 'Nhóm', 'Nhom'),
        maNhom: value(row, 'Mã Ban/Nhóm', 'Mã nhóm', 'MaNhom'),
        agentCode: value(row, 'Mã ĐL', 'Mã số', 'MaDL'),
        agentName: value(row, 'Tên', 'Họ tên TVV', 'Ten'),
        effectiveDate: value(row, 'Ngày hiệu lực', 'Ngày HL'),
        issueDate: value(row, 'Ngày phát hành', 'Ngày PH'),
        pdt: numberValue(value(row, 'PĐT + 10% ĐT', 'IP + PĐT', 'PDT')),
        afyp: numberValue(value(row, 'AFYP')),
        contractStatus: value(row, 'Tình trạng HĐ', 'Tình trạng hợp đồng', 'Tình trạng'),
      }))
      .filter(row => row.agentCode || row.agentName || row.nhom);

    // Đây là snapshot Sheet2: xóa rồi ghi lại toàn bộ để bảng xem luôn phản ánh đúng file,
    // không tác động bảng Contract/KPI.
    await withRetry(async () => {
      await db.$transaction(async (tx) => {
        await tx.tamthuDetail.deleteMany();
        for (let i = 0; i < rows.length; i += 400) {
          await tx.tamthuDetail.createMany({ data: rows.slice(i, i + 400) });
        }
      }, { timeout: 30000 });
    });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('tamthu detail sync error:', error);
    return NextResponse.json({ error: 'Không thể đồng bộ Sheet2.', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
