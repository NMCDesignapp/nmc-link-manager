import { db, withRetry } from '@/lib/db';

export type SyncSource = 'data-hub' | 'google';

const SOURCE_KEY = 'nmc-sync-source';
const LEGACY_GOOGLE_KEY = 'nmc-sync-enabled';
const SOURCE_CACHE_MS = 15_000;

let sourceCache: { value: SyncSource; expiresAt: number } | null = null;

function resolveSource(settings: Array<{ key: string; value: string | null }>): SyncSource {
  const values = new Map(settings.map(item => [item.key, item.value || '']));
  const explicit = values.get(SOURCE_KEY);
  if (explicit === 'google' || explicit === 'data-hub') return explicit;
  return values.get(LEGACY_GOOGLE_KEY) === 'true' ? 'google' : 'data-hub';
}

export async function getSyncSource(): Promise<SyncSource> {
  const now = Date.now();
  if (sourceCache && sourceCache.expiresAt > now) return sourceCache.value;

  const settings = await withRetry(() => db.setting.findMany({
    where: { key: { in: [SOURCE_KEY, LEGACY_GOOGLE_KEY] } },
    select: { key: true, value: true },
  }));
  const source = resolveSource(settings);
  sourceCache = { value: source, expiresAt: now + SOURCE_CACHE_MS };
  return source;
}

export async function setSyncSource(source: SyncSource, reason = 'manual') {
  const now = new Date();
  const dataHub = source === 'data-hub';
  const values: Record<string, string> = {
    [SOURCE_KEY]: source,
    [LEGACY_GOOGLE_KEY]: String(source === 'google'),
    'nmc-data-hub-enabled': String(dataHub),
    'nmc-data-hub-saoviet-enabled': String(dataHub),
    'nmc-data-hub-revenue-enabled': String(dataHub),
    'nmc-data-hub-structure-enabled': String(dataHub),
    'nmc-sync-source-updated-at': now.toISOString(),
    'nmc-sync-source-reason': reason,
  };

  await withRetry(() => db.$transaction(
    Object.entries(values).map(([key, value]) => db.setting.upsert({
      where: { key },
      update: { value, updated_at: now },
      create: { key, value, updated_at: now },
    }))
  ));

  sourceCache = { value: source, expiresAt: Date.now() + SOURCE_CACHE_MS };
  return { source, dataHubEnabled: dataHub, googleEnabled: !dataHub, updatedAt: now.toISOString() };
}

export async function isSyncSource(expected: SyncSource): Promise<boolean> {
  return (await getSyncSource()) === expected;
}
