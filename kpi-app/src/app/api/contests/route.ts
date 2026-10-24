import { decodeRegisteredProgram } from '@/lib/contest-registered-targets';
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
  topN: true, topNMinIP: true, topNValueType: true, useTopRanking: true, topRewardAmounts: true, filterByEffectiveDate: true,
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
const recruitmentConfigKey = (id: string) => `contest-recruitment-config-${id}`;

type ExtraContractCount = { secondaryContractCountMin: number; secondaryContractIPMin: number; tvvContractCountMin: number };
const secondaryContractCountKey = (id: string) => `contest-secondary-contract-count-${id}`;
// Tương thích schema hiện tại: lưu mốc cuối Ngày phát hành theo từng chương trình,
// không thêm cột Prisma hoặc thay dữ liệu của các chương trình đã tồn tại.
const issueEndDateKey = (id: string) => `contest-issue-end-date-${id}`;
function normalizeIssueEndDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const date = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}
async function loadIssueEndDates<T extends { id: string }>(
  contests: T[],
): Promise<Array<T & { issueEndDate: string | null }>> {
  if (!contests.length) return [];
  const keys = contests.map(contest => issueEndDateKey(contest.id));
  const settings = await db.setting.findMany({
    where: { key: { in: keys } }, select: { key: true, value: true },
  });
  const values = new Map(settings.map(setting => [setting.key, setting.value]));
  return contests.map(contest => ({
    ...contest,
    issueEndDate: normalizeIssueEndDate(values.get(issueEndDateKey(contest.id))),
  }));
}
async function saveIssueEndDate(id: string, value: string | null): Promise<void> {
  const key = issueEndDateKey(id);
  const normalized = normalizeIssueEndDate(value);
  await db.setting.upsert({
    where: { key },
    update: { value: normalized || '' },
    create: { key, value: normalized || '' },
  });
}
const nonNegativeNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};
const normalizeExtraContractCount = (value: any): ExtraContractCount => ({
  tvvContractCountMin: Math.max(1, Math.floor(nonNegativeNumber(value?.tvvContractCountMin) || 2)),
  secondaryContractCountMin: Math.floor(nonNegativeNumber(value?.secondaryContractCountMin)),
  secondaryContractIPMin: nonNegativeNumber(value?.secondaryContractIPMin),
});
async function loadExtraContractCount<T extends { id: string }>(contests: T[]): Promise<Array<T & ExtraContractCount>> {
  if (!contests.length) return [];
  const keys = contests.map(contest => secondaryContractCountKey(contest.id));
  const settings = await db.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } });
  const byKey = new Map(settings.map(item => [item.key, item.value]));
  return contests.map(contest => {
    let stored: unknown = null;
    try { stored = JSON.parse(byKey.get(secondaryContractCountKey(contest.id)) || 'null'); } catch {}
    return { ...contest, ...normalizeExtraContractCount(stored) };
  });
}
async function saveExtraContractCount(id: string, value: ExtraContractCount): Promise<ExtraContractCount> {
  const normalized = normalizeExtraContractCount(value);
  const key = secondaryContractCountKey(id);
  const raw = JSON.stringify(normalized);
  await db.setting.upsert({ where: { key }, update: { value: raw }, create: { key, value: raw } });
  return normalized;
}


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

async function loadRecruitmentConfigs<T extends { id: string }>(contests: T[]): Promise<Array<T & { recruitmentConfig: unknown }>> {
  if (!contests.length) return [];
  const keys = contests.map(contest => recruitmentConfigKey(contest.id));
  const settings: Array<{ key: string; value: string | null }> = await db.setting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } }).catch(() => []);
  const byKey = new Map<string, string | null>(settings.map(item => [item.key, item.value] as const));
  return contests.map(contest => {
    const raw = byKey.get(recruitmentConfigKey(contest.id));
    try { return { ...contest, recruitmentConfig: raw ? JSON.parse(raw) : null }; }
    catch { return { ...contest, recruitmentConfig: null }; }
  });
}

async function saveRecruitmentConfig(id: string, value: unknown): Promise<void> {
  await db.setting.upsert({
    where: { key: recruitmentConfigKey(id) },
    update: { value: JSON.stringify(value || null) },
    create: { key: recruitmentConfigKey(id), value: JSON.stringify(value || null) },
  });
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

// nmc-contest-combined-top-ranking-v1
async function ensureCombinedTopRankingColumns(): Promise<void> {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "useTopRanking" BOOLEAN NOT NULL DEFAULT false');
    await db.$executeRawUnsafe('ALTER TABLE "Contest" ADD COLUMN IF NOT EXISTS "topRewardAmounts" TEXT NOT NULL DEFAULT \'[]\'');
  } catch (e) {
    console.warn('[ensureCombinedTopRankingColumns] Skipped:', (e as Error)?.message);
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
    const [withRecruitment] = await loadRecruitmentConfigs([withScope]);
    const [withExtraCount] = await loadExtraContractCount([withRecruitment]);
    const [withIssueEnd] = await loadIssueEndDates([withExtraCount]);
    return NextResponse.json(await normalizePoster(withIssueEnd), { headers: noStore });
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
  const scopedWithRecruitment = await loadRecruitmentConfigs(scopedWithScope);
  const scopedWithExtraCount = await loadExtraContractCount(scopedWithRecruitment);
  const scopedWithIssueEnd = await loadIssueEndDates(scopedWithExtraCount);
  if (summary) {
    return NextResponse.json(scopedWithIssueEnd.map(summaryWithPosterUrl), { headers: noStore });
  }
  const normalized = await Promise.all(scopedWithIssueEnd.map((contest: any) => normalizePoster(contest)));
  return NextResponse.json(normalized, { headers: noStore });
}

export async function GET(request: NextRequest) {
  try {
    return await readContests(request);
  } catch (error) {
    console.warn('[GET /api/contests] First attempt failed, trying self-heal:', (error as Error)?.message);
    await Promise.all([ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn(), ensureCombinedTopRankingColumns(), ensureRecruitedAgentScopeColumn()]);
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
      title, startDate, endDate, issueDate, issueEndDate, conditionType, targetType,
      bonusTiers, posterUrl, participants,
      usePhase2, phase2StartDate, phase2EndDate, bonusTiers2,
      useSecondaryCondition, secondaryAFYPMin, secondaryIPMin,
      secondaryLuotHDMin, secondaryLuotHDCMin,
      secondaryLuotHDFilter, secondaryLuotHDCFilter,
      secondaryTotalAFYPMin, secondaryTotalIPMin,
      secondaryContractCountMin, secondaryContractIPMin, tvvContractCountMin,
      hideNotAchieved, includeIndividualNTD, includeIndividualTN,
      luotHDThreshold, luotHDCTThreshold, tvv90MaxMonths, tvv90MinIP,
      referenceContestId, includeTNInPassCount,
      topN, topNMinIP, topNValueType, useTopRanking, topRewardAmounts, filterByEffectiveDate, recruitedAgentScope, recruitmentConfig,
    } = body as any;

    if (!title || !startDate || !endDate) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    await Promise.all([ensureTopNColumns(), ensureFilterByEffectiveDateColumn(), ensureTopNValueTypeColumn(), ensureCombinedTopRankingColumns(), ensureRecruitedAgentScopeColumn()]);
    const normalizedIssueEnd = normalizeIssueEndDate(issueEndDate);
    if (issueEndDate != null && issueEndDate !== '' && normalizedIssueEnd === null) {
      return NextResponse.json({ error: 'Ngày phát hành đến không hợp lệ' }, { status: 400 });
    }
    if (normalizedIssueEnd && issueDate && normalizedIssueEnd < String(issueDate).slice(0, 10)) {
      return NextResponse.json({ error: 'Ngày phát hành đến phải từ ngày phát hành bắt đầu trở đi' }, { status: 400 });
    }
    try { decodeRegisteredProgram(participants); } catch (error) { return NextResponse.json({error: (error as Error).message}, {status:400}); }

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
      useTopRanking: useTopRanking ?? false,
      topRewardAmounts: typeof topRewardAmounts === 'string' ? topRewardAmounts : JSON.stringify(topRewardAmounts || []),
      filterByEffectiveDate: filterByEffectiveDate ?? false,
    };

    let contest = existing
      ? await db.contest.update({ where: { id: existing.id }, data, select: contestCompatSelect })
      : await db.contest.create({ data, select: contestCompatSelect });

    await saveRecruitedAgentScope(contest.id, recruitedAgentScope);
    await saveRecruitmentConfig(contest.id, recruitmentConfig);
    const extraContractCount = await saveExtraContractCount(contest.id, { secondaryContractCountMin, secondaryContractIPMin, tvvContractCountMin });
    // Nếu trình chỉnh sửa khác chưa hỗ trợ trường mới, không xóa mốc đã lưu.
    if (Object.prototype.hasOwnProperty.call(body, 'issueEndDate')) {
      await saveIssueEndDate(contest.id, normalizedIssueEnd);
    }
    const [withIssueEnd] = await loadIssueEndDates([{ id: contest.id }]);

    if (rawPoster.startsWith('data:')) {
      const storedUrl = await persistContestPoster(contest.id, rawPoster);
      contest = await db.contest.update({ where: { id: contest.id }, data: { posterUrl: storedUrl }, select: contestCompatSelect });
    }

    console.log('[POST /api/contests] Saved', contest.id, `${Date.now() - startTime}ms`);
    return NextResponse.json({
      message: existing ? 'Đã cập nhật chương trình thi đua' : 'Đã lưu chương trình thi đua',
      contest: { ...contest, ...extraContractCount, issueEndDate: withIssueEnd.issueEndDate, recruitedAgentScope: recruitedAgentScope === 'tvvm' ? 'tvvm' : 'all', recruitmentConfig: recruitmentConfig || null, posterUrl: posterPublicUrl(contest) },
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
      await db.setting.deleteMany({ where: { key: recruitmentConfigKey(id) } });
      await db.setting.deleteMany({ where: { key: secondaryContractCountKey(id) } });
      await db.setting.deleteMany({ where: { key: issueEndDateKey(id) } });
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
    if (updates.participants !== undefined) { try { decodeRegisteredProgram(updates.participants); } catch(error) { return NextResponse.json({error:(error as Error).message},{status:400}); } }
    const recruitmentConfigUpdate = updates.recruitmentConfig;
    const tvvCountUpdate = updates.tvvContractCountMin;
    delete updates.tvvContractCountMin;
    const extraCountUpdate = updates.secondaryContractCountMin;
    const extraIPUpdate = updates.secondaryContractIPMin;
    const issueEndUpdate = updates.issueEndDate;
    const normalizedIssueEnd = normalizeIssueEndDate(issueEndUpdate);
    if (issueEndUpdate !== undefined && issueEndUpdate !== null && issueEndUpdate !== '' && !normalizedIssueEnd) {
      return NextResponse.json({ error: 'Ngày phát hành đến không hợp lệ' }, { status: 400 });
    }
    delete updates.recruitedAgentScope;
    delete updates.recruitmentConfig;
    delete updates.secondaryContractCountMin;
    delete updates.secondaryContractIPMin;
    delete updates.issueEndDate;
    if (typeof updates.posterUrl === 'string' && updates.posterUrl.startsWith('data:')) {
      updates.posterUrl = await persistContestPoster(id, updates.posterUrl);
    }
    const contest = await db.contest.update({ where: { id }, data: updates, select: contestCompatSelect });
    if (recruitedAgentScopeUpdate !== undefined) await saveRecruitedAgentScope(id, recruitedAgentScopeUpdate);
    if (recruitmentConfigUpdate !== undefined) await saveRecruitmentConfig(id, recruitmentConfigUpdate);
    if (issueEndUpdate !== undefined) await saveIssueEndDate(id, normalizedIssueEnd);
    if (extraCountUpdate !== undefined || extraIPUpdate !== undefined || tvvCountUpdate !== undefined) {
      const [current] = await loadExtraContractCount([{ id }]);
      await saveExtraContractCount(id, {
        tvvContractCountMin: tvvCountUpdate ?? current.tvvContractCountMin,
        secondaryContractCountMin: extraCountUpdate ?? current.secondaryContractCountMin,
        secondaryContractIPMin: extraIPUpdate ?? current.secondaryContractIPMin,
      });
    }
    const [withScope] = await loadRecruitedAgentScopes([contest]);
    const [withRecruitment] = await loadRecruitmentConfigs([withScope]);
    const [withExtraCount] = await loadExtraContractCount([withRecruitment]);
    const [withIssueEnd] = await loadIssueEndDates([withExtraCount]);
    return NextResponse.json({ message: 'Đã cập nhật chương trình thi đua', contest: { ...withIssueEnd, posterUrl: posterPublicUrl(contest) } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Không thể cập nhật chương trình thi đua', details: error?.message }, { status: 500 });
  }
}

