import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.link.update({
      where: { id: parseInt(id) },
      data: {
        click_count: { increment: 1 },
        updated_at: new Date(),
      },
    })

    if (!result) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to increment click count:', error)
    return NextResponse.json({ error: 'Failed to increment click count' }, { status: 500 })
  }
}
