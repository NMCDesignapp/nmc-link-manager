import { NextRequest, NextResponse } from 'next/server'
import { db, links } from '@/lib/db'
import { eq, desc, asc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const category = searchParams.get('category')

    let allLinks
    if (category && category !== 'all') {
      allLinks = await db
        .select()
        .from(links)
        .where(eq(links.category, category))
        .orderBy(desc(links.is_favorite), desc(links.click_count), desc(links.created_at))
    } else {
      allLinks = await db
        .select()
        .from(links)
        .orderBy(desc(links.is_favorite), desc(links.click_count), desc(links.created_at))
    }

    if (format === 'csv') {
      const headers = ['id', 'title', 'url', 'description', 'category', 'color', 'is_favorite', 'click_count', 'created_at']
      const csvContent = [
        headers.join(','),
        ...allLinks.map((link: Record<string, unknown>) =>
          headers.map(h => {
            const value = String(link[h as string] ?? '')
            if (value.includes(',')) {
              return `"${value}"`
            }
            return value
          }).join(',')
        ),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=links-export.csv',
        },
      })
    }

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      total_links: allLinks.length,
      links: allLinks,
    })
  } catch (error) {
    console.error('Failed to export links:', error)
    return NextResponse.json({ error: 'Failed to export links' }, { status: 500 })
  }
}
