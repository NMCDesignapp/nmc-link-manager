import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------- GET /api/kpi-target-registrations ----------
// Query params:
//   - month (optional): "YYYY-MM" format. If omitted, returns all.
//   - role (optional): "tn" | "ttn". If omitted, returns all roles.
//
// Returns: array of registrations
//   { id, month, role, nhom, maNhom, agentCode, agentName, position,
//     afypTarget (number, in VND), luotHDTarget (number), note, createdAt, updatedAt }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const role = searchParams.get('role')

    // Schema is provisioned during deployment.  Do not run DDL on every user
    // request: Supabase serialises these ALTER statements and it made an empty
    // registration list take tens of seconds to open on mobile.

    // Build query
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
// Body: { month, role, nhom?, maNhom?, agentCode?, agentName?, position?, afypTarget, luotHDTarget, note? }
// Creates a new registration. Returns the created record.
export async function POST(req: NextRequest) {
  try {
    const registrationSetting = await db.setting.findUnique({ where: { key: 'kpi-target-registration-open' } })
    if (registrationSetting?.value === '0') {
      return NextResponse.json({ error: 'Đăng ký mục tiêu đang tạm khóa.' }, { status: 403 })
    }
    const body = await req.json()
    const {
      month, role,
      nhom = '', maNhom = '',
      agentCode = '', agentName = '', position = '',
      afypTarget = 0, luotHDTarget = 0,
      note = '',
    } = body || {}

    if (!month || typeof month !== 'string') {
      return NextResponse.json({ error: 'month is required (YYYY-MM)' }, { status: 400 })
    }
    if (role !== 'tn' && role !== 'ttn') {
      return NextResponse.json({ error: 'role must be "tn" or "ttn"' }, { status: 400 })
    }
    if (typeof afypTarget !== 'number' || typeof luotHDTarget !== 'number') {
      return NextResponse.json({ error: 'afypTarget and luotHDTarget must be numbers' }, { status: 400 })
    }

    // See GET: the deployed schema is stable, so request handlers must only
    // read/write data and never execute schema migrations.

    // Generate UUID
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
