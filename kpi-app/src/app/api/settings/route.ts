import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

// A restore can copy explicit Setting IDs but leave PostgreSQL's serial sequence
// behind. The next new setting then fails with a duplicate primary-key error.
// Keep this recovery local to Settings and retry the exact write once.
async function repairSettingIdSequence() {
  await db.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"Setting"', 'id'),
      GREATEST(COALESCE((SELECT MAX(id) FROM "Setting"), 1), 1),
      true
    )
  `)
}

export async function GET() {
  try {
    const settings = await withRetry(() => db.setting.findMany({ orderBy: { key: 'asc' } }))

    const settingsObject = settings.reduce((acc: Record<string, string>, setting: { key: string; value: string | null }) => {
      acc[setting.key] = setting.value || ''
      return acc
    }, {})

    return NextResponse.json(settingsObject, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const entries = Object.entries(data)

    if (entries.length === 0) {
      return NextResponse.json({ success: true })
    }

    // Batch upsert using $transaction for better performance.
    const saveEntries = () => db.$transaction(
      entries.map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          update: { value: String(value), updated_at: new Date() },
          create: { key, value: String(value) },
        })
      )
    )

    try {
      await withRetry(saveEntries)
    } catch (firstError) {
      // Self-heal the sequence once, then retry the same atomic write.
      await repairSettingIdSequence()
      await withRetry(saveEntries)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
