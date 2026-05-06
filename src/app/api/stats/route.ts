import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const totalLinks = await db.link.count()
    const totalClicksResult = await db.link.aggregate({ _sum: { click_count: true } })
    const totalClicks = totalClicksResult._sum.click_count || 0
    const favorites = await db.link.count({ where: { is_favorite: true } })

    const categoryCounts = await db.link.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    })

    const topLinks = await db.link.findMany({
      orderBy: { click_count: 'desc' },
      take: 5,
      select: { id: true, title: true, url: true, click_count: true },
    })

    return NextResponse.json({
      total_links: totalLinks,
      total_clicks: totalClicks,
      favorites,
      categories: categoryCounts.map(c => ({
        category: c.category,
        count: c._count.category,
      })),
      top_links: topLinks,
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
