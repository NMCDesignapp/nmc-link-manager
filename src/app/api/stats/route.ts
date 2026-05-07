import { NextResponse } from 'next/server'
import { db, links } from '@/lib/db'
import { eq, desc, count, sum } from 'drizzle-orm'

export async function GET() {
  try {
    const [{ totalLinks }] = await db.select({ totalLinks: count() }).from(links)

    const [{ totalClicks }] = await db
      .select({ totalClicks: sum(links.click_count) })
      .from(links)

    const [{ favorites }] = await db
      .select({ favorites: count() })
      .from(links)
      .where(eq(links.is_favorite, true))

    const categoryCounts = await db
      .select({ category: links.category, count: count() })
      .from(links)
      .groupBy(links.category)
      .orderBy(desc(count()))

    const topLinks = await db
      .select({
        id: links.id,
        title: links.title,
        url: links.url,
        click_count: links.click_count,
      })
      .from(links)
      .orderBy(desc(links.click_count))
      .limit(5)

    return NextResponse.json({
      total_links: totalLinks,
      total_clicks: Number(totalClicks) || 0,
      favorites,
      categories: categoryCounts.map(c => ({
        category: c.category,
        count: c.count,
      })),
      top_links: topLinks,
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
