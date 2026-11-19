import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const ADMIN_COOKIE_NAME = 'nmc_contest_admin';
const SESSION_LIFETIME = 8 * 60 * 60;

function signature(message: string): Buffer | null {
  const secret = process.env.NMC_ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return createHmac('sha256', secret).update(message).digest();
}

export function createAdminSession(): string | null {
  const expires = Math.floor(Date.now() / 1000) + SESSION_LIFETIME;
  const payload = `v1.${expires}`;
  const sig = signature(payload);
  return sig ? `${payload}.${sig.toString('base64url')}` : null;
}

export function verifyAdminSession(token?: string, now = Date.now()): boolean {
  const match = /^v1\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token || '');
  if (!match) return false;
  const expires = Number(match[1]);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(now / 1000)) return false;
  const expected = signature(`v1.${match[1]}`);
  if (!expected) return false;
  const received = Buffer.from(match[2], 'base64url');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function isAdminRequest(request: NextRequest): boolean {
  return verifyAdminSession(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

// Collect every host the proxy chain may report so a legitimate browser Origin
// still matches behind Render/Cloudflare/other reverse proxies. The Origin value
// itself always comes from the caller's browser, so CSRF protection is kept.
function sameOriginCandidateHosts(request: NextRequest): Set<string> {
  const candidates = new Set<string>();
  const addHost = (value: string | null | undefined) => {
    if (!value) return;
    const trimmed = value.trim().replace(/,.*$/, '');
    if (!trimmed) return;
    candidates.add(trimmed);
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try { candidates.add(new URL(withScheme).host); } catch {}
    const noPort = trimmed.replace(/:\d+$/, '');
    if (noPort) candidates.add(noPort);
  };
  addHost(request.nextUrl.host);
  addHost(request.headers.get('x-forwarded-host'));
  addHost(request.headers.get('host'));
  return candidates;
}

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  let originHost = '';
  try { originHost = new URL(origin).host; } catch { return false; }
  if (!originHost) return false;
  const candidates = sameOriginCandidateHosts(request);
  if (!candidates.has(originHost)) {
    console.warn('[admin-session] same-origin mismatch', JSON.stringify({
      originHost,
      nextUrlHost: request.nextUrl.host,
      xfh: request.headers.get('x-forwarded-host'),
      host: request.headers.get('host'),
    }));
  }
  return candidates.has(originHost);
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_LIFETIME,
};
