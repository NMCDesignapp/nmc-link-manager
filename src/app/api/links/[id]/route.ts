import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const link = await db.link.findUnique({ where: { id: parseInt(id) } })

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
    const {
      title,
      url,
      description,
      icon,
      category,
      color,
      is_favorite,
      link_type,
      file_url,
      file_name,
      file_type,
      thumbnail,
    } = body

    const result = await db.link.update({
      where: { id: parseInt(id) },
      data: {
        ...(title !== undefined && { title }),
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(category !== undefined && { category }),
        ...(color !== undefined && { color }),
        ...(is_favorite !== undefined && { is_favorite }),
        ...(link_type !== undefined && { link_type }),
        ...(file_url !== undefined && { file_url }),
        ...(file_name !== undefined && { file_name }),
        ...(file_type !== undefined && { file_type }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
    })

    if (!result) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update link:', error)
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await db.link.delete({ where: { id: parseInt(id) } })

    if (!result) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Link deleted successfully' })
  } catch (error) {
    console.error('Failed to delete link:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
