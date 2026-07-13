import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const link = await db.link.findUnique({
      where: { id: parseInt(id) },
    })
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    return NextResponse.json(link)
  } catch (error) {
    console.error('Failed to fetch link:', error)
    return NextResponse.json({ error: 'Failed to fetch link' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.link.findUnique({
      where: { id: parseInt(id) },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const updated = await db.link.update({
      where: { id: parseInt(id) },
      data: body,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update link:', error)
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
  }
}

export async function DELETE(
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

    await db.link.delete({
      where: { id: linkId },
    })
    return NextResponse.json({ message: 'Link deleted successfully' })
  } catch (error) {
    console.error('Failed to delete link:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
