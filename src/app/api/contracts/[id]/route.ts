import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Parse date string (supports dd/mm/yyyy, yyyy-mm-dd, ISO) - UTC safe
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const s = dateStr.trim();
  // yyyy-mm-dd → UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  // dd/mm/yyyy → UTC
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.stt !== undefined) data.stt = parseInt(body.stt) || 0;
    if (body.contractNumber !== undefined) data.contractNumber = body.contractNumber;
    if (body.agentCode !== undefined) data.agentCode = body.agentCode;
    if (body.agentName !== undefined) data.agentName = body.agentName;
    if (body.position !== undefined) data.position = body.position;
    if (body.ban !== undefined) data.ban = body.ban;
    if (body.maTruongBan !== undefined) data.maTruongBan = body.maTruongBan;
    if (body.nhom !== undefined) data.nhom = body.nhom;
    if (body.maBanNhom !== undefined) data.maBanNhom = body.maBanNhom;
    if (body.maTruongBanNhom !== undefined) data.maTruongBanNhom = body.maTruongBanNhom;
    if (body.maDL !== undefined) data.maDL = body.maDL;
    if (body.maNhom !== undefined) data.maNhom = body.maNhom;
    if (body.leaderAgentCode !== undefined) data.leaderAgentCode = body.leaderAgentCode;
    if (body.ngayBatDauLamViec !== undefined) data.ngayBatDauLamViec = body.ngayBatDauLamViec ? parseDate(body.ngayBatDauLamViec) : null;
    if (body.effectiveDate !== undefined) data.effectiveDate = body.effectiveDate ? parseDate(body.effectiveDate) : new Date();
    if (body.issueDate !== undefined) data.issueDate = body.issueDate ? parseDate(body.issueDate) : (body.effectiveDate ? parseDate(body.effectiveDate) : new Date());
    if (body.pdt10DT !== undefined) data.pdt10DT = parseFloat(body.pdt10DT) || 0;
    if (body.fyp !== undefined) data.fyp = parseFloat(body.fyp) || 0;
    if (body.nguonDuLieu !== undefined) data.nguonDuLieu = body.nguonDuLieu;
    if (body.hopDongToChuc !== undefined) data.hopDongToChuc = body.hopDongToChuc;
    if (body.dkDongPhi !== undefined) data.dkDongPhi = body.dkDongPhi;
    if (body.phiDongThem !== undefined) data.phiDongThem = parseFloat(body.phiDongThem) || 0;
    if (body.afypChuaTru10DT !== undefined) data.afypChuaTru10DT = parseFloat(body.afypChuaTru10DT) || 0;
    if (body.afyp !== undefined) data.afyp = parseFloat(body.afyp) || 0;
    if (body.ad !== undefined) data.ad = body.ad;
    if (body.nhom2 !== undefined) data.nhom2 = body.nhom2;
    if (body.ngayBatDauLamViec2 !== undefined) data.ngayBatDauLamViec2 = body.ngayBatDauLamViec2 ? parseDate(body.ngayBatDauLamViec2) : null;
    if (body.thangTD !== undefined) data.thangTD = parseInt(body.thangTD) || 0;
    if (body.namTD !== undefined) data.namTD = parseInt(body.namTD) || 0;
    if (body.thangHL !== undefined) data.thangHL = parseInt(body.thangHL) || 0;
    if (body.tinhLuot3tr !== undefined) data.tinhLuot3tr = parseFloat(body.tinhLuot3tr) || 0;
    if (body.maDaiLyTD !== undefined) data.maDaiLyTD = body.maDaiLyTD;
    if (body.danhDauTVV !== undefined) data.danhDauTVV = body.danhDauTVV;
    if (body.chucVu2 !== undefined) data.chucVu2 = body.chucVu2;
    if (body.recruiterCode !== undefined) data.recruiterCode = body.recruiterCode;
    if (body.startDate !== undefined) data.startDate = body.startDate ? parseDate(body.startDate) : null;

    const contract = await db.contract.update({ where: { id }, data });
    return NextResponse.json(contract);
  } catch (error) {
    console.error('PATCH /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Không thể cập nhật hợp đồng' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.contract.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/contracts/[id] error:', error);
    return NextResponse.json({ error: 'Không thể xóa hợp đồng' }, { status: 500 });
  }
}
