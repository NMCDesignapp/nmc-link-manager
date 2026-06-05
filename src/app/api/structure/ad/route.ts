import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/structure/ad
export async function GET() {
  try {
    const list = await db.aD.findMany({ orderBy: { tenAD: 'asc' } });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching AD:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách AD' }, { status: 500 });
  }
}

// POST /api/structure/ad - Create single or batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body.filter((r: any) => r.maAD && r.tenAD).map((r: any) => ({
        maAD: r.maAD,
        tenAD: r.tenAD,
        maPhong: r.maPhong || '',
        note: r.note || '',
      }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.aD.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} AD`, count: result.count });
    }

    // Single create
    const { maAD, tenAD, maPhong, note } = body;
    if (!maAD || !tenAD) return NextResponse.json({ error: 'Vui lòng nhập mã AD và tên AD' }, { status: 400 });

    const item = await db.aD.upsert({
      where: { maAD },
      update: { tenAD, maPhong: maPhong || '', note: note || '' },
      create: { maAD, tenAD, maPhong: maPhong || '', note: note || '' },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Mã AD đã tồn tại' }, { status: 409 });
    console.error('Error creating AD:', error);
    return NextResponse.json({ error: 'Không thể thêm AD' }, { status: 500 });
  }
}

// DELETE /api/structure/ad
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await db.aD.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting AD:', error);
    return NextResponse.json({ error: 'Không thể xóa AD' }, { status: 500 });
  }
}
