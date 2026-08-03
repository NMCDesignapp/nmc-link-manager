import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedDataHubRequest, isDataHubImport } from '@/lib/data-hub-auth';
import { db, withRetry } from '@/lib/db';
import { getSyncSource } from '@/lib/sync-source';

// ---------- Constants ----------
const VALID_PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td'] as const;
type Program = typeof VALID_PROGRAMS[number];

type NormalizedSaoVietRow = {
  agentCode: string;
  agentName: string;
  nhomKD: string;
  fyp: number;
  fypTVVm: number;
  slTvvmHDC: number;
  tvvmCount: number;
};

const DEFAULT_GIDS: Record<Program, string[]> = {
  'ca-nhan': ['681352635', '0'],
  'tn-ktm':  ['1078354882', '1'],
  'tn-td':   ['1521644652', '2'],
};

function isValidProgram(p: string | null | undefined): p is Program {
  return !!p && (VALID_PROGRAMS as readonly string[]).includes(p);
}

// ---------- Vietnamese number parsing ----------
function parseVietnameseNumber(v: any): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const raw = String(v).trim();
  if (raw === '' || raw === '-') return 0;
  let s = raw.replace(/[^\d.,\-]/g, '');
  if (s === '' || s === '-') return 0;
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2) {
      s = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      s = parts.join('');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length > 2) {
      s = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      s = parts.join('');
    }
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseIntVal(v: any): number {
  return Math.round(parseVietnameseNumber(v));
}

// ---------- CSV parsing (no header — positional) ----------
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

function parseCsvToRowsRaw(csv: string): string[][] {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
  return lines.map(parseCsvLine);
}

function normalizeRow(program: Program, cells: string[]): NormalizedSaoVietRow {
  const pickStr = (idx: number): string => {
    const v = cells[idx];
    return v == null ? '' : String(v).trim();
  };
  const nhomKD = pickStr(0);
  const agentCode = pickStr(1);
  const agentName = pickStr(2);

  if (program === 'tn-td') {
    return {
      agentCode,
      agentName,
      nhomKD,
      fyp:       0,
      fypTVVm:   parseVietnameseNumber(pickStr(3)),
      slTvvmHDC: parseIntVal(pickStr(4)),
      tvvmCount: parseIntVal(pickStr(5)),
    };
  }
  return {
    agentCode,
    agentName,
    nhomKD,
    fyp:       parseVietnameseNumber(pickStr(3)),
    fypTVVm:   0,
    slTvvmHDC: 0,
    tvvmCount: 0,
  };
}

// Local workbook layout (Data Hub): use Excel columns C,D,E,G,H,I,J,K,L
// and ignore all rows before row 6. This avoids the title/header rows that
// differ between the Excel file and the legacy Google Sheet export.
function normalizeDataHubWorkbookRow(program: Program, cells: string[]): NormalizedSaoVietRow {
  const pick = (idx: number) => String(cells[idx] ?? '').trim();
  const nhomKD = pick(2); // C
  const agentCode = pick(3); // D
  const agentName = pick(4); // E
  const valueG = parseVietnameseNumber(pick(6)); // G
  const valueH = parseIntVal(pick(7)); // H
  const valueI = parseIntVal(pick(8)); // I
  // Read J/K/L deliberately so the source contract remains explicit even
  // though the current SaoVietData model only displays the metrics above.
  void pick(9); void pick(10); void pick(11);

  if (program === 'tn-td') {
    return { agentCode, agentName, nhomKD, fyp: 0, fypTVVm: valueG, slTvvmHDC: valueH, tvvmCount: valueI };
  }
  return { agentCode, agentName, nhomKD, fyp: valueG, fypTVVm: 0, slTvvmHDC: 0, tvvmCount: 0 };
}

// C can be blank for a leader in the Sao Viet workbook. In that case,
// resolve the group from the Structure module, with Staff/Leader data as
// compatibility fallbacks. Never invent a group when no structure exists.
async function fillMissingGroups(rows: NormalizedSaoVietRow[]): Promise<NormalizedSaoVietRow[]> {
  const codes = [...new Set(rows.filter(row => !row.nhomKD && row.agentCode).map(row => row.agentCode))];
  if (codes.length === 0) return rows;

  const [tvvRows, staffRows, leaderRows] = await Promise.all([
    db.tVVStruct.findMany({ where: { agentCode: { in: codes } }, select: { agentCode: true, maBanNhom: true } }),
    db.staff.findMany({ where: { agentCode: { in: codes } }, select: { agentCode: true, nhom: true } }),
    db.leaderInfo.findMany({ where: { agentCode: { in: codes } }, select: { agentCode: true, nhom: true } }),
  ]);
  const structureCodes = [...new Set(tvvRows.map(row => row.maBanNhom).filter(Boolean))];
  const banNhomRows = structureCodes.length
    ? await db.banNhom.findMany({ where: { maBanNhom: { in: structureCodes } }, select: { maBanNhom: true, tenBanNhom: true } })
    : [];
  const groupByStructureCode = new Map(banNhomRows.map(row => [row.maBanNhom, row.tenBanNhom]));
  const groupByAgentCode = new Map<string, string>();

  for (const row of tvvRows) {
    const group = groupByStructureCode.get(row.maBanNhom);
    if (group) groupByAgentCode.set(row.agentCode, group);
  }
  for (const row of staffRows) {
    if (row.nhom && !groupByAgentCode.has(row.agentCode)) groupByAgentCode.set(row.agentCode, row.nhom);
  }
  for (const row of leaderRows) {
    if (row.nhom && !groupByAgentCode.has(row.agentCode)) groupByAgentCode.set(row.agentCode, row.nhom);
  }

  return rows.map(row => row.nhomKD || !row.agentCode
    ? row
    : { ...row, nhomKD: groupByAgentCode.get(row.agentCode) || '' });
}

function extractSpreadsheetId(link: string): string | null {
  const m = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  const m2 = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return null;
}

async function discoverGidForProgram(spreadsheetId: string, program: Program): Promise<string> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlembed`;
    const resp = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
      },
      next: { revalidate: 0 },
    });
    if (!resp.ok) return DEFAULT_GIDS[program][0];
    const html = await resp.text();
    const found: Record<string, string> = {};
    const re = /name:\s*"([^"]+)"[^}]*?gid:\s*"(-?\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      found[m[1].trim().toLowerCase()] = m[2];
    }
    if (found[program]) return found[program];
    const candidates = [
      program, program.replace('-', ' '), program.replace('-', ''),
      program === 'ca-nhan' ? 'cá nhân' : program === 'tn-ktm' ? 'tn ktm' : 'tn td',
    ];
    for (const c of candidates) {
      if (found[c]) return found[c];
    }
    for (const [k, v] of Object.entries(found)) {
      if (k.includes(program) || program.includes(k)) return v;
    }
    return DEFAULT_GIDS[program][0];
  } catch {
    return DEFAULT_GIDS[program][0];
  }
}

async function fetchCsv(spreadsheetId: string, gid: string): Promise<{ csv?: string; error?: string }> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  try {
    const resp = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/csv,text/plain,application/csv,*/*',
      },
      next: { revalidate: 0 },
    });
    if (!resp.ok) return { error: `HTTP ${resp.status}` };
    const text = await resp.text();
    const trimmed = text.trim().toLowerCase();
    if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
      return { error: `Phản hồi HTML — sheet chưa share "Anyone with link"` };
    }
    if (!text || !text.trim()) return { error: 'CSV rỗng' };
    return { csv: text };
  } catch (e: any) {
    return { error: String(e?.message || e) };
  }
}

// ---------- POST /api/saoviet-data/sync ----------
// Body: { program: string, link: string }
// Action:
//   1) Extract spreadsheet ID from link
//   2) Discover numeric gid for the program's tab via /htmlembed
//   3) Fetch CSV → parse (positional, no header) → normalize → DELETE old → INSERT new
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const program = body?.program;
    const link = String(body?.link || '').trim();
    const directCsv = typeof body?.csv === 'string' ? body.csv : '';
    const fromDataHub = isDataHubImport(body);

    if (fromDataHub && !isAuthorizedDataHubRequest(req)) {
      return NextResponse.json({ error: 'Không được phép ghi dữ liệu Data Hub' }, { status: 401 });
    }
    const activeSource = await getSyncSource();
    if (fromDataHub && activeSource !== 'data-hub') {
      return NextResponse.json({ error: 'Data Hub đã tắt vì Google Sheets đang là nguồn đồng bộ' }, { status: 409 });
    }
    if (!fromDataHub && activeSource !== 'google') {
      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });
    }
    if (!isValidProgram(program)) {
      return NextResponse.json({ error: 'program không hợp lệ (ca-nhan | tn-ktm | tn-td)' }, { status: 400 });
    }
    if (!directCsv && !link) {
      return NextResponse.json({ error: 'Thiếu CSV Data Hub hoặc link Google Sheets' }, { status: 400 });
    }

    let csv = directCsv;
    let gid: string | null = null;
    if (!csv) {
      if (!link.includes('docs.google.com') && !link.includes('googleusercontent.com')) {
        return NextResponse.json({ error: 'URL không hợp lệ — phải là Google Sheets URL' }, { status: 400 });
      }
      const spreadsheetId = extractSpreadsheetId(link);
      if (!spreadsheetId) {
        return NextResponse.json({ error: 'Không đọc được spreadsheet ID từ link' }, { status: 400 });
      }
      gid = await discoverGidForProgram(spreadsheetId, program);
      const fetched = await fetchCsv(spreadsheetId, gid);
      if (fetched.error || !fetched.csv) {
        return NextResponse.json({ error: fetched.error || 'Không tải được CSV' }, { status: 502 });
      }
      csv = fetched.csv;
    }

    const rowsRaw = parseCsvToRowsRaw(csv);
    if (rowsRaw.length === 0) {
      await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
      return NextResponse.json({ count: 0, deleted: true, message: 'Sheet rỗng — đã xóa dữ liệu cũ', gidUsed: gid });
    }

    // Local Excel has fixed columns and begins its actual records at row 6.
    // The Google export retains its existing positional behavior.
    const firstRow = rowsRaw[0].map(c => c.toLowerCase().trim());
    const looksLikeHeader = firstRow.some(c =>
      c.includes('nhóm') || c.includes('nhom') ||
      c.includes('mã số') || c.includes('ma so') ||
      c.includes('họ tên') || c.includes('ho ten')
    );
    const dataRows = fromDataHub ? rowsRaw.slice(5) : (looksLikeHeader ? rowsRaw.slice(1) : rowsRaw);

    const parsedRows = dataRows
      .map(cells => fromDataHub ? normalizeDataHubWorkbookRow(program, cells) : normalizeRow(program, cells))
      .filter(r => (r.agentCode || '').trim() !== '' || (r.agentName || '').trim() !== '');
    const normalized = await fillMissingGroups(parsedRows);

    if (normalized.length === 0) {
      return NextResponse.json({ error: `CSV không có dòng hợp lệ (có ${rowsRaw.length} dòng)` }, { status: 400 });
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
      syncedFrom: fromDataHub ? 'nmc-data-hub' : link,
      gidUsed: gid || 'local',
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/saoviet-data/sync error:', error);
    return NextResponse.json({ error: 'Sync failed: ' + String(error?.message || error) }, { status: 500 });
  }
}
