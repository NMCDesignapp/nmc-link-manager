import { NextRequest, NextResponse } from 'next/server'
import { db, links } from '@/lib/db'
import { eq, desc, asc } from 'drizzle-orm'

export async function GET() {
  try {
    const allLinks = await db
      .select()
      .from(links)
      .orderBy(desc(links.is_favorite), desc(links.click_count), desc(links.created_at))
    return NextResponse.json(allLinks)
  } catch (error) {
    console.error('Failed to fetch links:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      url,
      description,
      icon,
      category,
      color,
      link_type,
      file_url,
      file_name,
      file_type,
      thumbnail,
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (link_type === 'web' && !url) {
      return NextResponse.json({ error: 'URL is required for web links' }, { status: 400 })
    }

    if (link_type !== 'web' && !file_url) {
      return NextResponse.json({ error: 'File is required for file links' }, { status: 400 })
    }

    const [result] = await db
      .insert(links)
      .values({
        title,
        url: url || null,
        description: description || null,
        icon: icon || 'globe',
        category: category || 'General',
        color: color || '#3b82f6',
        link_type: link_type || 'web',
        file_url: file_url || null,
        file_name: file_name || null,
        file_type: file_type || null,
        thumbnail: thumbnail || null,
      })
      .returning()

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create link:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
