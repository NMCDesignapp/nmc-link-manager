import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------- GET /api/poster-image/[key] ----------
// Serve poster binary with strong cache headers so browser/CDN caches it.
// After first load, subsequent loads are instant (served from cache).
//
// We use raw SQL because Prisma client may be out of sync with DB schema
// (in case the migration hasn't been applied on Vercel).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key: rawKey } = await params
    const key = decodeURIComponent(rawKey)

    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    // Query binary via raw SQL
    let rows: any[] = []
    try {
      rows = await db.$queryRawUnsafe(
        `SELECT "data", "contentType", "updatedAt" FROM "PosterImage" WHERE "key" = $1`,
        key
      )
    } catch (queryErr: any) {
      // Table may not exist yet
      console.error('[poster-image] GET query failed:', queryErr?.message || queryErr)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const row = rows[0]
    // A legacy/corrupt row can exist without binary data. Return 404 instead of
    // throwing in Buffer.from(null), which previously produced a noisy 500.
    if (row.data == null) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const data: Buffer = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data)
    const contentType: string = row.contentType || 'image/jpeg'

    // Build ETag from updatedAt + size for cache validation
    const updatedAt: Date = row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)
    const etag = `"${key}-${updatedAt.getTime()}-${data.length}"`

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': etag,
        'Last-Modified': updatedAt.toUTCString(),
      },
    })
  } catch (error: any) {
    console.error('GET /api/poster-image/[key] error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
