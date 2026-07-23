import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------- GET /api/poster-image?prefix=kpi-banca-img- ----------
// Returns only image keys and version timestamps. This lets KPI render each real
// image once, instead of probing/downloading every binary before showing it.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const prefix = searchParams.get('prefix') || ''
    if (prefix && !['saoviet-poster-', 'clbsv-poster-', 'kpi-banca-img-'].includes(prefix)) {
      return NextResponse.json({ error: 'unsupported prefix' }, { status: 400 })
    }
    const rows: Array<{ key: string; updatedAt: Date }> = await db.$queryRawUnsafe<Array<{ key: string; updatedAt: Date }>>(
      `SELECT "key", "updatedAt" FROM "PosterImage" WHERE ($1 = '' OR "key" LIKE $1) ORDER BY "key" ASC`,
      prefix ? `${prefix}%` : ''
    )
    return NextResponse.json({
      items: rows.map(row => ({ key: row.key, updatedAt: new Date(row.updatedAt).getTime() })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    // An empty board is valid before the first upload; do not expose a DB error to viewers.
    console.error('GET /api/poster-image manifest error:', error?.message || error)
    return NextResponse.json({ items: [] }, { status: 200 })
  }
}

// ---------- POST /api/poster-image ----------
// Body: { key: string, dataBase64: string, contentType?: string }
// Action: upsert (insert or update) poster binary in PosterImage table.
// Returns: { key, url } — url is "/api/poster-image/{key}" to be stored in Setting.
//
// This keeps binary OUT of the Setting table (which is fetched in full by /api/settings).
// Setting now stores only the short URL string, not the base64 data.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key, dataBase64, contentType } = body || {}

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }
    if (!dataBase64 || typeof dataBase64 !== 'string') {
      return NextResponse.json({ error: 'dataBase64 is required' }, { status: 400 })
    }

    // Validate key format — only allow known prefix patterns
    const allowedPrefixes = ['saoviet-poster-', 'clbsv-poster-', 'kpi-banca-img-']
    if (!allowedPrefixes.some(p => key.startsWith(p))) {
      return NextResponse.json({ error: `key must start with one of: ${allowedPrefixes.join(', ')}` }, { status: 400 })
    }

    // Parse base64 (strip data URL prefix if present)
    let raw = dataBase64
    let detectedContentType = contentType || 'image/jpeg'
    const m = dataBase64.match(/^data:([^;]+);base64,(.+)$/)
    if (m) {
      detectedContentType = m[1]
      raw = m[2]
    }

    // Convert base64 → Buffer
    let buffer: Buffer
    try {
      buffer = Buffer.from(raw, 'base64')
    } catch (e) {
      return NextResponse.json({ error: 'Invalid base64 data' }, { status: 400 })
    }

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty image data' }, { status: 400 })
    }

    // Soft limit: 10 MB after base64 decode (allows ~7 MB original PNG → ~10 MB base64)
    if (buffer.length > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10 MB)' }, { status: 413 })
    }

    // Idempotent: ensure table exists (in case migration not applied on Vercel build)
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PosterImage" (
          "key" TEXT NOT NULL PRIMARY KEY,
          "data" BYTEA NOT NULL,
          "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
    } catch (tableErr: any) {
      console.error('[poster-image] CREATE TABLE failed (may already exist):', tableErr?.message || tableErr)
      // Continue — table may already exist
    }

    // Upsert via raw SQL (resilient to Prisma client being out of sync)
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "PosterImage" ("key", "data", "contentType", "updatedAt")
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT ("key")
         DO UPDATE SET "data" = EXCLUDED."data", "contentType" = EXCLUDED."contentType", "updatedAt" = NOW()`,
        key,
        buffer,
        detectedContentType
      )
    } catch (upsertErr: any) {
      console.error('[poster-image] upsert failed:', upsertErr?.message || upsertErr)
      return NextResponse.json({ error: 'Failed to save poster: ' + String(upsertErr?.message || upsertErr) }, { status: 500 })
    }

    const url = `/api/poster-image/${encodeURIComponent(key)}`
    return NextResponse.json({ key, url, sizeBytes: buffer.length }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/poster-image error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}

// ---------- DELETE /api/poster-image?key=... ----------
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    try {
      await db.$executeRawUnsafe(`DELETE FROM "PosterImage" WHERE "key" = $1`, key)
    } catch (delErr: any) {
      console.error('[poster-image] delete failed:', delErr?.message || delErr)
      // Non-fatal — table may not exist yet
    }

    return NextResponse.json({ success: true, key })
  } catch (error: any) {
    console.error('DELETE /api/poster-image error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
