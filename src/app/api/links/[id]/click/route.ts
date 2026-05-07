import { NextRequest, NextResponse } from 'next/server'
import { db, links } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [result] = await db
      .update(links)
      .set({
        click_count: sql`${links.click_count} + 1`,
        updated_at: new Date(),
      })
      .where(eq(links.id, parseInt(id)))
      .returning()

    if (!result) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to increment click count:', error)
    return NextResponse.json({ error: 'Failed to increment click count' }, { status: 500 })
  }
}
