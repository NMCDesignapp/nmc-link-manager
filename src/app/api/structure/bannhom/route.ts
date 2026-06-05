import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/structure/bannhom
export async function GET() {
  try {
    const list = await db.banNhom.findMany({ orderBy: { tenBanNhom: 'asc' } });
    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching BanNhom:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách Ban/Nhóm' }, { status: 500 });
  }
}

// POST /api/structure/bannhom - Create single or batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body.filter((r: any) => r.maBanNhom && r.tenBanNhom).map((r: any) => ({
        maBanNhom: r.maBanNhom,
        tenBanNhom: r.tenBanNhom,
        maAD: r.maAD || '',
        note: r.note || '',
      }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.banNhom.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} Ban/Nhóm`, count: result.count });
    }

    // Single create
    const { maBanNhom, tenBanNhom, maAD, note } = body;
    if (!maBanNhom || !tenBanNhom) return NextResponse.json({ error: 'Vui lòng nhập mã và tên Ban/Nhóm' }, { status: 400 });

    const item = await db.banNhom.upsert({
      where: { maBanNhom },
      update: { tenBanNhom, maAD: maAD || '', note: note || '' },
      create: { maBanNhom, tenBanNhom, maAD: maAD || '', note: note || '' },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Mã Ban/Nhóm đã tồn tại' }, { status: 409 });
    console.error('Error creating BanNhom:', error);
    return NextResponse.json({ error: 'Không thể thêm Ban/Nhóm' }, { status: 500 });
  }
}

// DELETE /api/structure/bannhom
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await db.banNhom.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting BanNhom:', error);
    return NextResponse.json({ error: 'Không thể xóa Ban/Nhóm' }, { status: 500 });
  }
}
