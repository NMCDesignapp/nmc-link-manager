import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';

// ---------- Constants ----------
const PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td'] as const;
type Program = typeof PROGRAMS[number];

// ---------- CSV helpers (mirror sync/route.ts) ----------
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
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

// ---------- Row normalizer ----------
// Data starts from NHÓM column (no STT column — STT auto-counted by app).
// Expected per-program structure (matches detail table):
//   ca-nhan / tn-ktm:  NHÓM | MÃ SỐ | HỌ TÊN | FYP
//   tn-td:             NHÓM | MÃ SỐ | HỌ TÊN | FYP TVVm | SL TVVm HĐC | TVVm COUNT
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

  // Positional fallback — if header detection fails, use column index
  // (data starts from NHÓM = col 0, MÃ SỐ = col 1, HỌ TÊN = col 2, ...)
  const values = Object.values(r) as any[];
  const positional = (idx: number): string => {
    const v = values[idx];
    return v == null ? '' : String(v).trim();
  };

  const base = {
    agentCode: pickField(r, ['ma tvv', 'ma so', 'ma dl', 'ma dai ly', 'ms dai ly', 'agentcode', 'mã tvv', 'mã số', 'mã đại lý', 'ms', 'ma'])
      || positional(1),
    agentName: pickField(r, ['ho ten', 'hoten', 'ho va ten', 'ten tvv', 'ten tn', 'ten', 'agentname', 'họ tên', 'tên'])
      || positional(2),
    nhomKD:    pickField(r, ['nhom kd', 'nhom kinh doanh', 'nhom', 'nhóm kd', 'nhóm kinh doanh', 'nhóm'])
      || positional(0),
  };

  if (program === 'tn-td') {
    return {
      ...base,
      fyp:       0,
      fypTVVm:   parseNum(pickField(r, ['fyp tvvm', 'tong fyp tvvm', 'fyp', 'tong fyp']) || positional(3)),
      slTvvmHDC: parseIntVal(pickField(r, ['sl tvvm hdc', 'tvvm hdc', 'sl hdc', 'so tvvm hdc']) || positional(4)),
      tvvmCount: parseIntVal(pickField(r, ['tvvm count', 'sl tvvm', 'so tvvm', 'tong tvvm']) || positional(5)),
    };
  }
  return {
    ...base,
    fyp:       parseNum(pickField(r, ['fyp', 'tong fyp', 'ip', 'tong ip']) || positional(3)),
    fypTVVm:   0,
    slTvvmHDC: 0,
    tvvmCount: 0,
  };
}

// ---------- Build CSV URL for a sheet tab ----------
// Google Sheets CSV export: /d/<ID>/export?format=csv&gid=<sheet_name_or_id>
// gid can be either numeric ID or sheet tab name (URL-encoded).
function buildCsvUrl(link: string, sheetName: string): string {
  // Strip #gid=... and ?query...
  let base = link.split('#')[0];
  base = base.split('?')[0];
  // Normalize path — must end with /export
  if (!base.endsWith('/export')) {
    // Common forms:
    //   https://docs.google.com/spreadsheets/d/<ID>/edit
    //   https://docs.google.com/spreadsheets/d/<ID>/
    //   https://docs.google.com/spreadsheets/d/<ID>
    base = base.replace(/\/(edit|copy|pubhtml|html)(\/.*)?$/, '');
    base = base.replace(/\/$/, '');
    base += '/export';
  }
  return `${base}?format=csv&gid=${encodeURIComponent(sheetName)}`;
}

// ---------- POST /api/saoviet-data/sync-all ----------
// Body: { link: string }
// Action: For each program in ['ca-nhan', 'tn-ktm', 'tn-td']:
//   1) Build CSV URL with gid=<program> (sheet tab named 'ca-nhan' | 'tn-ktm' | 'tn-td')
//   2) Fetch CSV
//   3) Parse → normalize → DELETE old rows → INSERT new rows
// Returns: { results: { 'ca-nhan': {count, deleted, error?}, ... }, syncedFrom: link }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const link = String(body?.link || '').trim();

    if (!link) {
      return NextResponse.json({ error: 'Thiếu link Google Sheets' }, { status: 400 });
    }
    if (!link.includes('docs.google.com/spreadsheets') && !link.includes('googleusercontent.com')) {
      return NextResponse.json({ error: 'URL không hợp lệ — phải là Google Sheets URL' }, { status: 400 });
    }

    const results: Record<string, { count: number; deleted: number; error?: string }> = {};

    for (const program of PROGRAMS) {
      try {
        const csvUrl = buildCsvUrl(link, program);
        const resp = await fetch(csvUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/csv,text/plain,application/csv,*/*',
          },
          next: { revalidate: 0 },
        });

        if (!resp.ok) {
          results[program] = { count: 0, deleted: 0, error: `HTTP ${resp.status}` };
          continue;
        }

        const csv = await resp.text();
        // Empty sheet → wipe data for this program
        if (!csv || !csv.trim()) {
          await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
          results[program] = { count: 0, deleted: 0 };
          continue;
        }

        const rowsIn = parseCsvToRows(csv);
        if (rowsIn.length === 0) {
          await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
          results[program] = { count: 0, deleted: 0 };
          continue;
        }

        const normalized = rowsIn
          .map((r: any) => normalizeRow(program, r))
          .filter((r: any) => r.agentCode || r.agentName);

        if (normalized.length === 0) {
          // No valid rows — still wipe old data
          await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
          results[program] = { count: 0, deleted: 0, error: 'Không có dòng hợp lệ (thiếu Mã số / Họ tên)' };
          continue;
        }

        const result = await withRetry(() => db.$transaction(async (tx) => {
          const deleted = await tx.saoVietData.deleteMany({ where: { program } });
          const created = await tx.saoVietData.createMany({
            data: normalized.map(r => ({ ...r, program })),
          });
          return { deleted: deleted.count, created: created.count };
        }));

        results[program] = { count: result.created, deleted: result.deleted };
      } catch (e: any) {
        results[program] = { count: 0, deleted: 0, error: String(e?.message || e) };
      }
    }

    return NextResponse.json({
      results,
      syncedFrom: link,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/saoviet-data/sync-all error:', error);
    return NextResponse.json({ error: 'Sync-all failed: ' + String(error?.message || error) }, { status: 500 });
  }
}
