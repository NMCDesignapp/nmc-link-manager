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

// Helper: safe number parse for both raw numbers and formatted strings
function safeFloat(v: any): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v || '0').replace(/,/g, '')) || 0;
}
function safeInt(v: any): number {
  if (typeof v === 'number') return Math.round(v);
  return parseInt(String(v || '0').replace(/,/g, '')) || 0;
}
// Helper: safe date parse - ensures date string is treated as UTC midnight
function safeDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  // yyyy-mm-dd format → append T00:00:00Z for UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s + 'T00:00:00Z');
  // dd/mm/yyyy → construct UTC
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) return new Date(Date.UTC(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])));
  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// POST /api/contracts - Create a new contract or batch import
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk import mode with replace option
    // If body has { contracts: [...], replaceMonths: ["2026-04", "2026-05"] },
    // delete existing contracts for those months first, then insert new ones
    let contractsArray: any[];
    let replaceMonths: string[] = [];

    if (Array.isArray(body)) {
      contractsArray = body;
    } else if (body.contracts && Array.isArray(body.contracts)) {
      contractsArray = body.contracts;
      replaceMonths = body.replaceMonths || [];
    } else {
      // Single create mode
      contractsArray = null;
    }

    // Bulk import mode
    if (contractsArray) {
      const data = contractsArray
        .filter((c: any) => c.contractNumber || c.agentName)
        .map((c: any, i: number) => ({
          stt: safeInt(c.stt),
          contractNumber: c.contractNumber || 'HD_' + Date.now() + '_' + i,
          agentCode: String(c.agentCode || ''),
          agentName: c.agentName || 'Chưa nhập',
          position: String(c.position || ''),
          ban: String(c.ban || ''),
          maTruongBan: String(c.maTruongBan || ''),
          nhom: String(c.nhom || ''),
          maBanNhom: String(c.maBanNhom || ''),
          maTruongBanNhom: String(c.maTruongBanNhom || ''),
          maDL: String(c.maDL || ''),
          maNhom: String(c.maNhom || ''),
          leaderAgentCode: String(c.leaderAgentCode || ''),
          ngayBatDauLamViec: safeDate(c.ngayBatDauLamViec),
          effectiveDate: safeDate(c.effectiveDate) || new Date(),
          issueDate: safeDate(c.issueDate) || safeDate(c.effectiveDate) || new Date(),
          pdt10DT: safeFloat(c.pdt10DT),
          fyp: safeFloat(c.fyp),
          nguonDuLieu: String(c.nguonDuLieu || ''),
          hopDongToChuc: String(c.hopDongToChuc || ''),
          dkDongPhi: String(c.dkDongPhi || ''),
          phiDongThem: safeFloat(c.phiDongThem),
          afypChuaTru10DT: safeFloat(c.afypChuaTru10DT),
          afyp: safeFloat(c.afyp),
          ad: String(c.ad || ''),
          nhom2: String(c.nhom2 || ''),
          ngayBatDauLamViec2: safeDate(c.ngayBatDauLamViec2),
          thangTD: safeInt(c.thangTD),
          namTD: safeInt(c.namTD),
          thangHL: safeInt(c.thangHL),
          tinhLuot: safeFloat(c.tinhLuot),
          tinhLuot3tr: safeFloat(c.tinhLuot3tr),
          maDaiLyTD: String(c.maDaiLyTD || ''),
          danhDauTVV: String(c.danhDauTVV || ''),
          chucVu2: String(c.chucVu2 || ''),
          recruiterCode: String(c.recruiterCode || ''),
          startDate: safeDate(c.startDate),
        }));

      if (data.length === 0) {
        return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
      }

      // If replaceMonths is specified, delete existing contracts for those months first
      let deletedCount = 0;
      if (replaceMonths.length > 0) {
        for (const month of replaceMonths) {
          const [yearStr, monthStr] = month.split('-');
          const year = parseInt(yearStr);
          const m = parseInt(monthStr);
          if (isNaN(year) || isNaN(m)) continue;
          
          const startDate = new Date(Date.UTC(year, m - 1, 1));
          const endDate = new Date(Date.UTC(year, m, 1)); // first day of next month
          
          const result = await db.contract.deleteMany({
            where: {
              effectiveDate: {
                gte: startDate,
                lt: endDate,
              },
            },
          });
          deletedCount += result.count;
        }
        console.log(`[Contracts] Deleted ${deletedCount} existing contracts for months: ${replaceMonths.join(', ')}`);
      }

      // Try bulk insert first; if unique constraint fails, fall back to individual inserts
      let insertedCount = 0;
      let skippedCount = 0;
      let skippedContracts: string[] = [];
      try {
        const result = await db.contract.createMany({ data });
        insertedCount = result.count;
      } catch (bulkError: any) {
        if (bulkError?.code === 'P2002') {
          // Unique constraint violation - fall back to individual inserts
          console.log('[Contracts] Bulk insert failed due to unique constraint, falling back to individual inserts');
          for (let i = 0; i < data.length; i++) {
            try {
              await db.contract.create({ data: data[i] });
              insertedCount++;
            } catch (singleError: any) {
              if (singleError?.code === 'P2002') {
                skippedCount++;
                skippedContracts.push(data[i].contractNumber || `row_${i}`);
              } else {
                console.error(`[Contracts] Error inserting row ${i}:`, singleError.message);
                skippedCount++;
              }
            }
          }
        } else {
          throw bulkError;
        }
      }
      return NextResponse.json({ 
        count: insertedCount, 
        deleted: deletedCount,
        replaced: replaceMonths.length > 0,
        skipped: skippedCount,
        skippedContracts: skippedContracts.slice(0, 20), // Limit to first 20 for response size
      }, { status: 201 });
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
        stt: safeInt(stt),
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
        ngayBatDauLamViec: safeDate(ngayBatDauLamViec),
        effectiveDate: safeDate(effectiveDate) || new Date(),
        issueDate: safeDate(issueDate) || safeDate(effectiveDate) || new Date(),
        pdt10DT: safeFloat(pdt10DT),
        fyp: safeFloat(fyp),
        nguonDuLieu: nguonDuLieu || '',
        hopDongToChuc: hopDongToChuc || '',
        dkDongPhi: dkDongPhi || '',
        phiDongThem: safeFloat(phiDongThem),
        afypChuaTru10DT: safeFloat(afypChuaTru10DT),
        afyp: safeFloat(afyp),
        ad: ad || '',
        nhom2: nhom2 || '',
        ngayBatDauLamViec2: safeDate(ngayBatDauLamViec2),
        thangTD: safeInt(thangTD),
        namTD: safeInt(namTD),
        thangHL: safeInt(thangHL),
        tinhLuot: safeFloat(tinhLuot),
        tinhLuot3tr: safeFloat(tinhLuot3tr),
        maDaiLyTD: maDaiLyTD || '',
        danhDauTVV: danhDauTVV || '',
        chucVu2: chucVu2 || '',
        recruiterCode: recruiterCode || '',
        startDate: safeDate(startDate),
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
      { error: 'Không thể tạo hợp đồng mới: ' + String(error) },
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
