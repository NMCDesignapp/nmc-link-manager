import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/structure/phong
export async function GET() {
  try {
    const list = await db.phong.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching phong:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách phòng' }, { status: 500 });
  }
}

// POST /api/structure/phong - Create single or batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Helper to extract field from multiple possible column names
    // (supports both English camelCase and Vietnamese headers from Excel)
    const getVal = (r: any, ...keys: string[]) => {
      for (const k of keys) { if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k]; }
      return '';
    };

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body
        .filter((r: any) => getVal(r, 'maPhong', 'Mã Phòng') && getVal(r, 'tenPhong', 'Tên Phòng'))
        .map((r: any) => ({
          maPhong: getVal(r, 'maPhong', 'Mã Phòng'),
          tenPhong: getVal(r, 'tenPhong', 'Tên Phòng'),
          note: getVal(r, 'note', 'Ghi chú') || '',
        }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.phong.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} phòng`, count: result.count });
    }

    // Single create
    const maPhong = getVal(body, 'maPhong', 'Mã Phòng');
    const tenPhong = getVal(body, 'tenPhong', 'Tên Phòng');
    const note = getVal(body, 'note', 'Ghi chú');
    if (!maPhong || !tenPhong) return NextResponse.json({ error: 'Vui lòng nhập mã phòng và tên phòng' }, { status: 400 });

    const item = await db.phong.upsert({
      where: { maPhong },
      update: { tenPhong, note: note || '' },
      create: { maPhong, tenPhong, note: note || '' },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Mã phòng đã tồn tại' }, { status: 409 });
    console.error('Error creating phong:', error);
    return NextResponse.json({ error: 'Không thể thêm phòng' }, { status: 500 });
  }
}

// DELETE /api/structure/phong - Delete by id (query param)
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await db.phong.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting phong:', error);
    return NextResponse.json({ error: 'Không thể xóa phòng' }, { status: 500 });
  }
}
