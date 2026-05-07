import { NextResponse } from 'next/server'
import { db, settings } from '@/lib/db'
import { eq, asc } from 'drizzle-orm'

export async function GET() {
  try {
    const allSettings = await db.select().from(settings).orderBy(asc(settings.key))

    const settingsObject = allSettings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value || ''
      return acc
    }, {})

    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({}, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()

    for (const [key, value] of Object.entries(data)) {
      await db
        .insert(settings)
        .values({ key, value: String(value) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: String(value), updated_at: new Date() },
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
