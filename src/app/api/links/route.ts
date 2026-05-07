import { NextResponse } from 'next/server'
import { db, links } from '@/lib/db'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const allLinks = await db.select().from(links).orderBy(desc(links.created_at))
    return NextResponse.json(allLinks)
  } catch (error) {
    console.error('[v0] Error fetching links:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const newLink = await db.insert(links).values({
      title: body.title,
      url: body.url,
      description: body.description,
      icon: body.icon,
      category: body.category,
      color: body.color,
      is_favorite: body.is_favorite || false,
      link_type: body.link_type || 'link',
      file_url: body.file_url,
      file_name: body.file_name,
      file_type: body.file_type,
      thumbnail: body.thumbnail,
    }).returning()
    
    return NextResponse.json(newLink[0])
  } catch (error) {
    console.error('[v0] Error creating link:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
