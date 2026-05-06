import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'json'
    const category = searchParams.get('category')

    let links
    if (category && category !== 'all') {
      links = await db.link.findMany({
        where: { category },
        orderBy: [
          { is_favorite: 'desc' },
          { click_count: 'desc' },
          { created_at: 'desc' },
        ],
      })
    } else {
      links = await db.link.findMany({
        orderBy: [
          { is_favorite: 'desc' },
          { click_count: 'desc' },
          { created_at: 'desc' },
        ],
      })
    }

    if (format === 'csv') {
      const headers = ['id', 'title', 'url', 'description', 'category', 'color', 'is_favorite', 'click_count', 'created_at']
      const csvContent = [
        headers.join(','),
        ...links.map((link: Record<string, unknown>) =>
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
      total_links: links.length,
      links,
    })
  } catch (error) {
    console.error('Failed to export links:', error)
    return NextResponse.json({ error: 'Failed to export links' }, { status: 500 })
  }
}
