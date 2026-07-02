import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------- POST /api/admin/migrate-posters ----------
// One-time migration: convert base64 posters in Setting → PosterImage BYTEA + URL in Setting.
// Run this once after deploying the new /api/poster-image endpoints.
//
// This server-side migration avoids Vercel's 4.5 MB HTTP payload limit (the
// client-side migration script in scripts/migrate-posters-to-bytea.js fails
// for posters > ~4 MB because the JSON body exceeds the limit).
//
// After migration, /api/settings response size drops from ~16 MB to ~50 KB.
//
// Idempotent: safe to call multiple times. Already-migrated entries are skipped
// (detected by value starting with '/api/poster-image/').

export async function POST(_req: NextRequest) {
  const summary: Array<{
    key: string
    status: 'migrated' | 'skipped' | 'failed'
    detail?: string
    sizeBytes?: number
  }> = []

  try {
    // 1. Ensure PosterImage table exists
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
      console.error('[migrate-posters] CREATE TABLE failed (may already exist):', tableErr?.message || tableErr)
    }

    // 2. Fetch all settings with poster keys
    const settings = await db.setting.findMany({
      where: {
        OR: [
          { key: { startsWith: 'saoviet-poster-' } },
          { key: { startsWith: 'clbsv-poster-' } },
        ],
      },
    })

    console.log(`[migrate-posters] Found ${settings.length} poster entries`)

    // 3. Process each
    for (const s of settings) {
      const value = s.value || ''
      if (!value) {
        summary.push({ key: s.key, status: 'skipped', detail: 'empty value' })
        continue
      }
      if (value.startsWith('/api/poster-image/')) {
        summary.push({ key: s.key, status: 'skipped', detail: 'already migrated' })
        continue
      }
      if (!value.startsWith('data:image/')) {
        summary.push({ key: s.key, status: 'skipped', detail: 'unknown format' })
        continue
      }

      // Parse data URL: data:image/png;base64,<...>
      const m = value.match(/^data:([^;]+);base64,(.+)$/)
      if (!m) {
        summary.push({ key: s.key, status: 'failed', detail: 'invalid data URL' })
        continue
      }
      const contentType = m[1]
      const base64Data = m[2]

      let buffer: Buffer
      try {
        buffer = Buffer.from(base64Data, 'base64')
      } catch (e: any) {
        summary.push({ key: s.key, status: 'failed', detail: `base64 decode: ${e?.message || e}` })
        continue
      }

      if (buffer.length === 0) {
        summary.push({ key: s.key, status: 'failed', detail: 'empty buffer' })
        continue
      }

      // Upsert into PosterImage
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO "PosterImage" ("key", "data", "contentType", "updatedAt")
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT ("key")
           DO UPDATE SET "data" = EXCLUDED."data", "contentType" = EXCLUDED."contentType", "updatedAt" = NOW()`,
          s.key,
          buffer,
          contentType
        )
      } catch (upsertErr: any) {
        summary.push({ key: s.key, status: 'failed', detail: `upsert: ${upsertErr?.message || upsertErr}` })
        continue
      }

      // Update Setting: replace base64 with URL
      const url = `/api/poster-image/${encodeURIComponent(s.key)}`
      try {
        await db.setting.update({
          where: { key: s.key },
          data: { value: url, updated_at: new Date() },
        })
      } catch (updErr: any) {
        // Fallback: raw SQL
        try {
          await db.$executeRawUnsafe(
            `UPDATE "Setting" SET value = $1, updated_at = NOW() WHERE key = $2`,
            url, s.key
          )
        } catch (rawErr: any) {
          summary.push({ key: s.key, status: 'failed', detail: `Setting update: ${updErr?.message || updErr} / raw: ${rawErr?.message || rawErr}` })
          continue
        }
      }

      summary.push({ key: s.key, status: 'migrated', sizeBytes: buffer.length })
      console.log(`[migrate-posters] ✓ ${s.key}: migrated ${buffer.length} bytes`)
    }

    // 4. Summary
    const migrated = summary.filter(s => s.status === 'migrated').length
    const skipped = summary.filter(s => s.status === 'skipped').length
    const failed = summary.filter(s => s.status === 'failed').length

    return NextResponse.json({
      total: summary.length,
      migrated,
      skipped,
      failed,
      details: summary,
    }, { status: 200 })
  } catch (error: any) {
    console.error('[migrate-posters] fatal:', error)
    return NextResponse.json({
      error: 'Migration failed: ' + String(error?.message || error),
      partial: summary,
    }, { status: 500 })
  }
}
