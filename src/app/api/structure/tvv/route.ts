import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper: safe date parse
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

// GET /api/structure/tvv
export async function GET() {
  try {
    const list = await db.tVVStruct.findMany({ orderBy: { agentName: 'asc' } });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching TVV:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách TVV' }, { status: 500 });
  }
}

// POST /api/structure/tvv - Create single or batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Helper to extract field from multiple possible column names
    const getVal = (r: any, ...keys: string[]) => {
      for (const k of keys) { if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k]; }
      return '';
    };

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body.filter((r: any) => getVal(r, 'agentCode', 'Mã TVV') && getVal(r, 'agentName', 'Tên TVV')).map((r: any) => ({
        agentCode: getVal(r, 'agentCode', 'Mã TVV'),
        agentName: getVal(r, 'agentName', 'Tên TVV'),
        maBanNhom: getVal(r, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã nhóm') || '',
        chucVu: getVal(r, 'chucVu', 'Chức vụ', 'Chức vụ TVV') || '',
        ngayBatDau: safeDate(getVal(r, 'ngayBatDau', 'Ngày bắt đầu', 'Ngày bắt đầu làm việc')),
        note: getVal(r, 'note', 'Ghi chú') || '',
      }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.tVVStruct.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} TVV`, count: result.count });
    }

    // Single create - also support Vietnamese field names from CSV import
    const agentCode = getVal(body, 'agentCode', 'Mã TVV');
    const agentName = getVal(body, 'agentName', 'Tên TVV');
    const maBanNhom = getVal(body, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã nhóm');
    const chucVu = getVal(body, 'chucVu', 'Chức vụ', 'Chức vụ TVV');
    const ngayBatDau = getVal(body, 'ngayBatDau', 'Ngày bắt đầu', 'Ngày bắt đầu làm việc');
    const note = getVal(body, 'note', 'Ghi chú');
    if (!agentCode || !agentName) return NextResponse.json({ error: 'Vui lòng nhập mã TVV và tên TVV' }, { status: 400 });

    const item = await db.tVVStruct.upsert({
      where: { agentCode },
      update: { agentName, maBanNhom: maBanNhom || '', chucVu: chucVu || '', ngayBatDau: safeDate(ngayBatDau), note: note || '' },
      create: { agentCode, agentName, maBanNhom: maBanNhom || '', chucVu: chucVu || '', ngayBatDau: safeDate(ngayBatDau), note: note || '' },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Mã TVV đã tồn tại' }, { status: 409 });
    console.error('Error creating TVV:', error);
    return NextResponse.json({ error: 'Không thể thêm TVV' }, { status: 500 });
  }
}

// DELETE /api/structure/tvv
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await db.tVVStruct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting TVV:', error);
    return NextResponse.json({ error: 'Không thể xóa TVV' }, { status: 500 });
  }
}
