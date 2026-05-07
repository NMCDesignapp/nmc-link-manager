import { NextRequest, NextResponse } from 'next/server'
import { db, contracts } from '@/lib/db'
import { eq, gte, lte, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let allContracts
    if (startDate && endDate) {
      allContracts = await db
        .select()
        .from(contracts)
        .where(
          and(
            gte(contracts.effectiveDate, new Date(startDate)),
            lte(contracts.effectiveDate, new Date(endDate))
          )
        )
        .orderBy(contracts.effectiveDate)
    } else if (startDate) {
      allContracts = await db
        .select()
        .from(contracts)
        .where(gte(contracts.effectiveDate, new Date(startDate)))
        .orderBy(contracts.effectiveDate)
    } else if (endDate) {
      allContracts = await db
        .select()
        .from(contracts)
        .where(lte(contracts.effectiveDate, new Date(endDate)))
        .orderBy(contracts.effectiveDate)
    } else {
      allContracts = await db.select().from(contracts).orderBy(contracts.effectiveDate)
    }

    return NextResponse.json(allContracts)
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { error: 'Không thể tải danh sách hợp đồng' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      contractNumber, agentCode, agentName, position, ban, nhom, maNhom,
      leaderAgentCode, recruiterCode, startDate, effectiveDate, issueDate,
      fyp, afyp, tinhLuot,
    } = body

    if (!contractNumber || !agentName || !effectiveDate || fyp === undefined) {
      return NextResponse.json(
        { error: 'Vui lòng điền đầy đủ thông tin hợp đồng' },
        { status: 400 }
      )
    }

    const [contract] = await db
      .insert(contracts)
      .values({
        id: crypto.randomUUID(),
        contractNumber,
        agentCode: agentCode || '',
        agentName,
        position: position || '',
        ban: ban || '',
        nhom: nhom || '',
        maNhom: maNhom || '',
        leaderAgentCode: leaderAgentCode || '',
        recruiterCode: recruiterCode || '',
        startDate: startDate ? new Date(startDate) : null,
        effectiveDate: new Date(effectiveDate),
        issueDate: new Date(issueDate || effectiveDate),
        fyp: parseFloat(fyp) || 0,
        afyp: parseFloat(afyp) || 0,
        tinhLuot: parseFloat(tinhLuot) || 0,
      })
      .returning()

    return NextResponse.json(contract, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === '23505') {
      return NextResponse.json(
        { error: 'Số hợp đồng đã tồn tại' },
        { status: 409 }
      )
    }
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { error: 'Không thể tạo hợp đồng mới' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp ID hợp đồng' },
        { status: 400 }
      )
    }

    await db.delete(contracts).where(eq(contracts.id, id))

    return NextResponse.json({ message: 'Đã xóa hợp đồng thành công' })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: 'Không thể xóa hợp đồng' },
      { status: 500 }
    )
  }
}
