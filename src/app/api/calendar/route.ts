import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// CalendarEvent schema is managed by database migrations, not runtime requests.
// Runtime writes only perform CRUD. This avoids permission errors from ALTER TABLE
// when Vercel connects through the Supabase pooler role.

function parseEventId(value: unknown): number | null {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM
    const date = searchParams.get('date')   // YYYY-MM-DD

    const where: any = {}
    if (date) {
      where.date = date
    } else if (month) {
      where.date = { startsWith: month }
    }

    const events = await db.calendarEvent.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(events, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    try {
      const { searchParams } = new URL(request.url)
      const month = searchParams.get('month')
      const date = searchParams.get('date')
      let rows: any[] = []

      if (date) {
        rows = await db.$queryRawUnsafe(
          `SELECT id, title, date, color, COALESCE(owner, '') AS owner, created_at, updated_at FROM "CalendarEvent" WHERE date = $1 ORDER BY date ASC`,
          date,
        )
      } else if (month) {
        rows = await db.$queryRawUnsafe(
          `SELECT id, title, date, color, COALESCE(owner, '') AS owner, created_at, updated_at FROM "CalendarEvent" WHERE date LIKE $1 ORDER BY date ASC`,
          `${month}%`,
        )
      } else {
        rows = await db.$queryRawUnsafe(
          `SELECT id, title, date, color, COALESCE(owner, '') AS owner, created_at, updated_at FROM "CalendarEvent" ORDER BY date ASC`,
        )
      }

      return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } })
    } catch (fallbackError) {
      console.error('Calendar GET raw fallback failed:', fallbackError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const title = String(data?.title || '').trim()
    const date = String(data?.date || '').trim()
    const color = String(data?.color || '#00ff88')
    const owner = String(data?.owner || '')

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
    }

    try {
      const event = await db.calendarEvent.create({
        data: { title, date, color, owner },
      })
      return NextResponse.json(event, { status: 201 })
    } catch (prismaErr: any) {
      console.warn('[calendar] Prisma create failed, falling back to raw SQL:', prismaErr?.message || prismaErr)
      const rows: any[] = await db.$queryRawUnsafe(
        `INSERT INTO "CalendarEvent" (title, date, color, owner, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, title, date, color, owner, created_at, updated_at`,
        title,
        date,
        color,
        owner,
      )
      return NextResponse.json(rows[0] || { success: true }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', detail: String((error as any)?.message || error) },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const id = parseEventId(data?.id)
    const title = String(data?.title || '').trim()
    const date = String(data?.date || '').trim()
    const color = String(data?.color || '#00ff88')
    const owner = String(data?.owner || '')

    if (!id || !title || !date) {
      return NextResponse.json({ error: 'ID, title and date are required' }, { status: 400 })
    }

    try {
      const event = await db.calendarEvent.update({
        where: { id },
        data: { title, date, color, owner },
      })
      return NextResponse.json(event)
    } catch (prismaErr: any) {
      console.warn('[calendar] Prisma update failed, falling back to raw SQL:', prismaErr?.message || prismaErr)
      const rows: any[] = await db.$queryRawUnsafe(
        `UPDATE "CalendarEvent"
         SET title = $1, date = $2, color = $3, owner = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, title, date, color, owner, created_at, updated_at`,
        title,
        date,
        color,
        owner,
        id,
      )
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      return NextResponse.json(rows[0])
    }
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to update event', detail: String((error as any)?.message || error) },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = parseEventId(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    try {
      await db.calendarEvent.delete({ where: { id } })
    } catch (prismaErr: any) {
      console.warn('[calendar] Prisma delete failed, falling back to raw SQL:', prismaErr?.message || prismaErr)
      await db.$executeRawUnsafe(`DELETE FROM "CalendarEvent" WHERE id = $1`, id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event', detail: String((error as any)?.message || error) },
      { status: 500 },
    )
  }
}
