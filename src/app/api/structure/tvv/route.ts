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

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body.filter((r: any) => (r.agentCode || r['Mã TVV']) && (r.agentName || r['Tên TVV'])).map((r: any) => ({
        agentCode: r.agentCode || r['Mã TVV'],
        agentName: r.agentName || r['Tên TVV'],
        maBanNhom: r.maBanNhom || r['Mã Ban/Nhóm'] || '',
        chucVu: r.chucVu || r['Chức vụ'] || '',
        ngayBatDau: safeDate(r.ngayBatDau || r['Ngày bắt đầu']),
        note: r.note || r['Ghi chú'] || '',
      }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.tVVStruct.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} TVV`, count: result.count });
    }

    // Single create - also support Vietnamese field names from CSV import
    const agentCode = body.agentCode || body['Mã TVV'];
    const agentName = body.agentName || body['Tên TVV'];
    const maBanNhom = body.maBanNhom || body['Mã Ban/Nhóm'];
    const chucVu = body.chucVu || body['Chức vụ'];
    const ngayBatDau = body.ngayBatDau || body['Ngày bắt đầu'];
    const note = body.note || body['Ghi chú'];
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
