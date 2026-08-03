import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { isAuthorizedDataHubRequest } from '@/lib/data-hub-auth';
import { getSyncSource, setSyncSource } from '@/lib/sync-source';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Không được phép thay đổi nguồn Data Hub' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const enabled = body?.enabled === true;
    const source = ['all', 'saoviet', 'revenue', 'structure'].includes(body?.source) ? body.source : 'all';
    const now = new Date();

    if (enabled) {
      const result = await setSyncSource('data-hub', 'data-hub-agent');
      return NextResponse.json({ ...result, enabled: true, scope: source });
    }

    const key = source === 'all' ? 'nmc-data-hub-enabled' : `nmc-data-hub-${source}-enabled`;
    await withRetry(() => db.setting.upsert({
      where: { key },
      update: { value: 'false', updated_at: now },
      create: { key, value: 'false', updated_at: now },
    }));

    return NextResponse.json({ enabled: false, source: await getSyncSource(), scope: source, updatedAt: now.toISOString() });
  } catch (error: any) {
    console.error('POST /api/data-hub/activate error:', error);
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
