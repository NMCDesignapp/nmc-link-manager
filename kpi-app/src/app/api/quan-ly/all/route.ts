import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

// GET /api/quan-ly/all - Fetch all data in one request for faster page load
export async function GET() {
  try {
    const [leaders, revenue, contracts, staff, recruiters, tvvStruct] = await withRetry(() =>
      Promise.all([
        db.leaderInfo.findMany({ orderBy: { agentName: 'asc' } }),
        db.monthlyRevenue.findMany({ orderBy: [{ month: 'desc' }, { nhom: 'asc' }] }),
        db.contract.findMany({
          select: {
            id: true, stt: true, contractNumber: true, agentCode: true, agentName: true,
            position: true, ban: true, maTruongBan: true, nhom: true, maBanNhom: true,
            maTruongBanNhom: true, maDL: true, maNhom: true, leaderAgentCode: true,
            ngayBatDauLamViec: true, effectiveDate: true, issueDate: true, contractStatus: true,
            pdt10DT: true, fyp: true, nguonDuLieu: true, hopDongToChuc: true,
            dkDongPhi: true, phiDongThem: true, afypChuaTru10DT: true, afyp: true,
            ad: true, nhom2: true, ngayBatDauLamViec2: true,
            thangTD: true, namTD: true, thangHL: true,
            tinhLuot3tr: true, maDaiLyTD: true, danhDauTVV: true,
            chucVu2: true, recruiterCode: true, startDate: true,
          },
          orderBy: { effectiveDate: 'asc' },
        }),
        db.staff.findMany({
          select: {
            id: true, nhom: true, maNhom: true, agentCode: true, agentName: true,
            position: true, startDate: true,
          },
          orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
        }),
        db.recruiter.findMany({
          select: {
            id: true, nhom: true, agentCode: true, agentName: true,
            position: true, startDate: true,
          },
          orderBy: [{ nhom: 'asc' }, { agentName: 'asc' }],
        }),
        db.tVVStruct.findMany({
          select: {
            id: true, agentCode: true, agentName: true, maBanNhom: true,
            chucVu: true, ngayBatDau: true, maTVVTuyendung: true, note: true,
          },
          orderBy: { agentName: 'asc' },
        }),
      ])
    )

    return NextResponse.json({ leaders, revenue, contracts, staff, recruiters, tvvStruct }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching all data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
