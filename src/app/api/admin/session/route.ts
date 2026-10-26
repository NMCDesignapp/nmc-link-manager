import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, adminCookieOptions, createAdminSession, hasSameOrigin, isAdminRequest } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
// Defense in depth: application-instance throttling; infrastructure-level rate limiting is recommended too.
const attempts = new Map<string, { count: number; until: number }>();
function response(payload: object, status = 200) {
  return NextResponse.json(payload, { status, headers: noStore });
}

export async function GET(request: NextRequest) {
  return response({ authenticated: isAdminRequest(request) });
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return response({ error: 'Không hợp lệ' }, 403);
  const expected = process.env.NMC_ADMIN_PASSWORD;
  if (!expected || !process.env.NMC_ADMIN_SESSION_SECRET || process.env.NMC_ADMIN_SESSION_SECRET.length < 16) {
    return response({ error: 'Chưa cấu hình xác thực quản trị' }, 503);
  }
  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const state = attempts.get(ip);
  if (state && state.until > now && state.count >= 8) return response({ error: 'Đăng nhập quá nhiều lần, thử lại sau' }, 429);
  let supplied: unknown;
  try { supplied = (await request.json()).password; } catch { return response({ error: 'Yêu cầu không hợp lệ' }, 400); }
  if (typeof supplied !== 'string' || supplied.length > 256) return response({ error: 'Mật khẩu không hợp lệ' }, 400);
  const a = createHash('sha256').update(supplied).digest();
  const b = createHash('sha256').update(expected).digest();
  if (!timingSafeEqual(a, b)) {
    const current = state && state.until > now ? state : { count: 0, until: now + 15 * 60_000 };
    attempts.set(ip, { count: current.count + 1, until: current.until });
    return response({ error: 'Mật khẩu không đúng' }, 401);
  }
  attempts.delete(ip);
  const token = createAdminSession();
  if (!token) return response({ error: 'Không thể tạo phiên quản trị' }, 503);
  const result = response({ authenticated: true });
  result.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions);
  return result;
}

export async function DELETE(request: NextRequest) {
  if (!hasSameOrigin(request)) return response({ error: 'Không hợp lệ' }, 403);
  const result = response({ authenticated: false });
  result.cookies.set(ADMIN_COOKIE_NAME, '', { ...adminCookieOptions, maxAge: 0 });
  return result;
}
