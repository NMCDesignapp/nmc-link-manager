import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { getSyncSource, setSyncSource, type SyncSource } from '@/lib/sync-source';

const STATUS_KEYS = [
  'nmc-data-hub-last-seen-at',
  'nmc-data-hub-last-sync-at',
  'nmc-data-hub-last-result',
  'nmc-sync-source-updated-at',
  'nmc-sync-source-reason',
];

async function readStatus() {
  const source = await getSyncSource();
  const rows = await withRetry(() => db.setting.findMany({
    where: { key: { in: STATUS_KEYS } },
    select: { key: true, value: true },
  }));
  const values = Object.fromEntries(rows.map(item => [item.key, item.value || '']));
  const lastSeenAt = values['nmc-data-hub-last-seen-at'] || '';
  const seenMs = lastSeenAt ? Date.parse(lastSeenAt) : Number.NaN;
  const dataHubOnline = source === 'data-hub' && Number.isFinite(seenMs) && Date.now() - seenMs < 90_000;
  return {
    source,
    googleEnabled: source === 'google',
    dataHubEnabled: source === 'data-hub',
    dataHubOnline,
    lastSeenAt,
    lastSyncAt: values['nmc-data-hub-last-sync-at'] || '',
    lastResult: values['nmc-data-hub-last-result'] || '',
    sourceUpdatedAt: values['nmc-sync-source-updated-at'] || '',
    sourceReason: values['nmc-sync-source-reason'] || '',
  };
}

export async function GET() {
  try {
    return NextResponse.json(await readStatus(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('GET /api/sync-source error:', error);
    return NextResponse.json({ error: 'Không đọc được trạng thái đồng bộ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = body?.source as SyncSource;
    if (source !== 'data-hub' && source !== 'google') {
      return NextResponse.json({ error: 'source phải là data-hub hoặc google' }, { status: 400 });
    }
    await setSyncSource(source, body?.reason === 'data-hub-agent' ? 'data-hub-agent' : 'main-app-toggle');
    return NextResponse.json(await readStatus());
  } catch (error) {
    console.error('POST /api/sync-source error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không đổi được nguồn đồng bộ' }, { status: 500 });
  }
}
