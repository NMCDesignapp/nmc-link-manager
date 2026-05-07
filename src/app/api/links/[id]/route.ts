import { NextRequest, NextResponse } from 'next/server'
import { db, links } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { getStore } from '@netlify/blobs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [link] = await db.select().from(links).where(eq(links.id, parseInt(id)))

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

    const updateData: Record<string, unknown> = { updated_at: new Date() }
    if (title !== undefined) updateData.title = title
    if (url !== undefined) updateData.url = url
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (category !== undefined) updateData.category = category
    if (color !== undefined) updateData.color = color
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite
    if (link_type !== undefined) updateData.link_type = link_type
    if (file_url !== undefined) updateData.file_url = file_url
    if (file_name !== undefined) updateData.file_name = file_name
    if (file_type !== undefined) updateData.file_type = file_type
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail

    const [result] = await db
      .update(links)
      .set(updateData)
      .where(eq(links.id, parseInt(id)))
      .returning()

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [link] = await db.select().from(links).where(eq(links.id, parseInt(id)))

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Clean up blob file if this link has an uploaded file
    if (link.file_url) {
      const match = link.file_url.match(/\/api\/files\/(.+)$/)
      if (match) {
        try {
          const store = getStore('uploads')
          await store.delete(match[1])
        } catch {
          console.error('Failed to delete blob for link', id)
        }
      }
    }

    await db.delete(links).where(eq(links.id, parseInt(id)))

    return NextResponse.json({ message: 'Link deleted successfully' })
  } catch (error) {
    console.error('Failed to delete link:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
