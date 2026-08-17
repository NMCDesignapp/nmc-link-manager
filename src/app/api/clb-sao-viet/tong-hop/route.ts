import { NextRequest, NextResponse } from 'next/server';
import { GET as getClbMembers } from '@/app/api/clb-members/route';
import { GET as getDuyTriTVV } from '@/app/api/clb-sao-viet/duy-tri/route';
import { GET as getDuyTriTN } from '@/app/api/clb-sao-viet/duy-tri-tn/route';
import { GET as getDuyTriTTN } from '@/app/api/clb-sao-viet/duy-tri-ttn/route';
import { GET as getGiaNhapTVV } from '@/app/api/clb-sao-viet/gia-nhap-tvv/route';
import { GET as getGiaNhapTN } from '@/app/api/clb-sao-viet/gia-nhap-tn/route';
import { GET as getGiaNhapTTN } from '@/app/api/clb-sao-viet/gia-nhap-ttn/route';

type RouteHandler = (request: NextRequest) => Promise<Response>;
type SourceKey = 'duyTriTVV' | 'duyTriTN' | 'duyTriTTN' | 'giaNhapTVV' | 'giaNhapTN' | 'giaNhapTTN';

type MemberLike = {
  id?: string;
  ad?: string;
  nhom?: string;
  agentCode?: string;
  agentName?: string;
  chucVu?: string;
  note?: string;
  passed?: boolean;
};

type AggregateMember = {
  id: string;
  ad: string;
  nhom: string;
  agentCode: string;
  agentName: string;
  chucVu: string;
  note: string;
  permanent: boolean;
  permanentYear: number | null;
  sources: string[];
};

function normalizeCode(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN')
    .replace(/\s+/g, ' ')
    .trim();
}

function memberKey(member: MemberLike): string {
  const code = normalizeCode(member.agentCode);
  if (code) return `CODE:${code}`;
  return `NAME:${normalizeText(member.agentName)}|${normalizeText(member.nhom)}`;
}

function permanentYear(note: unknown): number | null {
  const normalized = normalizeText(note).toUpperCase();
  if (/(^|\s|-)SV\s*2025(\s|-|$)/.test(normalized)) return 2025;
  if (/(^|\s|-)SV\s*2026(\s|-|$)/.test(normalized)) return 2026;
  return null;
}

async function callAssessmentRoute(handler: RouteHandler, path: string, year: number, month: number) {
  const request = new NextRequest(`http://clb-internal.local${path}?year=${year}&month=${month}`);
  const response = await handler(request);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || `Không thể tổng hợp ${path}`);
  }
  return data;
}

function toAggregateMember(member: MemberLike, permanent = false, year: number | null = null): AggregateMember {
  return {
    id: String(member.id || memberKey(member)),
    ad: String(member.ad || ''),
    nhom: String(member.nhom || ''),
    agentCode: String(member.agentCode || ''),
    agentName: String(member.agentName || ''),
    chucVu: String(member.chucVu || ''),
    note: String(member.note || ''),
    permanent,
    permanentYear: year,
    sources: [],
  };
}

function buildMemberNote(row: AggregateMember, assessmentLabel: string): string {
  if (row.sources.some((source) => source.startsWith('Gia nhập '))) {
    return `Gia nhập mới đợt xét ${assessmentLabel}`;
  }
  return row.sources.filter((source) => source.startsWith('Duy trì ')).join(' • ');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year'));
    const month = Number(searchParams.get('month'));

    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'Năm xét không hợp lệ' }, { status: 400 });
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Đợt xét không hợp lệ' }, { status: 400 });
    }

    // Cố ý chạy TUẦN TỰ 6 phép tính để tránh tạo connection burst vào DB.
    // Mục tổng hợp chỉ tải khi người dùng mở thư mục thứ 3.
    const clbResponse = await getClbMembers();
    const clbMembers = await clbResponse.json();
    if (!clbResponse.ok) throw new Error(clbMembers?.error || 'Không thể đọc DS Thành viên CLB');

    const calculations: Record<SourceKey, any> = {
      duyTriTVV: await callAssessmentRoute(getDuyTriTVV, '/api/clb-sao-viet/duy-tri', year, month),
      duyTriTN: await callAssessmentRoute(getDuyTriTN, '/api/clb-sao-viet/duy-tri-tn', year, month),
      duyTriTTN: await callAssessmentRoute(getDuyTriTTN, '/api/clb-sao-viet/duy-tri-ttn', year, month),
      giaNhapTVV: await callAssessmentRoute(getGiaNhapTVV, '/api/clb-sao-viet/gia-nhap-tvv', year, month),
      giaNhapTN: await callAssessmentRoute(getGiaNhapTN, '/api/clb-sao-viet/gia-nhap-tn', year, month),
      giaNhapTTN: await callAssessmentRoute(getGiaNhapTTN, '/api/clb-sao-viet/gia-nhap-ttn', year, month),
    };

    const assessmentLabel = `1/${month}/${year}`;
    const entryMonths = Array.isArray(calculations.giaNhapTVV?.months) ? calculations.giaNhapTVV.months : [];
    const entryPeriodLabel = entryMonths.length > 0
      ? entryMonths.map((item: any) => String(item?.label || '')).filter(Boolean).join(' - ')
      : '3 tháng liền trước';

    const memberMap = new Map<string, AggregateMember>();

    // Thành viên nền cố định: GHI CHÚ có SV 2025 hoặc SV 2026.
    // Giữ nguyên ghi chú gốc và luôn giữ trong CLB qua mọi đợt xét.
    for (const raw of Array.isArray(clbMembers) ? clbMembers : []) {
      const yearTag = permanentYear(raw?.note);
      if (!yearTag) continue;
      const key = memberKey(raw);
      if (!key || memberMap.has(key)) continue;
      memberMap.set(key, toAggregateMember(raw, true, yearTag));
    }

    const sourceDefs: Array<{ key: SourceKey; label: string; kind: 'retention' | 'entry' }> = [
      { key: 'duyTriTVV', label: 'Duy trì TVV', kind: 'retention' },
      { key: 'duyTriTN', label: 'Duy trì TN', kind: 'retention' },
      { key: 'duyTriTTN', label: 'Duy trì TTN', kind: 'retention' },
      { key: 'giaNhapTVV', label: 'Gia nhập TVV', kind: 'entry' },
      { key: 'giaNhapTN', label: 'Gia nhập TN', kind: 'entry' },
      { key: 'giaNhapTTN', label: 'Gia nhập TTN', kind: 'entry' },
    ];

    const retentionKeys = new Set<string>();
    const entryKeys = new Set<string>();

    for (const source of sourceDefs) {
      const rows: MemberLike[] = Array.isArray(calculations[source.key]?.rows) ? calculations[source.key].rows : [];
      for (const row of rows) {
        if (!row?.passed) continue;
        const key = memberKey(row);
        if (!key) continue;
        if (source.kind === 'retention') retentionKeys.add(key);
        else entryKeys.add(key);

        const existing = memberMap.get(key);
        if (existing) {
          // SV 2025 / SV 2026 là ghi chú nền cố định: tuyệt đối không ghi đè.
          if (!existing.permanent && !existing.sources.includes(source.label)) {
            existing.sources.push(source.label);
          }
          // Chỉ bù các trường trống, không làm thay đổi thông tin nền đang có.
          if (!existing.ad && row.ad) existing.ad = String(row.ad);
          if (!existing.nhom && row.nhom) existing.nhom = String(row.nhom);
          if (!existing.agentCode && row.agentCode) existing.agentCode = String(row.agentCode);
          if (!existing.agentName && row.agentName) existing.agentName = String(row.agentName);
          if (!existing.chucVu && row.chucVu) existing.chucVu = String(row.chucVu);
          continue;
        }

        const next = toAggregateMember(row, false, null);
        next.sources = [source.label];
        memberMap.set(key, next);
      }
    }

    const rows = Array.from(memberMap.values())
      .map((row) => ({
        ...row,
        note: row.permanent ? row.note : buildMemberNote(row, assessmentLabel),
      }))
      .sort((a, b) => {
        if (a.permanent !== b.permanent) return a.permanent ? -1 : 1;
        if (a.permanent && b.permanent && a.permanentYear !== b.permanentYear) {
          return Number(a.permanentYear || 9999) - Number(b.permanentYear || 9999);
        }
        return String(a.agentName).localeCompare(String(b.agentName), 'vi', { sensitivity: 'base' });
      });

    return NextResponse.json({
      assessment: { year, month, label: assessmentLabel, entryPeriodLabel },
      generatedAt: new Date().toISOString(),
      summary: {
        total: rows.length,
        permanent: rows.filter((row) => row.permanent).length,
        qualifiedRetention: rows.filter((row) => !row.permanent && retentionKeys.has(memberKey(row))).length,
        qualifiedEntry: rows.filter((row) => !row.permanent && entryKeys.has(memberKey(row))).length,
        duplicatesRemoved: sourceDefs.reduce((sum, source) => {
          const passed = (calculations[source.key]?.rows || []).filter((row: any) => row?.passed).length;
          return sum + passed;
        }, 0) + rows.filter((row) => row.permanent).length - rows.length,
      },
      rows,
      calculations,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('GET /api/clb-sao-viet/tong-hop error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tổng hợp DS thành viên CLB sau đợt xét' }, { status: 500 });
  }
}
