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

// POST /api/contracts - Create a new contract or batch import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk import mode (array of contracts)
    if (Array.isArray(body)) {
      const data = body
        .filter((c: any) => c.contractNumber || c.agentName)
        .map((c: any, i: number) => ({
          stt: parseInt(c.stt) || 0,
          contractNumber: c.contractNumber || 'HD_' + Date.now() + '_' + i,
          agentCode: c.agentCode || '',
          agentName: c.agentName || 'Chưa nhập',
          position: c.position || '',
          ban: c.ban || '',
          maTruongBan: c.maTruongBan || '',
          nhom: c.nhom || '',
          maBanNhom: c.maBanNhom || '',
          maTruongBanNhom: c.maTruongBanNhom || '',
          maDL: c.maDL || '',
          maNhom: c.maNhom || '',
          leaderAgentCode: c.leaderAgentCode || '',
          ngayBatDauLamViec: c.ngayBatDauLamViec ? new Date(c.ngayBatDauLamViec) : null,
          effectiveDate: c.effectiveDate ? new Date(c.effectiveDate) : new Date(),
          issueDate: (c.issueDate || c.effectiveDate) ? new Date(c.issueDate || c.effectiveDate) : new Date(),
          pdt10DT: parseFloat(c.pdt10DT) || 0,
          fyp: parseFloat(c.fyp) || 0,
          nguonDuLieu: c.nguonDuLieu || '',
          hopDongToChuc: c.hopDongToChuc || '',
          dkDongPhi: c.dkDongPhi || '',
          phiDongThem: parseFloat(c.phiDongThem) || 0,
          afypChuaTru10DT: parseFloat(c.afypChuaTru10DT) || 0,
          afyp: parseFloat(c.afyp) || 0,
          ad: c.ad || '',
          nhom2: c.nhom2 || '',
          ngayBatDauLamViec2: c.ngayBatDauLamViec2 ? new Date(c.ngayBatDauLamViec2) : null,
          thangTD: parseInt(c.thangTD) || 0,
          namTD: parseInt(c.namTD) || 0,
          thangHL: parseInt(c.thangHL) || 0,
          tinhLuot: parseFloat(c.tinhLuot) || 0,
          tinhLuot3tr: parseFloat(c.tinhLuot3tr) || 0,
          maDaiLyTD: c.maDaiLyTD || '',
          danhDauTVV: c.danhDauTVV || '',
          chucVu2: c.chucVu2 || '',
          recruiterCode: c.recruiterCode || '',
          startDate: c.startDate ? new Date(c.startDate) : null,
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      const result = await db.contract.createMany({ data, skipDuplicates: true });
      return NextResponse.json({ count: result.count }, { status: 201 });
    }

    // Single create mode
    const {
      stt, contractNumber, agentCode, agentName, position, ban, maTruongBan,
      nhom, maBanNhom, maTruongBanNhom, maDL, maNhom, leaderAgentCode,
      ngayBatDauLamViec, effectiveDate, issueDate,
      pdt10DT, fyp, nguonDuLieu, hopDongToChuc, dkDongPhi, phiDongThem,
      afypChuaTru10DT, afyp, ad, nhom2, ngayBatDauLamViec2,
      thangTD, namTD, thangHL, tinhLuot, tinhLuot3tr, maDaiLyTD, danhDauTVV,
      chucVu2, recruiterCode, startDate,
    } = body;

    // Relaxed validation: allow imports with minimal data (defaults will be provided)
    if (!contractNumber && !agentName) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp ít nhất số hợp đồng hoặc tên' },
        { status: 400 }
      );
    }

    const contract = await db.contract.create({
      data: {
        stt: parseInt(stt) || 0,
        contractNumber: contractNumber || 'HD_' + Date.now(),
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
        effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
        issueDate: (issueDate || effectiveDate) ? new Date(issueDate || effectiveDate) : new Date(),
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
