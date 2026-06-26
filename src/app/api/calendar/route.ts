import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // format: YYYY-MM
    const date = searchParams.get('date')   // format: YYYY-MM-DD

    let where: any = {}
    if (date) {
      where.date = date
    } else if (month) {
      where.date = { startsWith: month }
    }

    const events = await db.calendarEvent.findMany({
      where,
      orderBy: { date: 'asc' },
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { title, date, color, owner } = data

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        date,
        color: color || '#00ff88',
        owner: owner || '',
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const { id, title, date, color, owner } = data

    if (!id || !title || !date) {
      return NextResponse.json({ error: 'ID, title and date are required' }, { status: 400 })
    }

    const event = await db.calendarEvent.update({
      where: { id: parseInt(id) },
      data: {
        title,
        date,
        color: color || '#00ff88',
        owner: owner || '',
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    await db.calendarEvent.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
