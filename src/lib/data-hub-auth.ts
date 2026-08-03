import { NextRequest } from 'next/server';

const DATA_HUB_SOURCE = 'nmc-data-hub';
const GOOGLE_SYNC_SOURCE = 'google-sync';

export function isDataHubImport(body: unknown): boolean {
  return !!body && typeof body === 'object' && (body as { source?: unknown }).source === DATA_HUB_SOURCE;
}

export function isGoogleSyncImport(body: unknown): boolean {
  return !!body && typeof body === 'object' && (body as { source?: unknown }).source === GOOGLE_SYNC_SOURCE;
}

export function isAuthorizedDataHubRequest(request: NextRequest): boolean {
  const expected = process.env.NMC_DATA_HUB_IMPORT_TOKEN;
  if (!expected) return false;
  return request.headers.get('x-nmc-data-hub-token') === expected;
}
