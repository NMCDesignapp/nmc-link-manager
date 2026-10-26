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

export function hasSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: SESSION_LIFETIME,
};
