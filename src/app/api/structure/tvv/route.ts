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

// Helper: compare two date values (both may be Date, string, or null)
function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  const ta = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const tb = b instanceof Date ? b.getTime() : new Date(b).getTime();
  return ta === tb;
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
// ?replaceAll=true → xóa tất cả TVV cũ rồi import mới (legacy, giữ lại cho tương thích)
// ?upsert=true → cập nhật thông minh: giữ nguyên nếu không đổi, cập nhật nếu thay đổi, thêm mới nếu chưa có, xoá nếu không còn trong DS mới
export async function POST(request: NextRequest) {
  try {
    const replaceAll = request.nextUrl.searchParams.get('replaceAll') === 'true';
    const upsertMode = request.nextUrl.searchParams.get('upsert') === 'true';
    const body = await request.json();

    // Helper to extract field from multiple possible column names
    const getVal = (r: any, ...keys: string[]) => {
      for (const k of keys) { if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k]; }
      return '';
    };

    // Batch mode (array) — with duplicate agentCode check
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

      // Check for duplicate agentCode within the batch itself
      const batchCodes = records.map(r => r.agentCode);
      const duplicateBatchCodes = batchCodes.filter((code, idx) => batchCodes.indexOf(code) !== idx);
      if (duplicateBatchCodes.length > 0) {
        const uniqueDupes = [...new Set(duplicateBatchCodes)];
        return NextResponse.json({ error: `Mã TVV trùng trong file: ${uniqueDupes.join(', ')}` }, { status: 409 });
      }

      // ═══════════════════════════════════════════
      // UPSERT MODE: Smart update — so sánh và chỉ cập nhật thay đổi
      // ═══════════════════════════════════════════
      if (upsertMode) {
        // Lấy toàn bộ TVV hiện tại trong DB
        const existingList = await db.tVVStruct.findMany();
        const existingMap = new Map(existingList.map(t => [t.agentCode, t]));

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const newCodes = new Set(records.map(r => r.agentCode));
        const toDeleteIds: string[] = [];

        // Tìm các TVV trong DB nhưng không có trong DS mới → sẽ xoá
        for (const existing of existingList) {
          if (!newCodes.has(existing.agentCode)) {
            toDeleteIds.push(existing.id);
          }
        }

        // Xoá các TVV không còn trong DS mới (theo batch)
        const batchSize = 500;
        for (let i = 0; i < toDeleteIds.length; i += batchSize) {
          const batchIds = toDeleteIds.slice(i, i + batchSize);
          await db.tVVStruct.deleteMany({ where: { id: { in: batchIds } } });
        }

        // Duyệt qua từng record trong DS mới
        for (const rec of records) {
          const existing = existingMap.get(rec.agentCode);

          if (!existing) {
            // TVV mới → tạo mới
            await db.tVVStruct.create({ data: rec });
            created++;
          } else {
            // TVV đã có → so sánh từng trường
            const isSame =
              existing.agentName === rec.agentName &&
              existing.maBanNhom === rec.maBanNhom &&
              existing.chucVu === rec.chucVu &&
              existing.note === rec.note &&
              datesEqual(existing.ngayBatDau, rec.ngayBatDau);

            if (isSame) {
              // Không thay đổi → giữ nguyên
              skipped++;
            } else {
              // Có thay đổi → cập nhật
              await db.tVVStruct.update({
                where: { id: existing.id },
                data: {
                  agentName: rec.agentName,
                  maBanNhom: rec.maBanNhom,
                  chucVu: rec.chucVu,
                  ngayBatDau: rec.ngayBatDau,
                  note: rec.note,
                },
              });
              updated++;
            }
          }
        }

        const deleted = toDeleteIds.length;
        const parts: string[] = [];
        if (created > 0) parts.push(`thêm mới ${created}`);
        if (updated > 0) parts.push(`cập nhật ${updated}`);
        if (skipped > 0) parts.push(`giữ nguyên ${skipped}`);
        if (deleted > 0) parts.push(`xoá ${deleted}`);

        return NextResponse.json({
          message: `Đã cập nhật DS TVV: ${parts.join(', ')}`,
          created,
          updated,
          skipped,
          deleted,
          total: records.length,
        });
      }

      // ═══════════════════════════════════════════
      // REPLACE ALL MODE: Xoá hết rồi nhập lại (legacy)
      // ═══════════════════════════════════════════
      if (replaceAll) {
        await db.tVVStruct.deleteMany({});
      } else {
        // Check for duplicate agentCode against existing DB records
        const existingTVV = await db.tVVStruct.findMany({
          where: { agentCode: { in: batchCodes } },
          select: { agentCode: true },
        });
        if (existingTVV.length > 0) {
          const existingCodes = existingTVV.map(t => t.agentCode);
          return NextResponse.json({ error: `Mã TVV đã tồn tại trong hệ thống: ${existingCodes.join(', ')}` }, { status: 409 });
        }
      }

      // Import in batches of 500 to avoid query size limits
      let totalImported = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const result = await db.tVVStruct.createMany({ data: batch });
        totalImported += result.count;
      }
      return NextResponse.json({ message: `Đã nhập ${totalImported} TVV`, count: totalImported });
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
// ?id=xxx → xóa 1 record
// ?deleteAll=true → xóa tất cả
export async function DELETE(request: NextRequest) {
  try {
    const deleteAll = request.nextUrl.searchParams.get('deleteAll');
    if (deleteAll === 'true') {
      const result = await db.tVVStruct.deleteMany({});
      return NextResponse.json({ success: true, deleted: result.count });
    }
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await db.tVVStruct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting TVV:', error);
    return NextResponse.json({ error: 'Không thể xóa TVV' }, { status: 500 });
  }
}
