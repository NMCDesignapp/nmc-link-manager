import { db, withRetry } from '@/lib/db';

export type SyncSource = 'data-hub' | 'google';

export async function getSyncSource(): Promise<SyncSource> {
  const settings = await withRetry(() => db.setting.findMany({
    where: { key: { in: ['nmc-sync-source', 'nmc-sync-enabled'] } },
    select: { key: true, value: true },
  }));
  const values = new Map(settings.map(item => [item.key, item.value || '']));
  const explicit = values.get('nmc-sync-source');
  if (explicit === 'google' || explicit === 'data-hub') return explicit;
  return values.get('nmc-sync-enabled') === 'true' ? 'google' : 'data-hub';
}
