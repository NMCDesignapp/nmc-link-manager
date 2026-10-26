import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasSameOrigin, isAdminRequest } from '@/lib/admin-session';
import { decodeRegisteredProgram, targetCode } from '@/lib/contest-registered-targets';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
const key = (id: string) => `contest-sv-approval-v1:${id}`;
const answer = (payload: object, status = 200) => NextResponse.json(payload, { status, headers: noStore });
function parse(value?: string | null): Record<string, boolean> {
  if (!value) return {};
  try {
    const raw: unknown = JSON.parse(value);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([code, checked]) =>
      /^[A-Z0-9_-]{1,64}$/.test(code) && checked === true
    ).map(([code]) => [code, true]));
  } catch { return {}; }
}

export async function GET(request: NextRequest) {
  const contestId = request.nextUrl.searchParams.get('contestId');
  if (!validId(contestId)) return answer({ error: 'Thiếu mã chương trình' }, 400);
  try {
    const value = await db.setting.findUnique({ where: { key: key(contestId) }, select: { value: true } });
    return answer({ approvals: parse(value?.value) });
  } catch {
    return answer({ error: 'Không tải được trạng thái duyệt' }, 500);
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) return answer({ error: 'Chỉ admin được duyệt điều kiện' }, 401);
  if (!hasSameOrigin(request)) return answer({ error: 'Không hợp lệ' }, 403);
  let body: { contestId?: unknown; code?: unknown; approved?: unknown; approvals?: unknown };
  try { body = await request.json(); } catch { return answer({ error: 'Dữ liệu không hợp lệ' }, 400); }

  const { contestId } = body;
  if (!validId(contestId)) return answer({ error: 'Thiếu mã chương trình hợp lệ' }, 400);
  let changes: Array<[string, boolean]>;
  if (Object.prototype.hasOwnProperty.call(body, 'approvals')) {
    const raw = body.approvals;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return answer({ error: 'Danh sách duyệt không hợp lệ' }, 400);
    changes = Object.entries(raw).map(([code, checked]) => [targetCode(code), checked as boolean]);
    if (changes.length > 5000) return answer({ error: 'Vượt giới hạn 5.000 đối tượng' }, 400);
  } else {
    changes = [[targetCode(body.code), body.approved as boolean]];
  }
  if (!changes.length || changes.some(([code, checked]) => !/^[A-Z0-9_-]{1,64}$/.test(code) || typeof checked !== 'boolean')) {
    return answer({ error: 'Dữ liệu duyệt không hợp lệ' }, 400);
  }

  try {
    const contest = await db.contest.findUnique({ where: { id: contestId }, select: { participants: true } });
    const program = contest ? decodeRegisteredProgram(contest.participants) : null;
    if (!program) return answer({ error: 'Không tìm thấy chương trình đã lưu' }, 404);
    const validCodes = new Set(program.rows.map(row => targetCode(row.code)));
    if (changes.some(([code]) => !validCodes.has(code))) {
      return answer({ error: 'Mã đối tượng không có trong chương trình đã lưu' }, 404);
    }
    const settingKey = key(contestId);
    const value = await db.setting.findUnique({ where: { key: settingKey }, select: { value: true } });
    const next = parse(value?.value);
    for (const [code, checked] of changes) {
      if (checked) next[code] = true;
      else delete next[code];
    }
    const serialized = JSON.stringify(next);
    await db.setting.upsert({ where: { key: settingKey }, update: { value: serialized }, create: { key: settingKey, value: serialized } });
    return answer({ approvals: next });
  } catch {
    return answer({ error: 'Không lưu được trạng thái duyệt' }, 500);
  }
}
