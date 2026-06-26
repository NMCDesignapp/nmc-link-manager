import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// CalendarEvent table schema:
//   id SERIAL PK, title TEXT, date TEXT, color TEXT, owner TEXT (added 2026-06-26),
//   created_at TIMESTAMP, updated_at TIMESTAMP
//
// The 'owner' column was added by migration 20260626030000. If that migration
// hasn't been applied on the production DB (e.g., Vercel build skipped
// `prisma migrate deploy` due to missing DIRECT_URL at build time), we
// auto-add the column at runtime via ALTER TABLE ... ADD COLUMN IF NOT EXISTS
// (Postgres idempotent DDL) on the first write request.

let migrationEnsured = false

async function ensureOwnerColumn() {
  if (migrationEnsured) return
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "owner" TEXT NOT NULL DEFAULT ''`
    )
    migrationEnsured = true
  } catch (e) {
    // Table might not exist yet, or another issue. Log and continue — the
    // actual save attempt below will surface a more useful error.
    console.error('[calendar] ensureOwnerColumn failed:', e)
  }
}

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
    // Fallback: try raw SQL (in case Prisma schema/client is out of sync)
    try {
      const { searchParams } = new URL(request.url)
      const month = searchParams.get('month')
      const date = searchParams.get('date')
      let rows: any[] = []
      if (date) {
        rows = await db.$queryRawUnsafe(
          `SELECT id, title, date, color, COALESCE(owner, '') AS owner, created_at, updated_at FROM "CalendarEvent" WHERE date = $1 ORDER BY date ASC`,
          date
        )
      } else if (month) {
        rows = await db.$queryRawUnsafe(
          `SELECT id, title, date, color, COALESCE(owner, '') AS owner, created_at, updated_at FROM "CalendarEvent" WHERE date LIKE $1 ORDER BY date ASC`,
          `${month}%`
        )
      } else {
        rows = await db.$queryRawUnsafe(
          `SELECT id, title, date, color, COALESCE(owner, '') AS owner, created_at, updated_at FROM "CalendarEvent" ORDER BY date ASC`
        )
      }
      return NextResponse.json(rows)
    } catch (fallbackError) {
      console.error('Calendar GET raw fallback failed:', fallbackError)
      return NextResponse.json([], { status: 500 })
    }
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { title, date, color, owner } = data

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
    }

    // Ensure the 'owner' column exists (idempotent)
    await ensureOwnerColumn()

    // Try Prisma first
    try {
      const event = await db.calendarEvent.create({
        data: {
          title,
          date,
          color: color || '#00ff88',
          owner: owner || '',
        },
      })
      return NextResponse.json(event, { status: 201 })
    } catch (prismaErr: any) {
      console.warn('[calendar] Prisma create failed, falling back to raw SQL:', prismaErr?.message || prismaErr)
      // Fallback: raw SQL INSERT
      const rows: any[] = await db.$queryRawUnsafe(
        `INSERT INTO "CalendarEvent" (title, date, color, owner) VALUES ($1, $2, $3, $4)
         RETURNING id, title, date, color, owner, created_at, updated_at`,
        title,
        date,
        color || '#00ff88',
        owner || ''
      )
      return NextResponse.json(rows[0] || { success: true }, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', detail: String((error as any)?.message || error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const { id, title, date, color, owner } = data

    if (!id || !title || !date) {
      return NextResponse.json({ error: 'ID, title and date are required' }, { status: 400 })
    }

    await ensureOwnerColumn()

    try {
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
    } catch (prismaErr: any) {
      console.warn('[calendar] Prisma update failed, falling back to raw SQL:', prismaErr?.message || prismaErr)
      const rows: any[] = await db.$queryRawUnsafe(
        `UPDATE "CalendarEvent" SET title = $1, date = $2, color = $3, owner = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING id, title, date, color, owner, created_at, updated_at`,
        title,
        date,
        color || '#00ff88',
        owner || '',
        parseInt(id)
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
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    try {
      await db.calendarEvent.delete({ where: { id: parseInt(id) } })
    } catch (prismaErr: any) {
      console.warn('[calendar] Prisma delete failed, falling back to raw SQL:', prismaErr?.message || prismaErr)
      await db.$executeRawUnsafe(`DELETE FROM "CalendarEvent" WHERE id = $1`, parseInt(id))
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event', detail: String((error as any)?.message || error) },
      { status: 500 }
    )
  }
}
