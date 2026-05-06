import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/contests - List all saved contests
export async function GET() {
  try {
    const contests = await db.contest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json({ error: 'Không thể tải danh sách chương trình thi đua' }, { status: 500 });
  }
}

// POST /api/contests - Save a new contest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, startDate, endDate, issueDate, conditionType, targetType, bonusTiers, posterUrl, participants } = body as {
      title: string;
      startDate: string;
      endDate: string;
      issueDate?: string;
      conditionType: string;
      targetType: string;
      bonusTiers: string;
      posterUrl?: string;
      participants?: string;
    };

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Check if contest with same title exists, update it
    const existing = await db.contest.findFirst({ where: { title } });

    if (existing) {
      const updated = await db.contest.update({
        where: { id: existing.id },
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          issueDate: issueDate ? new Date(issueDate) : null,
          conditionType,
          targetType: targetType || 'tvv',
          bonusTiers,
          posterUrl: posterUrl || '',
          participants: participants || '[]',
        },
      });
      return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest: updated });
    }

    const contest = await db.contest.create({
      data: {
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        issueDate: issueDate ? new Date(issueDate) : null,
        conditionType,
        targetType: targetType || 'tvv',
        bonusTiers,
        posterUrl: posterUrl || '',
        participants: participants || '[]',
      },
    });

    return NextResponse.json({ message: 'Đã lưu chương trình thi đua', contest });
  } catch (error) {
    console.error('Error saving contest:', error);
    return NextResponse.json({ error: 'Không thể lưu chương trình thi đua' }, { status: 500 });
  }
}

// DELETE /api/contests?id=xxx - Delete a contest
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    }

    await db.contest.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xóa chương trình thi đua' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json({ error: 'Không thể xóa chương trình thi đua' }, { status: 500 });
  }
}
