import { db } from '@/lib/db';
import { isAuthorizedDataHubRequest, isDataHubImport } from '@/lib/data-hub-auth';
import { NextRequest, NextResponse } from 'next/server';
import { getSyncSource } from '@/lib/sync-source';

type Collection = 'tvv' | 'leaders' | 'recruiters' | 'clb-members' | 'tuyen-ngang';
type Row = Record<string, unknown>;

const collections = new Set<Collection>(['tvv', 'leaders', 'recruiters', 'clb-members', 'tuyen-ngang']);

function text(row: Row, key: string): string {
  const value = row[key];
  return value === undefined || value === null ? '' : String(value).trim();
}

function date(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && value > 1000 && value < 200000) {
    return new Date(Date.UTC(1899, 11, 30 + value));
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const dmy = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])));
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function number(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(/[,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function assertNoDuplicate(rows: Array<{ agentCode: string }>) {
  const codes = new Set<string>();
  for (const row of rows) {
    if (codes.has(row.agentCode)) throw new Error(`Mã bị trùng trong file: ${row.agentCode}`);
    codes.add(row.agentCode);
  }
}

// POST /api/structure/sync — Data Hub only. Every collection is a full mirror
// of its corresponding local Excel sheet; rows removed from Excel are removed here too.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isDataHubImport(body) || !isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (await getSyncSource() !== 'data-hub') {
      return NextResponse.json({ error: 'Data Hub đã tắt vì Google Sheets đang là nguồn đồng bộ' }, { status: 409 });
    }

    const collection = body?.collection as Collection;
    const sourceRows = Array.isArray(body?.rows) ? body.rows.filter((row: unknown): row is Row => !!row && typeof row === 'object') : [];
    if (!collections.has(collection)) return NextResponse.json({ error: 'Danh sách không hợp lệ' }, { status: 400 });
    if (!sourceRows.length) return NextResponse.json({ error: 'Không cho phép thay thế bằng danh sách trống' }, { status: 400 });

    if (collection === 'tvv') {
      const rows = sourceRows
        .map(row => ({
          agentCode: text(row, 'Mã TVV'), agentName: text(row, 'Tên TVV'), maBanNhom: text(row, 'Mã Ban/Nhóm'),
          chucVu: text(row, 'Chức vụ'), ngayBatDau: date(row['Ngày bắt đầu làm việc']),
          maTVVTuyendung: text(row, 'Mã TVV TD'), note: text(row, 'Ghi chú'),
        }))
        .filter(row => row.agentCode && row.agentName);
      if (!rows.length) return NextResponse.json({ error: 'Không có TVV hợp lệ' }, { status: 400 });
      assertNoDuplicate(rows);
      await db.$transaction([db.tVVStruct.deleteMany({}), db.tVVStruct.createMany({ data: rows })]);
      return NextResponse.json({ collection, count: rows.length });
    }

    if (collection === 'leaders') {
      const rows = sourceRows.map(row => ({
        agentCode: text(row, 'Mã số'), agentName: text(row, 'Họ tên'), position: text(row, 'Chức vụ'), ban: text(row, 'Ban'),
        nhom: text(row, 'Nhóm'), maNhom: text(row, 'Mã nhóm'), salary: number(row['Tiền/tháng']), phone: text(row, 'SĐT'),
        email: text(row, 'Email'), startDate: date(row['Ngày bắt đầu']), note: text(row, 'Ghi chú'),
      })).filter(row => row.agentCode && row.agentName);
      if (!rows.length) return NextResponse.json({ error: 'Không có lãnh đạo hợp lệ' }, { status: 400 });
      assertNoDuplicate(rows);
      await db.$transaction([db.leaderInfo.deleteMany({}), db.leaderInfo.createMany({ data: rows })]);
      return NextResponse.json({ collection, count: rows.length });
    }

    if (collection === 'recruiters') {
      const rows = sourceRows.map(row => ({
        agentCode: text(row, 'Mã số'), agentName: text(row, 'Họ tên'), position: text(row, 'Chức vụ'),
        nhom: text(row, 'Nhóm'), startDate: date(row['Ngày bắt đầu']), ngayHieuLuc: date(row['Ngày hiệu lực chức vụ']),
      })).filter(row => row.agentCode && row.agentName);
      if (!rows.length) return NextResponse.json({ error: 'Không có NTD hợp lệ' }, { status: 400 });
      assertNoDuplicate(rows);
      await db.$transaction([db.recruiter.deleteMany({}), db.recruiter.createMany({ data: rows })]);
      return NextResponse.json({ collection, count: rows.length });
    }

    if (collection === 'clb-members') {
      const rows = sourceRows.map(row => ({
        ad: text(row, 'AD'), nhom: text(row, 'NHÓM'), agentCode: text(row, 'MÃ TVV'),
        agentName: text(row, 'HỌ TÊN TVV'), chucVu: text(row, 'CHỨC VỤ'), note: text(row, 'GHI CHÚ'),
      })).filter(row => row.agentCode && row.agentName);
      if (!rows.length) return NextResponse.json({ error: 'Không có thành viên CLB hợp lệ' }, { status: 400 });
      await db.$transaction([db.clbMember.deleteMany({}), db.clbMember.createMany({ data: rows })]);
      return NextResponse.json({ collection, count: rows.length });
    }

    const rows = sourceRows.map(row => ({
      nhom: text(row, 'NHÓM'), agentCode: text(row, 'MÃ TVV'), agentName: text(row, 'HỌ TÊN'),
      ngayBatDau: date(row['Ngày bắt đầu làm việc']), ngayHieuLuc: date(row['Ngày hiệu lực chức vụ']),
      maNguoiTuyenDung: text(row, 'MÃ NGƯỜI TUYỂN DỤNG'), tenNguoiTuyenDung: text(row, 'TÊN NGƯỜI TUYỂN DỤNG'),
    })).filter(row => row.agentCode && row.agentName);
    if (!rows.length) return NextResponse.json({ error: 'Không có TTN tuyển ngang hợp lệ' }, { status: 400 });
    assertNoDuplicate(rows);
    await db.$transaction([db.tuyenNgang.deleteMany({}), db.tuyenNgang.createMany({ data: rows })]);
    return NextResponse.json({ collection, count: rows.length });
  } catch (error) {
    console.error('POST /api/structure/sync error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể đồng bộ cấu trúc' }, { status: 500 });
  }
}
