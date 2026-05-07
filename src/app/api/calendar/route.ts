import { NextResponse } from 'next/server'
import { db, calendarEvents } from '@/lib/db'
import { eq, asc, like } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: YYYY-MM
    const date = searchParams.get('date')   // format: YYYY-MM-DD

    let query = db.select().from(calendarEvents).$dynamic()

    if (date) {
      query = query.where(eq(calendarEvents.date, date))
    } else if (month) {
      query = query.where(like(calendarEvents.date, `${month}%`))
    }

    const events = await query.orderBy(asc(calendarEvents.date))

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { title, date, color } = data

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
    }

    const [event] = await db
      .insert(calendarEvents)
      .values({
        title,
        date,
        color: color || '#00ff88',
      })
      .returning()

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    await db.delete(calendarEvents).where(eq(calendarEvents.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
