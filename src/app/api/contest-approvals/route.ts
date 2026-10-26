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
  let body: { contestId?: unknown; code?: unknown; approved?: unknown };
  try { body = await request.json(); } catch { return answer({ error: 'Dữ liệu không hợp lệ' }, 400); }
  const { contestId, code, approved } = body;
  const normalized = targetCode(code);
  if (!validId(contestId) || !/^[A-Z0-9_-]{1,64}$/.test(normalized) || typeof approved !== 'boolean') {
    return answer({ error: 'Dữ liệu duyệt không hợp lệ' }, 400);
  }
  try {
    const contest = await db.contest.findUnique({ where: { id: contestId }, select: { participants: true } });
    const program = contest ? decodeRegisteredProgram(contest.participants) : null;
    if (!program || !program.rows.some(row => targetCode(row.code) === normalized)) {
      return answer({ error: 'Mã đối tượng không có trong chương trình đã lưu' }, 404);
    }
    const settingKey = key(contestId);
    const value = await db.setting.findUnique({ where: { key: settingKey }, select: { value: true } });
    const next = parse(value?.value);
    if (approved) next[normalized] = true;
    else delete next[normalized];
    const serialized = JSON.stringify(next);
    await db.setting.upsert({ where: { key: settingKey }, update: { value: serialized }, create: { key: settingKey, value: serialized } });
    return answer({ approvals: next });
  } catch {
    return answer({ error: 'Không lưu được trạng thái duyệt' }, 500);
  }
}
