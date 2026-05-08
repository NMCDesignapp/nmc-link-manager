import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/recruiters/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const recruiter = await db.recruiter.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(recruiter);
  } catch (error) {
    console.error('Error updating recruiter:', error);
    return NextResponse.json({ error: 'Không thể cập nhật' }, { status: 500 });
  }
}

// DELETE /api/recruiters/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.recruiter.delete({ where: { id } });
    return NextResponse.json({ message: 'Đã xóa thành công' });
  } catch (error) {
    console.error('Error deleting recruiter:', error);
    return NextResponse.json({ error: 'Không thể xóa' }, { status: 500 });
  }
}
