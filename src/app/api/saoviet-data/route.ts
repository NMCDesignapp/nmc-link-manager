import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';

// ---------- Helpers ----------
const VALID_PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td'] as const;
type Program = typeof VALID_PROGRAMS[number];

function isValidProgram(p: string | null | undefined): p is Program {
  return !!p && (VALID_PROGRAMS as readonly string[]).includes(p);
}

// Normalize row from request body → shape matching Prisma model
function normalizeRow(program: Program, r: any) {
  const parseNum = (v: any): number => {
    if (typeof v === 'number') return v;
    if (v == null || v === '') return 0;
    const s = String(v).replace(/,/g, '').replace(/[^\d.\-]/g, '');
    return parseFloat(s) || 0;
  };
  const parseIntVal = (v: any): number => {
    const n = parseNum(v);
    return Math.round(n);
  };
  const pickStr = (v: any): string => v == null ? '' : String(v).trim();

  // Try many header variants for resilience
  const pickField = (obj: any, aliases: string[]): string => {
    const norm = (k: string): string => k.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s_]+/g, ' ').trim();
    const keys = Object.keys(obj);
    // Pass 1: exact normalized match
    for (const k of keys) {
      if (aliases.includes(norm(k))) return pickStr(obj[k]);
    }
    // Pass 2: fuzzy — alias included in key or vice versa (alias length >=4)
    for (const k of keys) {
      const nk = norm(k);
      for (const a of aliases) {
        if (a.length >= 4 && (nk.includes(a) || a.includes(nk))) return pickStr(obj[k]);
      }
    }
    return '';
  };

  const base = {
    agentCode: pickField(r, ['ma tvv', 'ma so', 'ma dl', 'ma dai ly', 'ms dai ly', 'agentcode', 'mã tvv', 'mã số', 'mã đại lý']),
    agentName: pickField(r, ['ho ten', 'hoten', 'ho va ten', 'ten tvv', 'ten tn', 'ten', 'agentname', 'họ tên', 'tên']),
    nhomKD:    pickField(r, ['nhom kd', 'nhom kinh doanh', 'nhom', 'nhóm kd', 'nhóm kinh doanh', 'nhóm']),
  };

  if (program === 'tn-td') {
    return {
      ...base,
      fyp:       0,
      fypTVVm:   parseNum(pickField(r, ['fyp tvvm', 'tong fyp tvvm', 'fyp', 'tong fyp']) || r.fypTVVm),
      slTvvmHDC: parseIntVal(pickField(r, ['sl tvvm hdc', 'tvvm hdc', 'sl hdc', 'so tvvm hdc']) || r.slTvvmHDC),
      tvvmCount: parseIntVal(pickField(r, ['tvvm count', 'sl tvvm', 'so tvvm', 'tong tvvm']) || r.tvvmCount),
    };
  }
  // ca-nhan & tn-ktm
  return {
    ...base,
    fyp:       parseNum(pickField(r, ['fyp', 'tong fyp', 'ip', 'tong ip']) || r.fyp),
    fypTVVm:   0,
    slTvvmHDC: 0,
    tvvmCount: 0,
  };
}

// ---------- GET /api/saoviet-data?program=xxx ----------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const program = searchParams.get('program');
    if (!isValidProgram(program)) {
      return NextResponse.json({ error: 'program không hợp lệ (ca-nhan | tn-ktm | tn-td)' }, { status: 400 });
    }
    const rows = await withRetry(() => db.saoVietData.findMany({
      where: { program },
      orderBy: [{ fyp: 'desc' }, { fypTVVm: 'desc' }],
    }));
    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/saoviet-data error:', error);
    return NextResponse.json({ error: 'Failed to fetch: ' + String(error) }, { status: 500 });
  }
}

// ---------- POST /api/saoviet-data ----------
// Body: { program: string, rows: any[] }
// Action: DELETE all rows of program, INSERT new rows (atomic-ish)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const program = body?.program;
    const rowsIn = Array.isArray(body?.rows) ? body.rows : [];

    if (!isValidProgram(program)) {
      return NextResponse.json({ error: 'program không hợp lệ (ca-nhan | tn-ktm | tn-td)' }, { status: 400 });
    }
    if (rowsIn.length === 0) {
      // Edge case: still wipe the program (user uploaded empty file → clear all)
      await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
      return NextResponse.json({ count: 0, deleted: true, message: 'Đã xóa toàn bộ dữ liệu cũ (file rỗng)' });
    }

    const normalized = rowsIn
      .map((r: any) => normalizeRow(program, r))
      .filter(r => r.agentCode || r.agentName);

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'Không có dòng hợp lệ (thiếu Mã số / Họ tên)' }, { status: 400 });
    }

    // Wrap in transaction: delete old → insert new
    const result = await withRetry(() => db.$transaction(async (tx) => {
      const deleted = await tx.saoVietData.deleteMany({ where: { program } });
      const created = await tx.saoVietData.createMany({
        data: normalized.map(r => ({ ...r, program })),
      });
      return { deleted: deleted.count, created: created.count };
    }));

    return NextResponse.json({
      count: result.created,
      deleted: result.deleted,
      program,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/saoviet-data error:', error);
    return NextResponse.json({ error: 'Failed to save: ' + String(error?.message || error) }, { status: 500 });
  }
}

// ---------- DELETE /api/saoviet-data?program=xxx ----------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const program = searchParams.get('program');
    if (!isValidProgram(program)) {
      return NextResponse.json({ error: 'program không hợp lệ' }, { status: 400 });
    }
    const result = await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
    return NextResponse.json({ deleted: result.count, program });
  } catch (error) {
    console.error('DELETE /api/saoviet-data error:', error);
    return NextResponse.json({ error: 'Failed to delete: ' + String(error) }, { status: 500 });
  }
}
