import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { isAuthorizedDataHubRequest } from '@/lib/data-hub-auth';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Không được phép thay đổi nguồn Data Hub' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled === true;
    const source = body?.source === 'revenue' ? 'revenue' : body?.source === 'saoviet' ? 'saoviet' : null;
    if (!source) return NextResponse.json({ error: 'source phải là saoviet hoặc revenue' }, { status: 400 });
    await withRetry(() => db.$transaction([
      db.setting.upsert({
        where: { key: `nmc-data-hub-${source}-enabled` },
        update: { value: String(enabled), updated_at: new Date() },
        create: { key: `nmc-data-hub-${source}-enabled`, value: String(enabled) },
      }),
      db.setting.upsert({
        where: { key: 'nmc-data-hub-activated-at' },
        update: { value: new Date().toISOString(), updated_at: new Date() },
        create: { key: 'nmc-data-hub-activated-at', value: new Date().toISOString() },
      }),
    ]));
    return NextResponse.json({ enabled, source, activatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('POST /api/data-hub/activate error:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
