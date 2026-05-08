import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const linkId = parseInt(id)

    const existing = await db.link.findUnique({
      where: { id: linkId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const updated = await db.link.update({
      where: { id: linkId },
      data: { click_count: { increment: 1 } },
    })
    return NextResponse.json({ click_count: updated.click_count })
  } catch (error) {
    console.error('Failed to increment click count:', error)
    return NextResponse.json({ error: 'Failed to increment click count' }, { status: 500 })
  }
}
