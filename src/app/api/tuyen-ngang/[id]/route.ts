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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.nhom !== undefined) data.nhom = body.nhom;
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.ngayBatDau !== undefined) data.ngayBatDau = body.ngayBatDau ? parseDate(body.ngayBatDau) : null;
    if (body.ngayHieuLuc !== undefined) data.ngayHieuLuc = body.ngayHieuLuc ? parseDate(body.ngayHieuLuc) : null;
    if (body.maNguoiTuyenDung !== undefined) data.maNguoiTuyenDung = body.maNguoiTuyenDung;
    if (body.tenNguoiTuyenDung !== undefined) data.tenNguoiTuyenDung = body.tenNguoiTuyenDung;

    const row = await db.tuyenNgang.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch (error) {
    console.error('PATCH /api/tuyen-ngang/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật TTN Tuyển Ngang' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.tuyenNgang.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tuyen-ngang/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa TTN Tuyển Ngang' }, { status: 500 });
  }
}
