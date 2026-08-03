import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { isAuthorizedDataHubRequest } from '@/lib/data-hub-auth';
import { getSyncSource } from '@/lib/sync-source';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorizedDataHubRequest(request)) {
      return NextResponse.json({ error: 'Không được phép cập nhật trạng thái Data Hub' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const phase = body?.phase === 'sync-complete' ? 'sync-complete' : 'heartbeat';
    const updates: Record<string, string> = {
      'nmc-data-hub-last-seen-at': now.toISOString(),
    };

    if (phase === 'sync-complete') {
      updates['nmc-data-hub-last-sync-at'] = now.toISOString();
      updates['nmc-data-hub-last-result'] = JSON.stringify(body?.results || []);
    }

    await withRetry(() => db.$transaction(
      Object.entries(updates).map(([key, value]) => db.setting.upsert({
        where: { key },
        update: { value, updated_at: now },
        create: { key, value, updated_at: now },
      }))
    ));

    const source = await getSyncSource();
    return NextResponse.json({
      source,
      enabled: source === 'data-hub',
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error('POST /api/data-hub/status error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được Data Hub' }, { status: 500 });
  }
}
