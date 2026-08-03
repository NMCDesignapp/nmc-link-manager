import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { getSyncSource } from '@/lib/sync-source';

// ---------- Constants ----------
const PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td'] as const;
type Program = typeof PROGRAMS[number];

// User's sheet (https://docs.google.com/spreadsheets/d/19dZjztqA6dIlK_MuLn3dQx3oUDLPQuZtO8CbGrqRGK4/edit)
// has tabs named exactly: ca-nhan | tn-ktm | tn-td
// Google Sheets CSV export endpoint ONLY accepts NUMERIC gids — tab NAMES return HTTP 400.
// So we MUST discover numeric gids by fetching /htmlembed and parsing the JS.
const DEFAULT_GIDS: Record<Program, string[]> = {
  'ca-nhan': ['681352635', '0'],
  'tn-ktm':  ['1078354882', '1'],
  'tn-td':   ['1521644652', '2'],
};

// ---------- Vietnamese number parsing ----------
// Vietnamese format: "859.923.791" = 859923791 (dots = thousand separators)
// Sometimes commas appear too: "1.234,56" = 1234.56
// We always treat dots as thousand separator (Vietnamese convention) — this matches the user's data.
function parseVietnameseNumber(v: any): number {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const raw = String(v).trim();
  if (raw === '' || raw === '-') return 0;
  // Remove currency symbols, spaces, "đ", "Đ", "%"
  let s = raw.replace(/[^\d.,\-]/g, '');
  if (s === '' || s === '-') return 0;
  // Detect decimal separator: if both . and , present, the LAST one is the decimal sep
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  if (hasDot && hasComma) {
    // Last separator = decimal
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Comma is decimal → dots are thousands
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal → commas are thousands
      s = s.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Only dots — Vietnamese: thousands separator
    // But could be "1.5" (decimal) — heuristic: if more than one dot OR a group of 3 digits after a dot → thousands
    const parts = s.split('.');
    if (parts.length > 2) {
      // Multiple dots → definitely thousands separators
      s = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      // "1.234" or "85.923" — ambiguous; treat as thousands (Vietnamese convention)
      s = parts.join('');
    }
    // else: leave as decimal (e.g., "1.5")
  } else if (hasComma) {
    // Only commas — Vietnamese: could be decimal OR thousands
    const parts = s.split(',');
    if (parts.length > 2) {
      // Multiple commas → thousands separators
      s = parts.join('');
    } else if (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3) {
      // "1,234" — assume thousands
      s = parts.join('');
    }
    // else: leave as decimal
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseIntVal(v: any): number {
  return Math.round(parseVietnameseNumber(v));
}

// ---------- CSV parsing (NO header row — all rows are data) ----------
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

// Returns array of cell-arrays (rows). Each row = array of raw cell strings.
function parseCsvToRowsRaw(csv: string): string[][] {
  const lines = csv.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
  return lines.map(parseCsvLine);
}

// ---------- Row normalizer (positional — no header) ----------
// Expected column layout (matches user's sheet, data starts from NHÓM):
//   ca-nhan / tn-ktm:  col0=NHÓM | col1=MÃ SỐ | col2=HỌ TÊN | col3=FYP | (extra cols ignored)
//   tn-td:             col0=NHÓM | col1=MÃ SỐ | col2=HỌ TÊN | col3=FYP TVVm | col4=SL TVVm HĐC | col5=TVVm COUNT | (extra cols ignored)
function normalizeRow(program: Program, cells: string[]) {
  const pickStr = (idx: number): string => {
    const v = cells[idx];
    return v == null ? '' : String(v).trim();
  };
  // Skip rows whose first 3 cells are empty (likely blank line / footer)
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

// ---------- Discover numeric gids via /htmlembed ----------
// The /htmlembed page contains JS like:
//   items.push({name: "ca-nhan", pageUrl: "...&gid=681352635", gid: "681352635", ...});
// We extract these mappings and fall back to DEFAULT_GIDS if discovery fails.
async function discoverGids(spreadsheetId: string): Promise<Record<Program, string>> {
  const fallback: Record<Program, string> = {
    'ca-nhan': DEFAULT_GIDS['ca-nhan'][0],
    'tn-ktm':  DEFAULT_GIDS['tn-ktm'][0],
    'tn-td':   DEFAULT_GIDS['tn-td'][0],
  };
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
    if (!resp.ok) return fallback;
    const html = await resp.text();
    // Match: name: "X", pageUrl: "...&gid=Y", gid: "Y"
    // OR:    name: "X", ... gid: "Y"
    const found: Record<string, string> = {};
    const re = /name:\s*"([^"]+)"[^}]*?gid:\s*"(-?\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      found[m[1].trim().toLowerCase()] = m[2];
    }
    const result: Record<Program, string> = { ...fallback };
    for (const p of PROGRAMS) {
      // Direct name match
      if (found[p]) { result[p] = found[p]; continue; }
      // Try with/without Vietnamese accents / hyphens / spaces
      const candidates = [
        p, p.replace('-', ' '), p.replace('-', ''),
        p === 'ca-nhan' ? 'cá nhân' : p === 'tn-ktm' ? 'tn ktm' : 'tn td',
      ];
      let matched = false;
      for (const c of candidates) {
        if (found[c]) { result[p] = found[c]; matched = true; break; }
      }
      if (!matched) {
        // Try includes match
        for (const [k, v] of Object.entries(found)) {
          if (k.includes(p) || p.includes(k)) { result[p] = v; matched = true; break; }
        }
      }
      if (!matched) result[p] = fallback[p]; // Keep default
    }
    return result;
  } catch {
    return fallback;
  }
}

// Extract spreadsheet ID from any Google Sheets URL form
function extractSpreadsheetId(link: string): string | null {
  // /d/<ID>/  or  /d/<ID>  (with optional subpath)
  const m = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  // id= query param
  const m2 = link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  return null;
}

// Check if link is a published link (/e/2PACX-.../pub?output=csv)
function isPublishedLink(link: string): boolean {
  return link.includes('/e/') && link.includes('/pub');
}

// Keep exactly one Google Sheets URL even if an administrator accidentally pastes
// multiple URLs into the same setting. Prefer the standard spreadsheet link because
// it lets the sync match the three tabs by their names.
function normalizeGoogleSheetLink(rawLink: string): string {
  const raw = rawLink.trim();
  const spreadsheetId = extractSpreadsheetId(raw);
  if (spreadsheetId) return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const published = raw.match(/https?:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[a-zA-Z0-9_-]+\/pub(?:\?[^\s]*)?/);
  return published?.[0] || raw;
}

// Build published CSV URL with gid
function buildPublishedCsvUrl(publishedLink: string, gid: string): string {
  const base = publishedLink.replace(/&gid=\d+/g, '');
  return `${base}&gid=${gid}`;
}

// Discover gids from published link via /pubhtml
async function discoverPublishedGids(publishedLink: string): Promise<Record<Program, string>> {
  const fallback: Record<Program, string> = {
    'ca-nhan': DEFAULT_GIDS['ca-nhan'][0],
    'tn-ktm':  DEFAULT_GIDS['tn-ktm'][0],
    'tn-td':   DEFAULT_GIDS['tn-td'][0],
  };
  try {
    const pubhtmlUrl = publishedLink.replace(/\/pub\?[^/]*$/, '/pubhtml');
    const resp = await fetch(pubhtmlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 },
    });
    if (!resp.ok) return fallback;
    const html = await resp.text();
    const found: Record<string, string> = {};
    const gids: string[] = [];
    const regex = /gid=(\d+)/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      if (!gids.includes(m[1])) gids.push(m[1]);
    }
    if (gids.length >= 3) {
      found['ca-nhan'] = gids[0];
      found['tn-ktm'] = gids[1];
      found['tn-td'] = gids[2];
    }
    return {
      'ca-nhan': found['ca-nhan'] || fallback['ca-nhan'],
      'tn-ktm':  found['tn-ktm']  || fallback['tn-ktm'],
      'tn-td':   found['tn-td']   || fallback['tn-td'],
    };
  } catch {
    return fallback;
  }
}

// Fetch CSV from published link with specific gid
async function fetchPublishedCsv(publishedLink: string, gid: string): Promise<{ csv?: string; error?: string }> {
  const csvUrl = buildPublishedCsvUrl(publishedLink, gid);
  try {
    const resp = await fetch(csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv,text/plain,*/*',
      },
      next: { revalidate: 0 },
    });
    if (!resp.ok) return { error: `HTTP ${resp.status} (gid=${gid})` };
    const text = await resp.text();
    const trimmed = text.trim().toLowerCase();
    if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) {
      return { error: `Phản hồi HTML (gid=${gid})` };
    }
    if (!text || !text.trim()) return { error: `CSV rỗng (gid=${gid})` };
    return { csv: text };
  } catch (e: any) {
    return { error: `${String(e?.message || e)} (gid=${gid})` };
  }
}

// ---------- Build CSV URL with numeric gid ----------
function buildCsvUrl(spreadsheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}

// ---------- Fetch CSV with single gid (already numeric) ----------
async function fetchCsv(spreadsheetId: string, gid: string): Promise<{ csv?: string; error?: string }> {
  const csvUrl = buildCsvUrl(spreadsheetId, gid);
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
      return { error: `Phản hồi HTML (gid=${gid}) — sheet chưa share "Anyone with link"` };
    }
    if (!text || !text.trim()) return { error: `CSV rỗng (gid=${gid})` };
    return { csv: text };
  } catch (e: any) {
    return { error: `${String(e?.message || e)} (gid=${gid})` };
  }
}

// ---------- POST /api/saoviet-data/sync-all ----------
// Body: { link: string }
// Action:
//   1) Extract spreadsheet ID from link
//   2) Discover numeric gids for each tab via /htmlembed (fallback to defaults)
//   3) For each program: fetch CSV → parse (positional, no header) → normalize → DELETE old → INSERT new
// Returns: { results: { 'ca-nhan': {count, deleted, error?}, ... }, syncedFrom: link, gidsUsed: {...} }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (await getSyncSource() !== 'google') {
      return NextResponse.json({ error: 'Google Sheets đã tắt vì Data Hub trên máy tính đang là nguồn đồng bộ' }, { status: 409 });
    }
    const link = normalizeGoogleSheetLink(String(body?.link || ''));

    if (!link) {
      return NextResponse.json({ error: 'Thiếu link Google Sheets' }, { status: 400 });
    }
    if (!link.includes('docs.google.com') && !link.includes('sheets') && !link.includes('googleusercontent.com')) {
      return NextResponse.json({ error: 'URL không hợp lệ — phải là Google Sheets URL' }, { status: 400 });
    }

    // Check if link is a published link (/e/2PACX-.../pub?output=csv)
    const published = isPublishedLink(link);

    let gids: Record<Program, string>;
    if (published) {
      // Published link: discover gids via /pubhtml
      gids = await discoverPublishedGids(link);
    } else {
      // Standard link: extract spreadsheet ID + discover gids via /htmlembed
      const spreadsheetId = extractSpreadsheetId(link);
      if (!spreadsheetId) {
        return NextResponse.json({ error: 'Không đọc được spreadsheet ID từ link' }, { status: 400 });
      }
      gids = await discoverGids(spreadsheetId);
    }

    const results: Record<string, { count: number; deleted: number; error?: string; gidUsed?: string }> = {};

    for (const program of PROGRAMS) {
      try {
        const gid = gids[program];
        // Use published fetch or standard fetch depending on link type
        const csvResult = published
          ? await fetchPublishedCsv(link, gid)
          : await fetchCsv(extractSpreadsheetId(link)!, gid);
        const { csv, error } = csvResult;
        if (error || !csv) {
          results[program] = { count: 0, deleted: 0, error: error || 'Không tải được CSV', gidUsed: gid };
          continue;
        }

        const rowsRaw = parseCsvToRowsRaw(csv);
        if (rowsRaw.length === 0) {
          await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
          results[program] = { count: 0, deleted: 0, gidUsed: gid };
          continue;
        }

        // Detect & skip header row if first row looks like header
        // (e.g., contains "nhóm" or "mã số" or "họ tên")
        const firstRow = rowsRaw[0].map(c => c.toLowerCase().trim());
        const looksLikeHeader = firstRow.some(c =>
          c.includes('nhóm') || c.includes('nhom') ||
          c.includes('mã số') || c.includes('ma so') ||
          c.includes('họ tên') || c.includes('ho ten')
        );
        const dataRows = looksLikeHeader ? rowsRaw.slice(1) : rowsRaw;

        const normalized = dataRows
          .map(cells => normalizeRow(program, cells))
          // Lenient filter: accept any row with at least one of (nhomKD, agentCode, agentName)
          .filter(r => (r.agentCode || '').trim() !== '' || (r.agentName || '').trim() !== '' || (r.nhomKD || '').trim() !== '');

        if (normalized.length === 0) {
          await withRetry(() => db.saoVietData.deleteMany({ where: { program } }));
          results[program] = {
            count: 0, deleted: 0, gidUsed: gid,
            error: `Không có dòng hợp lệ (sheet có ${rowsRaw.length} dòng)`,
          };
          continue;
        }

        const result = await withRetry(() => db.$transaction(async (tx) => {
          const deleted = await tx.saoVietData.deleteMany({ where: { program } });
          const created = await tx.saoVietData.createMany({
            data: normalized.map(r => ({ ...r, program })),
          });
          return { deleted: deleted.count, created: created.count };
        }));

        results[program] = { count: result.created, deleted: result.deleted, gidUsed: gid };
      } catch (e: any) {
        results[program] = { count: 0, deleted: 0, error: String(e?.message || e) };
      }
    }

    return NextResponse.json({
      results,
      syncedFrom: link,
      gidsUsed: gids,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/saoviet-data/sync-all error:', error);
    return NextResponse.json({ error: 'Sync-all failed: ' + String(error?.message || error) }, { status: 500 });
  }
}
