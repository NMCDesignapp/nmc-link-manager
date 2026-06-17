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

    // Helper to extract field from multiple possible column names
    // (supports both English camelCase and Vietnamese headers from Excel)
    const getVal = (r: any, ...keys: string[]) => {
      for (const k of keys) { if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k]; }
      return '';
    };

    // Batch mode (array)
    if (Array.isArray(body)) {
      const records = body
        .filter((r: any) => getVal(r, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã Ban Nhóm', 'Mã Ban-Nhóm') && getVal(r, 'tenBanNhom', 'Tên Ban/Nhóm', 'Tên Ban Nhóm', 'Tên Ban-Nhóm'))
        .map((r: any) => ({
          maBanNhom: getVal(r, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã Ban Nhóm', 'Mã Ban-Nhóm'),
          tenBanNhom: getVal(r, 'tenBanNhom', 'Tên Ban/Nhóm', 'Tên Ban Nhóm', 'Tên Ban-Nhóm'),
          maAD: getVal(r, 'maAD', 'Mã AD') || '',
          note: getVal(r, 'note', 'Ghi chú') || '',
        }));
      if (records.length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      const result = await db.banNhom.createMany({ data: records });
      return NextResponse.json({ message: `Đã nhập ${result.count} Ban/Nhóm`, count: result.count });
    }

    // Single create
    const maBanNhom = getVal(body, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã Ban Nhóm', 'Mã Ban-Nhóm');
    const tenBanNhom = getVal(body, 'tenBanNhom', 'Tên Ban/Nhóm', 'Tên Ban Nhóm', 'Tên Ban-Nhóm');
    const maAD = getVal(body, 'maAD', 'Mã AD');
    const note = getVal(body, 'note', 'Ghi chú');
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
