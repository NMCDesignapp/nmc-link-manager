import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Parse date string (supports dd/mm/yyyy, yyyy-mm-dd, ISO)
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  // dd/mm/yyyy (Vietnamese format)
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    if (day && month && year) return new Date(year, month - 1, day);
  }
  // yyyy-mm-dd or ISO
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// Self-heal migration: đảm bảo cột ngayHieuLuc tồn tại
async function ensureNgayHieuLucColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Recruiter" ADD COLUMN IF NOT EXISTS "ngayHieuLuc" TIMESTAMP(3)');
  } catch (e) {
    console.warn('[ensureNgayHieuLucColumn] Skipped:', (e as Error)?.message);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Đảm bảo DB có cột ngayHieuLuc trước khi update (self-heal)
    if (body.ngayHieuLuc !== undefined) await ensureNgayHieuLucColumn();

    const data: Record<string, unknown> = {};
    if (body.nhom !== undefined) data.nhom = body.nhom;
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.position !== undefined) data.position = body.position;
    if (body.startDate !== undefined) data.startDate = body.startDate ? parseDate(body.startDate) : null;
    if (body.ngayHieuLuc !== undefined) data.ngayHieuLuc = body.ngayHieuLuc ? parseDate(body.ngayHieuLuc) : null;

    const recruiter = await db.recruiter.update({ where: { id }, data });
    return NextResponse.json(recruiter);
  } catch (error) {
    console.error('PATCH /api/recruiters/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật người tuyển dụng' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.recruiter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/recruiters/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa người tuyển dụng' }, { status: 500 });
  }
}
