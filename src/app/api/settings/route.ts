import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.setting.findMany({ orderBy: { key: 'asc' } })

    const settingsObject = settings.reduce((acc: Record<string, string>, setting: { key: string; value: string | null }) => {
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
      await db.setting.upsert({
        where: { key },
        update: { value: String(value), updated_at: new Date() },
        create: { key, value: String(value) },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
