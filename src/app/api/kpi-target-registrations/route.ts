import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Giữ tương thích với bảng được tạo từ các phiên bản cũ của KPI.
// Một số database đã có bảng nhưng thiếu cột mới như role, nên cần nâng cấp
// trước mọi lần đọc/ghi thay vì giả định schema luôn mới.
async function ensureTargetRegistrationTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "KpiTargetRegistration" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "month" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'tn',
      "nhom" TEXT NOT NULL DEFAULT '',
      "maNhom" TEXT NOT NULL DEFAULT '',
      "agentCode" TEXT NOT NULL DEFAULT '',
      "agentName" TEXT NOT NULL DEFAULT '',
      "position" TEXT NOT NULL DEFAULT '',
      "afypTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "luotHDTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "note" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  const columns = [
    ['role', `TEXT NOT NULL DEFAULT 'tn'`], ['nhom', `TEXT NOT NULL DEFAULT ''`],
    ['maNhom', `TEXT NOT NULL DEFAULT ''`], ['agentCode', `TEXT NOT NULL DEFAULT ''`],
    ['agentName', `TEXT NOT NULL DEFAULT ''`], ['position', `TEXT NOT NULL DEFAULT ''`],
    ['afypTarget', 'DOUBLE PRECISION NOT NULL DEFAULT 0'], ['luotHDTarget', 'DOUBLE PRECISION NOT NULL DEFAULT 0'],
    ['note', `TEXT NOT NULL DEFAULT ''`], ['createdAt', 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'],
    ['updatedAt', 'TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP'],
  ]
  for (const [name, definition] of columns) {
    await db.$executeRawUnsafe(`ALTER TABLE "KpiTargetRegistration" ADD COLUMN IF NOT EXISTS "${name}" ${definition}`)
  }
}

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

    await ensureTargetRegistrationTable()

    // Build query