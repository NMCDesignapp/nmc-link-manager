import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

const ACTIVE_TARGET_REGISTRATION_MONTH = '2026-09'

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

    settingsObject['kpi-target-registration-open'] = '1'
    settingsObject['kpi-target-registration-month'] = ACTIVE_TARGET_REGISTRATION_MONTH

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
      await repairSettingIdSequence()
      await withRetry(saveEntries)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
