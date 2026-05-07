import { NextRequest, NextResponse } from 'next/server'
import { db, contracts } from '@/lib/db'

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  const parts = dateStr.trim().split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (!day || !month || !year) return null
  return new Date(year, month - 1, day)
}

function parseNumber(numStr: string): number {
  if (!numStr || numStr.trim() === '') return 0
  const cleaned = numStr.trim().replace(/\./g, '').replace(/,/g, '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not configured. Please add DATABASE_URL environment variable.' },
        { status: 503 }
      )
    }
    const body = await request.json()
    const { csvData } = body as { csvData?: string }

    if (!csvData) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp dữ liệu CSV' },
        { status: 400 }
      )
    }

    // Clear existing data
    await db.delete(contracts)

    const lines = csvData.split('\n').filter((line) => line.trim() !== '')
    const dataLines = lines.slice(1)

    const contractRows: {
      id: string
      contractNumber: string
      agentCode: string
      agentName: string
      position: string
      ban: string
      nhom: string
      maNhom: string
      leaderAgentCode: string
      recruiterCode: string
      startDate: Date | null
      effectiveDate: Date
      issueDate: Date
      fyp: number
      afyp: number
      tinhLuot: number
    }[] = []
    const seenContractNumbers = new Set<string>()

    for (const line of dataLines) {
      const columns: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      columns.push(current.trim())

      const contractNumber = columns[10] || ''
      const agentCode = columns[6] || ''
      const agentName = columns[7] || ''
      const position = columns[8] || ''
      const ban = columns[1] || ''
      const nhom = columns[3] || ''
      const maNhom = columns[4] || ''
      const leaderAgentCode = columns[5] || ''
      const startDateStr = columns[9] || ''
      const effectiveDateStr = columns[11] || ''
      const issueDateStr = columns[12] || ''
      const fypStr = columns[13] || ''
      const afypStr = columns[20] || ''
      const tinhLuotStr = columns[26] || '0'

      if (!contractNumber || !effectiveDateStr) continue
      if (seenContractNumbers.has(contractNumber)) continue
      seenContractNumbers.add(contractNumber)

      const effectiveDate = parseDate(effectiveDateStr)
      const issueDate = parseDate(issueDateStr)
      const startDate = parseDate(startDateStr)

      if (!effectiveDate) continue

      contractRows.push({
        id: crypto.randomUUID(),
        contractNumber,
        agentCode,
        agentName,
        position,
        ban,
        nhom,
        maNhom,
        leaderAgentCode,
        recruiterCode: '',
        startDate,
        effectiveDate,
        issueDate: issueDate || effectiveDate,
        fyp: parseNumber(fypStr),
        afyp: parseNumber(afypStr),
        tinhLuot: parseNumber(tinhLuotStr),
      })
    }

    if (contractRows.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy hợp đồng hợp lệ trong dữ liệu CSV' },
        { status: 400 }
      )
    }

    const inserted = await db
      .insert(contracts)
      .values(contractRows)
      .onConflictDoNothing()
      .returning()

    return NextResponse.json({
      message: `Đã nhập ${inserted.length} hợp đồng từ Google Sheets`,
      count: inserted.length,
    })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json(
      { error: 'Không thể nhập dữ liệu: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
      { status: 500 }
    )
  }
}
