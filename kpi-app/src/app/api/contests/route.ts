import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { createDefaultContestPoster } from '@/lib/contest-poster';
import { getContestArchiveYear, isChotContestTitle } from '@/lib/contest-archive';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const noStore = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

const contestSummarySelect = {
  id: true, title: true, startDate: true, endDate: true, issueDate: true,
  conditionType: true, targetType: true, bonusTiers: true, participants: true,
  usePhase2: true, phase2StartDate: true, phase2EndDate: true, bonusTiers2: true,
  useSecondaryCondition: true, secondaryAFYPMin: true, secondaryIPMin: true,
  secondaryLuotHDMin: true, secondaryLuotHDCMin: true, secondaryLuotHDFilter: true,
  secondaryLuotHDCFilter: true, secondaryTotalAFYPMin: true, secondaryTotalIPMin: true,
  hideNotAchieved: true, includeIndividualNTD: true, includeIndividualTN: true,
  luotHDThreshold: true, luotHDCTThreshold: true, tvv90MaxMonths: true,
  tvv90MinIP: true, referenceContestId: true, includeTNInPassCount: true,
  topN: true, topNMinIP: true, topNValueType: true, filterByEffectiveDate: true,
  csvContractUrl: true, csvStaffUrl: true, csvRecruiterUrl: true,
  createdAt: true, updatedAt: true,
} as const;

type PosterContest = {
  id: string;
  posterUrl?: string | null;
  updatedAt?: Date;
  title?: string;
  startDate?: Date;
  endDate?: Date;
  targetType?: string;
};

const contestCompatSelect = {
  ...contestSummarySelect,
  posterUrl: true,
} as const;

const recruitedAgentScopeKey = (id: string) => `contest-recruited-agent-scope-${id}`;

async function loadRecruitedAgentScopes<T extends { id: string }>(contests: T[]): Promise<Array<T & { recruitedAgentScope: string }>> {
  if (!contests.length) return [];
  const keys = contests.map((contest) => recruitedAgentScopeKey(contest.id));
  let settings: Array<{ key: string; value: string | null }> = [];
  try {
    settings = await db.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
  } catch (error) {
    console.warn('[contest recruitedAgentScope] fallback read failed:', (error as Error)?.message);
  }
  const byKey = new Map(settings.map((item) => [item.key, item.value]));
  return contests.map((contest) => ({
    ...contest,
    recruitedAgentScope: byKey.get(recruitedAgentScopeKey(contest.id)) === 'tvvm' ? 'tvvm' : 'all',
  }));
}

async function saveRecruitedAgentScope(id: string, value: unknown): Promise<void> {
  const normalized = value === 'tvvm' ? 'tvvm' : 'all';
  await db.setting.upsert({
    where: { key: recruitedAgentScopeKey(id) },
    update: { value: normalized },
    create: { key: recruitedAgentScopeKey(id), value: normalized },
  });
}

const posterKey = (id: string) => `contest-poster-${id}`;
const posterPublicUrl = (contest: Pick<PosterContest, 'id' | 'updatedAt'>) =>
  `/api/poster-image/${encodeURIComponent(posterKey(contest.id))}?v=${contest.updatedAt ? new Date(contest.updatedAt).getTime() : Date.now()}`;

async function ensurePosterTable(): Promise<void> {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PosterImage" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "data" BYTEA NOT NULL,
      "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function parsePosterDataUrl(value: string): { data: Buffer; contentType: string } | null {
  const match = value.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  try {
    const data = Buffer.from(match[2], 'base64');
    if (!data.length) return null;
    return { data, contentType: match[1] || 'image/jpeg' };
  } catch {
    return null;
  }
}

async function persistContestPoster(id: string, value: string): Promise<string> {
  if (!value.startsWith('data:')) return value;
  const parsed = parsePosterDataUrl(value);
  if (!parsed) return value;
  await ensurePosterTable();
  await db.$executeRawUnsafe(
    `INSERT INTO "PosterImage" ("key", "data", "contentType", "updatedAt")
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT ("key") DO UPDATE
     SET "data" = EXCLUDED."data", "contentType" = EXCLUDED."contentType", "updatedAt" = NOW()`,
    posterKey(id), parsed.data, parsed.contentType,
  );
  return `/api/poster-image/${encodeURIComponent(posterKey(id))}`;
}

async function normalizePoster<T extends PosterContest>(contest: T): Promise<T & { posterUrl: string }> {
  const source = contest.posterUrl || createDefaultContestPoster(contest);
  if (!source.startsWith('data:')) return { ...contest, posterUrl: source };
  try {
    const storedUrl = await persistContestPoster(contest.id, source);
    if (storedUrl !== source) {
      const updated = await db.contest.update({ where: { id: contest.id }, data: { posterUrl: storedUrl }, select: contestCompatSelect });
      return { ...contest, ...updated, posterUrl: posterPublicUrl(updated) } as T & { posterUrl: string };
    }
  } catch (error) {
    console.error('[contest-poster] migrate failed:', error);
  }
  return { ...contest, posterUrl: source };
}

const summaryWithPosterUrl = <T extends PosterContest>(contest: T) => ({
  ...contest,
  posterUrl: posterPublicUrl(contest),
});

const isSaoVietTrackingContest = (contest: { title?: string | null }) => {
  return !isChotContestTitle(contest.title);
};

async function ensureTopNColumns(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topN" INTEGER NOT NULL DEFAULT 3');
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topNMinIP" DOUBLE PRECISION NOT NULL DEFAULT 50000000');
  } catch (e) {
    console.warn('[ensureTopNColumns] Skipped:', (e as Error)?.message);
  }
}

async function ensureFilterByEffectiveDateColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "filterByEffectiveDate" BOOLEAN NOT NULL DEFAULT false');
  } catch (e) {
    console.warn('[ensureFilterByEffectiveDateColumn] Skipped:', (e as Error)?.message);
  }
}

async function ensureTopNValueTypeColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topNValueType" TEXT NOT NULL DEFAULT \'ip\'');
  } catch (e) {
    console.warn('[ensureTopNValueTypeColumn] Skipped:', (e as Error)?.message);
  }
}

async function ensureRecruitedAgentScopeColumn(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "recruitedAgentScope" TEXT NOT NULL DEFAULT \'all\'');
  } catch (e) {
    console.warn('[ensureRecruitedAgentScopeColumn] Skipped:', (e as Error)?.message);
  }
}

async function readContests(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const summary = request.nextUrl.searchParams.get('summary') === '1';
  const saoVietView = request.nextUrl.searchParams.get('view') === 'saoviet';
  const scope = request.nextUrl.searchParams.get('scope');
  const archiveYearParam = request.nextUrl.searchParams.get('year');
  const archiveYear = archiveYearParam ? Number.parseInt(archiveYearParam, 10) : null;
  if (id) {
    const contest = await db.contest.findUnique({ where: { id }, select: contestCompatSelect });
    if (!contest) return NextResponse.json({ error: 'Không tìm thấy chương trình thi đua' }, { status: 404 });
    const [withScope] = await loadRecruitedAgentScopes([contest]);
    return NextResponse.json(await normalizePoster(withScope), { headers: noStore });
  }
  const contests = await db.contest.findMany({
    orderBy: { createdAt: 'desc' },
    select: summary ? contestSummarySelect : contestCompatSelect,
  });
  const scopedContests = contests.filter((contest) => {
    if (saoVietView) return isSaoVietTrackingContest(contest);
    if (scope === 'active') return !isChotContestTitle(contest.title);
    if (scope === 'archive') {
      if (!isChotContestTitle(contest.title)) return false;
      return archiveYear === null || !Number.isFinite(archiveYear)
        ? true
        : getContestArchiveYear(contest) === archiveYear;
    }
    return true;
  });
  const scopedWithScope = await loadRecruitedAgentScopes(scopedContests as any[]);
  if (summary) {
    return NextResponse.json(scopedWithScope.map(summaryWithPosterUrl), { headers: noStore });
  }
  const normalized = await Promise.all(scopedWithScope.map((contest: any) => normalizePoster(contest)));
  return NextResponse.json(normalized, { headers: noStore });
}

export async function GET(request: NextRequest) {
  try {
    return await readContests(request);
  } catch (error) {
    console.warn('[GET /api/contests] First attempt failed, trying self-heal:', (error as Error)?.message);
    await Promise.all([ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn(), ensureRecruitedAgentScopeColumn()]);
    try {
      return await readContests(request);
    } catch (retryError) {
      console.error('Error fetching contests after self-heal:', retryError);
      return NextResponse.json({ error: 'Không thể tải danh sách chương trình thi đua', details: (retryError as Error)?.message }, { status: 500 });
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const {
      title, startDate, endDate, issueDate, conditionType, targetType,
      bonusTiers, posterUrl, participants,
      usePhase2, phase2StartDate, phase2EndDate, bonusTiers2,
      useSecondaryCondition, secondaryAFYPMin, secondaryIPMin,
      secondaryLuotHDMin, secondaryLuotHDCMin,
      secondaryLuotHDFilter, secondaryLuotHDCFilter,
      secondaryTotalAFYPMin, secondaryTotalIPMin,
      hideNotAchieved, includeIndividualNTD, includeIndividualTN,
      luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
      referenceContestId, includeTNInPassCount,
      topN, topNMinIP, topNValueType, filterByEffectiveDate, recruitedAgentScope,
    } = body as any;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    await Promise.all([ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn(), ensureRecruitedAgentScopeColumn()]);
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return NextResponse.json({ error: 'Ngày bắt đầu/kết thúc không hợp lệ' }, { status: 400 });
    }

    const existing = await db.contest.findFirst({ where: { title }, select: { id: true, posterUrl: true } });
    const rawPoster = posterUrl || createDefaultContestPoster({ title, startDate: parsedStart, endDate: parsedEnd, targetType });
    const temporaryPoster = rawPoster.startsWith('data:')
      ? (existing?.posterUrl && !existing.posterUrl.startsWith('data:') ? existing.posterUrl : '')
      : rawPoster;

    const data = {
      title,
      startDate: parsedStart,
      endDate: parsedEnd,
      issueDate: issueDate ? new Date(issueDate) : null,
      conditionType,
      targetType: targetType || 'tvv',
      bonusTiers,
      posterUrl: temporaryPoster,
      participants: participants || '[]',
      usePhase2: usePhase2 ?? false,
      phase2StartDate: phase2StartDate ? new Date(phase2StartDate) : null,
      phase2EndDate: phase2EndDate ? new Date(phase2EndDate) : null,
      bonusTiers2: bonusTiers2 || '[]',
      useSecondaryCondition: useSecondaryCondition ?? false,
      secondaryAFYPMin: secondaryAFYPMin ?? 0,
      secondaryIPMin: secondaryIPMin ?? 0,
      secondaryLuotHDMin: secondaryLuotHDMin ?? 0,
      secondaryLuotHDCMin: secondaryLuotHDCMin ?? 0,
      secondaryLuotHDFilter: secondaryLuotHDFilter || 'all',
      secondaryLuotHDCFilter: secondaryLuotHDCFilter || 'all',
      secondaryTotalAFYPMin: secondaryTotalAFYPMin ?? 0,
      secondaryTotalIPMin: secondaryTotalIPMin ?? 0,
      hideNotAchieved: hideNotAchieved ?? false,
      includeIndividualNTD: includeIndividualNTD ?? false,
      includeIndividualTN: includeIndividualTN ?? false,
      luotHDThreshold: luotHDThreshold ?? 3_000_000,
      luotHDCTThreshold: luotHDCTThreshold ?? 12_000_000,
      tvv90MaxMonths: tvv90MaxMonths ?? 3,
      tvv90MinIP: tvv90MinIP ?? 12_000_000,
      referenceContestId: referenceContestId || '',
      includeTNInPassCount: includeTNInPassCount ?? false,
      topN: topN ?? 3,
      topNMinIP: topNMinIP ?? 50_000_000,
      topNValueType: topNValueType === 'afyp' ? 'afyp' : 'ip',
      filterByEffectiveDate: filterByEffectiveDate ?? false,
    };

    let contest = existing
      ? await db.contest.update({ where: { id: existing.id }, data, select: contestCompatSelect })
      : await db.contest.create({ data, select: contestCompatSelect });

    await saveRecruitedAgentScope(contest.id, recruitedAgentScope);

    if (rawPoster.startsWith('data:')) {
      const storedUrl = await persistContestPoster(contest.id, rawPoster);
      contest = await db.contest.update({ where: { id: contest.id }, data: { posterUrl: storedUrl }, select: contestCompatSelect });
    }

    console.log('[POST /api/contests] Saved', contest.id, `${Date.now() - startTime}ms`);
    return NextResponse.json({
      message: existing ? 'Đã cập nhật chương trình thi đua' : 'Đã lưu chương trình thi đua',
      contest: { ...contest, recruitedAgentScope: recruitedAgentScope === 'tvvm' ? 'tvvm' : 'all', posterUrl: posterPublicUrl(contest) },
    });
  } catch (error: any) {
    console.error('[POST /api/contests] Error:', error);
    return NextResponse.json({ error: 'Không thể lưu chương trình thi đua', details: error?.message || String(error), code: error?.code }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    const result = await db.contest.deleteMany({ where: { id } });
    try {
      await db.$executeRawUnsafe('DELETE FROM "PosterImage" WHERE "key" = $1', posterKey(id));
    } catch {}
    try {
      await db.setting.deleteMany({ where: { key: recruitedAgentScopeKey(id) } });
    } catch {}
    return NextResponse.json({ message: 'Đã xóa chương trình thi đua', deleted: result.count > 0, alreadyDeleted: result.count === 0 }, { headers: noStore });
  } catch (error: any) {
    return NextResponse.json({ error: 'Không thể xóa chương trình thi đua', details: error?.message || String(error), code: error?.code }, { status: 500, headers: noStore });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: any };
    if (!id) return NextResponse.json({ error: 'Thiếu ID chương trình thi đua' }, { status: 400 });
    const recruitedAgentScopeUpdate = updates.recruitedAgentScope;
    delete updates.recruitedAgentScope;
    if (typeof updates.posterUrl === 'string' && updates.posterUrl.startsWith('data:')) {
      updates.posterUrl = await persistContestPoster(id, updates.posterUrl);
    }
    const contest = await db.contest.update({ where: { id }, data: updates, select: contestCompatSelect });
    if (recruitedAgentScopeUpdate !== undefined) await saveRecruitedAgentScope(id, recruitedAgentScopeUpdate);
    const [withScope] = await loadRecruitedAgentScopes([contest]);
    return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest: { ...withScope, posterUrl: posterPublicUrl(contest) } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Không thể cập nhật chương trình thi đua', details: error?.message }, { status: 500 });
  }
}
