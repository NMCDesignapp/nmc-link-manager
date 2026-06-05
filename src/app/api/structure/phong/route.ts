import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/structure/phong
export async function GET() {
  try {
    const list = await db.phong.findMany({ orderBy: { tenPhong: 'asc' } });
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

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body.filter((r: any) => r.maPhong && r.tenPhong).map((r: any) => ({
        maPhong: r.maPhong,
        tenPhong: r.tenPhong,
        note: r.note || '',
      }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.phong.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} phòng`, count: result.count });
    }

    // Single create
    const { maPhong, tenPhong, note } = body;
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
