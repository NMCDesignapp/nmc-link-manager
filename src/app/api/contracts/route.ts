import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/contracts - List all contracts with optional date filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Record<string, unknown> = {};

    if (startDate && endDate) {
      where.effectiveDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.effectiveDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.effectiveDate = {
        lte: new Date(endDate),
      };
    }

    const contracts = await db.contract.findMany({
      where,
      select: {
        id: true, stt: true, contractNumber: true, agentCode: true, agentName: true,
        position: true, ban: true, maTruongBan: true, nhom: true, maBanNhom: true,
        maTruongBanNhom: true, maDL: true, maNhom: true, leaderAgentCode: true,
        ngayBatDauLamViec: true, effectiveDate: true, issueDate: true,
        pdt10DT: true, fyp: true, nguonDuLieu: true, hopDongToChuc: true,
        dkDongPhi: true, phiDongThem: true, afypChuaTru10DT: true, afyp: true,
        ad: true, nhom2: true, ngayBatDauLamViec2: true,
        thangTD: true, namTD: true, thangHL: true,
        tinhLuot: true, tinhLuot3tr: true, maDaiLyTD: true, danhDauTVV: true,
        chucVu2: true, recruiterCode: true, startDate: true,
      },
      orderBy: { effectiveDate: 'asc' },
    });

    return NextResponse.json(contracts, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách hợp đồng' },
      { status: 500 }
    );
  }
}

// POST /api/contracts - Create a new contract
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      stt, contractNumber, agentCode, agentName, position, ban, maTruongBan,
      nhom, maBanNhom, maTruongBanNhom, maDL, maNhom, leaderAgentCode,
      ngayBatDauLamViec, effectiveDate, issueDate,
      pdt10DT, fyp, nguonDuLieu, hopDongToChuc, dkDongPhi, phiDongThem,
      afypChuaTru10DT, afyp, ad, nhom2, ngayBatDauLamViec2,
      thangTD, namTD, thangHL, tinhLuot, tinhLuot3tr, maDaiLyTD, danhDauTVV,
      chucVu2, recruiterCode, startDate,
    } = body;

    if (!contractNumber || !agentName || !effectiveDate || fyp === undefined) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin hợp đồng' },
        { status: 400 }
      );
    }

    const contract = await db.contract.create({
      data: {
        stt: parseInt(stt) || 0,
        contractNumber,
        agentCode: agentCode || '',
        agentName,
        position: position || '',
        ban: ban || '',
        maTruongBan: maTruongBan || '',
        nhom: nhom || '',
        maBanNhom: maBanNhom || '',
        maTruongBanNhom: maTruongBanNhom || '',
        maDL: maDL || '',
        maNhom: maNhom || '',
        leaderAgentCode: leaderAgentCode || '',
        ngayBatDauLamViec: ngayBatDauLamViec ? new Date(ngayBatDauLamViec) : null,
        effectiveDate: new Date(effectiveDate),
        issueDate: new Date(issueDate || effectiveDate),
        pdt10DT: parseFloat(pdt10DT) || 0,
        fyp: parseFloat(fyp) || 0,
        nguonDuLieu: nguonDuLieu || '',
        hopDongToChuc: hopDongToChuc || '',
        dkDongPhi: dkDongPhi || '',
        phiDongThem: parseFloat(phiDongThem) || 0,
        afypChuaTru10DT: parseFloat(afypChuaTru10DT) || 0,
        afyp: parseFloat(afyp) || 0,
        ad: ad || '',
        nhom2: nhom2 || '',
        ngayBatDauLamViec2: ngayBatDauLamViec2 ? new Date(ngayBatDauLamViec2) : null,
        thangTD: parseInt(thangTD) || 0,
        namTD: parseInt(namTD) || 0,
        thangHL: parseInt(thangHL) || 0,
        tinhLuot: parseFloat(tinhLuot) || 0,
        tinhLuot3tr: parseFloat(tinhLuot3tr) || 0,
        maDaiLyTD: maDaiLyTD || '',
        danhDauTVV: danhDauTVV || '',
        chucVu2: chucVu2 || '',
        recruiterCode: recruiterCode || '',
        startDate: startDate ? new Date(startDate) : null,
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Số hợp đồng đã tồn tại' },
        { status: 409 }
      );
    }
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { error: 'Không thể tạo hợp đồng mới' },
      { status: 500 }
    );
  }
}

// DELETE /api/contracts - Delete a contract by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp ID hợp đồng' },
        { status: 400 }
      );
    }

    await db.contract.delete({ where: { id } });

    return NextResponse.json({ message: 'Đã xóa hợp đồng thành công' });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json(
      { error: 'Không thể xóa hợp đồng' },
      { status: 500 }
    );
  }
}
