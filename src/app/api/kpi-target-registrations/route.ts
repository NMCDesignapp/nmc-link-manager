import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ACTIVE_TARGET_MONTH = '2026-09'

// ---------- GET /api/kpi-target-registrations ----------
// During the September 2026 registration campaign, any month-filtered KPI request
// is normalized to the active campaign month so old August clients still read the
// correct list immediately after deployment.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedMonth = searchParams.get('month')
    const month = requestedMonth ? ACTIVE_TARGET_MONTH : null
    const role = searchParams.get('role')

    const conditions: string[] = []
    const params: any[] = []
    if (month) {
      params.push(month)
      conditions.push(`"month" = $${params.length}`)
    }
    if (role && (role === 'tn' || role === 'ttn')) {
      params.push(role)
      conditions.push(`"role" = $${params.length}`)
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows: any[] = await db.$queryRawUnsafe(
      `SELECT "id", "month", "role", "nhom", "maNhom", "agentCode", "agentName", "position", "afypTarget", "luotHDTarget", "note", "createdAt", "updatedAt"
       FROM "KpiTargetRegistration" ${whereClause}
       ORDER BY "createdAt" ASC`,
      ...params
    )
    return NextResponse.json(rows || [])
  } catch (error: any) {
    console.error('GET /api/kpi-target-registrations error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}

// ---------- POST /api/kpi-target-registrations ----------
// September 2026 campaign is explicitly open. The server owns the campaign month,
// so stale clients cannot accidentally save a registration into August.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      role,
      nhom = '', maNhom = '',
      agentCode = '', agentName = '', position = '',
      afypTarget = 0, luotHDTarget = 0,
      note = '',
    } = body || {}
    const month = ACTIVE_TARGET_MONTH

    if (role !== 'tn' && role !== 'ttn') {
      return NextResponse.json({ error: 'role must be "tn" or "ttn"' }, { status: 400 })
    }
    if (typeof afypTarget !== 'number' || typeof luotHDTarget !== 'number') {
      return NextResponse.json({ error: 'afypTarget and luotHDTarget must be numbers' }, { status: 400 })
    }

    const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    await db.$executeRawUnsafe(
      `INSERT INTO "KpiTargetRegistration" (
        "id", "month", "role", "nhom", "maNhom", "agentCode", "agentName", "position", "afypTarget", "luotHDTarget", "note",
        "maSo", "hoTen", "chucVu", "vaiTro", "afyp", "luotHD", "ghiChu", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      )`,
      id, month, role, nhom, maNhom, agentCode, agentName, position, afypTarget, luotHDTarget, note,
      agentCode, agentName, position, role, afypTarget, luotHDTarget, note
    )

    return NextResponse.json({ id, month, role, nhom, maNhom, agentCode, agentName, position, afypTarget, luotHDTarget, note }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/kpi-target-registrations error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
