import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';

// ---------- Helpers (mirror route.ts) ----------
const VALID_PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td'] as const;
type Program = typeof VALID_PROGRAMS[number];
function isValidProgram(p: string | null | undefined): p is Program {
  return !!p && (VALID_PROGRAMS as readonly string[]).includes(p);
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsvToRows(csv: string): any[] {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map(h => h.trim());
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const obj: any = {};
    header.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function normalizeRow(program: Program, r: any) {
  const parseNum = (v: any): number => {
    if (typeof v === 'number') return v;
    if (v == null || v === '') return 0;
    const s = String(v).replace(/,/g, '').replace(/[^\d.\-]/g, '');
    return parseFloat(s) || 0;
  };
  const parseIntVal = (v: any): number => Math.round(parseNum(v));
  const pickStr = (v: any): string => v == null ? '' : String(v).trim();

  const norm = (k: string): string => k.trim().toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_]+/g, ' ').trim();

  const pickField = (obj: any, aliases: string[]): string => {
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (aliases.includes(norm(k))) return pickStr(obj[k]);
    }
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
  return {
    ...base,
    fyp:       parseNum(pickField(r, ['fyp', 'tong fyp', 'ip', 'tong ip']) || r.fyp),
    fypTVVm:   0,
    slTvvmHDC: 0,
    tvvmCount: 0,
  };
}

// ---------- POST /api/saoviet-data/sync ----------
// Body: { program: string, link: string }
// Action:
//   1) Fetch CSV from Google Sheets link via /api/import-csv (server-to-server)
//   2) Parse CSV → rows
//   3) DELETE all rows of program, INSERT new rows
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const program = body?.program;
    const link = String(body?.link || '').trim();

    if (!isValidProgram(program)) {
      return NextResponse.json({ error: 'program không hợp lệ (ca-nhan | tn-ktm | tn-td)' }, { status: 400 });
    }
    if (!link) {
      return NextResponse.json({ error: 'Thiếu link Google Sheets' }, { status: 400 });
    }
    if (!link.includes('docs.google.com/spreadsheets') && !link.includes('googleusercontent.com')) {
      return NextResponse.json({ error: 'URL không hợp lệ — phải là Google Sheets URL' }, { status: 400 });
    }

    // Build CSV URL with output=csv (mirror /api/import-csv logic)
    let csvUrl = link;
    const hashMatch = csvUrl.match(/#gid=(\d+)/);
    if (hashMatch) {
      csvUrl = csvUrl.split('#')[0];
      if (!csvUrl.includes('gid=')) {
        csvUrl += (csvUrl.includes('?') ? '&' : '?') + `gid=${hashMatch[1]}`;
      }
    }
    if (!csvUrl.includes('output=csv')) {
      csvUrl += (csvUrl.includes('?') ? '&' : '?') + 'output=csv';
    }

    const resp = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/csv,*/*',
      },
      next: { revalidate: 0 },
    });
    if (!resp.ok) {
      return NextResponse.json({ error: `Không thể tải CSV (HTTP ${resp.status})` }, { status: 502 });
    }
    const csv = await resp.text();
    if (!csv || !csv.trim()) {
      return NextResponse.json({ error: 'CSV trống' }, { status: 400 });
    }

    const rowsIn = parseCsvToRows(csv);
    if (rowsIn.length === 0) {
      // Empty: still wipe
      await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
      return NextResponse.json({ count: 0, deleted: true, message: 'Sheet rỗng — đã xóa dữ liệu cũ' });
    }

    const normalized = rowsIn
      .map((r: any) => normalizeRow(program, r))
      .filter((r: any) => r.agentCode || r.agentName);

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'CSV không có dòng hợp lệ (thiếu Mã số / Họ tên)' }, { status: 400 });
    }

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
      syncedFrom: link,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/saoviet-data/sync error:', error);
    return NextResponse.json({ error: 'Sync failed: ' + String(error?.message || error) }, { status: 500 });
  }
}
