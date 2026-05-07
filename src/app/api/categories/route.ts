import { NextRequest, NextResponse } from 'next/server'
import { db, categories } from '@/lib/db'
import { asc } from 'drizzle-orm'

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sort_order))
    return NextResponse.json(allCategories)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, icon, color, sort_order } = body

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const [result] = await db
      .insert(categories)
      .values({
        name,
        icon: icon || null,
        color: color || '#3b82f6',
        sort_order: sort_order || 0,
      })
      .returning()

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
