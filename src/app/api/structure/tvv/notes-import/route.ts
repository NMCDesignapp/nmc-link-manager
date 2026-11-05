import { NextRequest, NextResponse } from 'next/server';
import { db, withRetry } from '@/lib/db';
import { hasSameOrigin, isAdminRequest } from '@/lib/admin-session';
import { getTVVStructureNotes, saveTVVStructureNotes } from '@/lib/tvv-structure-notes';
import { prepareTVVNotesImport } from '@/lib/tvv-notes-import';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403, headers });
  }
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Cần đăng nhập quyền quản trị.' }, { status: 401, headers });
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !Array.isArray(body.rows) ||
        typeof body.dryRun !== 'boolean') {
      return NextResponse.json({ error: 'Dữ liệu nhập không hợp lệ.' }, { status: 400, headers });
    }

    const [existing, currentNotes] = await Promise.all([
      withRetry(() => db.tVVStruct.findMany({ select: { agentCode: true } })),
      getTVVStructureNotes(),
    ]);
    const { notes, summary } = prepareTVVNotesImport(
      body.rows, existing.map((row) => row.agentCode), currentNotes,
    );
    if (summary.matched === 0) {
      return NextResponse.json({
        error: 'Không có Mã TVV nào trong file khớp với DS TVV hiện tại.',
        ...summary,
      }, { status: 409, headers });
    }

    if (body.dryRun) {
      return NextResponse.json({ preview: true, ...summary }, { headers });
    }

    if (summary.changed > 0) await saveTVVStructureNotes(notes);
    return NextResponse.json({ success: true, ...summary }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể cập nhật ghi chú TVV.';
    const invalid = /^(Dòng |Mã TVV bị trùng|File ghi chú)/.test(message);
    if (!invalid) console.error('[tvv-notes-import]', error);
    return NextResponse.json({
      error: invalid ? message : 'Không thể cập nhật ghi chú TVV.',
    }, { status: invalid ? 400 : 500, headers });
  }
}
