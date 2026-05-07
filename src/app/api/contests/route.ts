import { NextRequest, NextResponse } from 'next/server'
import { db, contests } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const allContests = await db.select().from(contests).orderBy(desc(contests.createdAt))
    return NextResponse.json(allContests)
  } catch (error) {
    console.error('Error fetching contests:', error)
    return NextResponse.json({ error: 'Không thể tải danh sách chương trình thi đua' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title, startDate, endDate, issueDate, conditionType, targetType,
      bonusTiers, posterUrl, participants,
      usePhase2, phase2StartDate, phase2EndDate, bonusTiers2,
      useSecondaryCondition, secondaryAFYPMin, secondaryIPMin,
      hideNotAchieved, useTVVmFilter, includeOwnNYD,
    } = body as {
      title: string
      startDate: string
      endDate: string
      issueDate?: string
      conditionType: string
      targetType: string
      bonusTiers: string
      posterUrl?: string
      participants?: string
      usePhase2?: boolean
      phase2StartDate?: string
      phase2EndDate?: string
      bonusTiers2?: string
      useSecondaryCondition?: boolean
      secondaryAFYPMin?: number
      secondaryIPMin?: number
      hideNotAchieved?: boolean
      useTVVmFilter?: boolean
      includeOwnNYD?: boolean
    }

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 })
    }

    const [existing] = await db
      .select()
      .from(contests)
      .where(eq(contests.title, title))
      .limit(1)

    const data = {
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      issueDate: issueDate ? new Date(issueDate) : null,
      conditionType,
      targetType: targetType || 'tvv',
      bonusTiers,
      posterUrl: posterUrl || '',
      participants: participants || '[]',
      usePhase2: usePhase2 ?? false,
      phase2StartDate: phase2StartDate ? new Date(phase2StartDate) : null,
      phase2EndDate: phase2EndDate ? new Date(phase2EndDate) : null,
      bonusTiers2: bonusTiers2 || '[]',
      useSecondaryCondition: useSecondaryCondition ?? false,
      secondaryAFYPMin: secondaryAFYPMin ?? 0,
      secondaryIPMin: secondaryIPMin ?? 0,
      hideNotAchieved: hideNotAchieved ?? false,
      useTVVmFilter: useTVVmFilter ?? false,
      includeOwnNYD: includeOwnNYD ?? false,
    }

    if (existing) {
      const [updated] = await db
        .update(contests)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(contests.id, existing.id))
        .returning()
      return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest: updated })
    }

    const [contest] = await db
      .insert(contests)
      .values({ id: crypto.randomUUID(), ...data })
      .returning()

    return NextResponse.json({ message: 'Đã lưu chương trình thi đua', contest })
  } catch (error) {
    console.error('Error saving contest:', error)
    return NextResponse.json({ error: 'Không thể lưu chương trình thi đua' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 })
    }

    await db.delete(contests).where(eq(contests.id, id))
    return NextResponse.json({ message: 'Đã xóa chương trình thi đua' })
  } catch (error) {
    console.error('Error deleting contest:', error)
    return NextResponse.json({ error: 'Không thể xóa chương trình thi đua' }, { status: 500 })
  }
}
