import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ---------- PUT /api/kpi-target-registrations/[id] ----------
// Update an existing registration. Body: any subset of fields.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId)
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const body = await req.json()
    const allowed = ['month', 'role', 'nhom', 'maNhom', 'agentCode', 'agentName', 'position', 'afypTarget', 'luotHDTarget', 'note']
    const sets: string[] = []
    const values: any[] = []
    let i = 1
    for (const key of allowed) {
      if (body[key] !== undefined) {
        values.push(body[key])
        sets.push(`"${key}" = $${i}`)
        i++
      }
    }
    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }
    sets.push(`"updatedAt" = NOW()`)
    values.push(id)
    await db.$executeRawUnsafe(
      `UPDATE "KpiTargetRegistration" SET ${sets.join(', ')} WHERE "id" = $${i}`,
      ...values
    )
    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('PUT /api/kpi-target-registrations/[id] error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}

// ---------- DELETE /api/kpi-target-registrations/[id] ----------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params
    const id = decodeURIComponent(rawId)
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    await db.$executeRawUnsafe(`DELETE FROM "KpiTargetRegistration" WHERE "id" = $1`, id)
    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('DELETE /api/kpi-target-registrations/[id] error:', error)
    return NextResponse.json({ error: 'Failed: ' + String(error?.message || error) }, { status: 500 })
  }
}
