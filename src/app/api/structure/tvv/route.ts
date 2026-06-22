import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper: chuyển Excel serial number thành Date
function excelSerialToDate(serial: number): Date {
  // Excel epoch = 30/12/1899 (bù bug 1900 leap year)
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * 86400000);
}

// Helper: safe date parse — hỗ trợ YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, Excel serial number, Date object
function safeDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v;
  }
  // Excel serial number (số nguyên > 1000, đại diện cho ngày từ ~1903 trở đi)
  if (typeof v === 'number' && Number.isInteger(v) && v > 1000 && v < 200000) {
    return excelSerialToDate(v);
  }
  const s = String(v).trim();
  if (!s) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  // DD/MM/YYYY hoặc DD.MM.YYYY hoặc DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  // Thử parse chung
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Helper: compare two date values — chỉ so sánh phần ngày (YYYY-MM-DD), bỏ qua timezone
function datesEqual(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  const toDayStr = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  return toDayStr(a) === toDayStr(b);
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
    // Helper: normalize header (lowercase, bỏ dấu TV, thay _ thành space) — để match alias mềm dẻo
    const normalizeKey = (s: string): string =>
      String(s || '').trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, ' ').trim();
    // Helper mở rộng: помимо alias cố định, còn thử match alias qua normalize
    const getValFlex = (r: any, ...aliases: string[]): string => {
      // 1) Match chính xác (case-sensitive)
      for (const k of Object.keys(r)) {
        if (aliases.includes(k) && r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
      }
      // 2) Match chính xác (case-insensitive)
      for (const k of Object.keys(r)) {
        if (aliases.some(a => a.toLowerCase() === k.toLowerCase()) && r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
      }
      // 3) Match qua normalize
      const normAliases = aliases.map(normalizeKey);
      for (const k of Object.keys(r)) {
        if (normAliases.includes(normalizeKey(k)) && r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
      }
      return '';
    };

    // Batch mode (array) — with duplicate agentCode check
    if (Array.isArray(body)) {
      const records = body.filter((r: any) => getValFlex(r, 'agentCode', 'Mã TVV', 'ma tvv', 'ma so', 'ma dl') && getValFlex(r, 'agentName', 'Tên TVV', 'ho ten', 'ten', 'ten tvv')).map((r: any) => ({
        agentCode: getValFlex(r, 'agentCode', 'Mã TVV', 'ma tvv', 'ma so', 'ma dl'),
        agentName: getValFlex(r, 'agentName', 'Tên TVV', 'ho ten', 'ten', 'ten tvv'),
        maBanNhom: getValFlex(r, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã nhóm', 'ma ban nhom', 'ma nhom', 'ma ban/nhom') || '',
        chucVu: getValFlex(r, 'chucVu', 'Chức vụ', 'chuc vu') || '',
        ngayBatDau: safeDate(getValFlex(r, 'ngayBatDau', 'Ngày bắt đầu', 'Ngày bắt đầu làm việc', 'ngay bat dau', 'ngay bat dau lam viec', 'ngay bd', 'ngay bat dau lv')),
        maTVVTuyendung: getValFlex(r, 'maTVVTuyendung', 'Mã TVV tuyển dụng', 'Mã TVV TD', 'ma tvv tuyen dung', 'ma tvv td', 'ma nguoi tuyen dung', 'ma nguoi td', 'ma ntd', 'manguoituyendung', 'ma nguoi td', 'ma dl td', 'nguoi tuyen dung', 'nguoi td') || '',
        note: getValFlex(r, 'note', 'Ghi chú', 'ghi chu') || '',
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
              existing.maTVVTuyendung === rec.maTVVTuyendung &&
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
                  maTVVTuyendung: rec.maTVVTuyendung,
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
      const batchSize = 500;
      let totalImported = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const result = await db.tVVStruct.createMany({ data: batch });
        totalImported += result.count;
      }
      return NextResponse.json({ message: `Đã nhập ${totalImported} TVV`, count: totalImported });
    }

    // Single create - also support Vietnamese field names from CSV import
    const agentCode = getValFlex(body, 'agentCode', 'Mã TVV', 'ma tvv', 'ma so', 'ma dl');
    const agentName = getValFlex(body, 'agentName', 'Tên TVV', 'ho ten', 'ten', 'ten tvv');
    const maBanNhom = getValFlex(body, 'maBanNhom', 'Mã Ban/Nhóm', 'Mã nhóm', 'ma ban nhom', 'ma nhom');
    const chucVu = getValFlex(body, 'chucVu', 'Chức vụ', 'chuc vu');
    const ngayBatDau = getValFlex(body, 'ngayBatDau', 'Ngày bắt đầu', 'Ngày bắt đầu làm việc', 'ngay bat dau', 'ngay bat dau lv');
    const maTVVTuyendung = getValFlex(body, 'maTVVTuyendung', 'Mã TVV tuyển dụng', 'Mã TVV TD', 'ma tvv tuyen dung', 'ma tvv td', 'ma nguoi tuyen dung', 'ma nguoi td', 'ma ntd', 'ma dl td');
    const note = getValFlex(body, 'note', 'Ghi chú', 'ghi chu');
    if (!agentCode || !agentName) return NextResponse.json({ error: 'Vui lòng nhập mã TVV và tên TVV' }, { status: 400 });

    const item = await db.tVVStruct.upsert({
      where: { agentCode },
      update: { agentName, maBanNhom: maBanNhom || '', chucVu: chucVu || '', ngayBatDau: safeDate(ngayBatDau), maTVVTuyendung: maTVVTuyendung || '', note: note || '' },
      create: { agentCode, agentName, maBanNhom: maBanNhom || '', chucVu: chucVu || '', ngayBatDau: safeDate(ngayBatDau), maTVVTuyendung: maTVVTuyendung || '', note: note || '' },
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
