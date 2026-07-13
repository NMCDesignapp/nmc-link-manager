import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetName, data } = body as { sheetName: string; data: Record<string, unknown>[] };

    if (!sheetName || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Missing sheetName or data' }, { status: 400 });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-size columns
    const headers = Object.keys(data[0]);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length * 2, 12) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${sheetName}_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[export] Error generating export:', error);
    return NextResponse.json({ error: 'Failed to generate export', details: String(error) }, { status: 500 });
  }
}
