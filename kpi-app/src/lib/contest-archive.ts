export interface ContestArchiveEntry {
  id: string;
  title: string;
  startDate: string | Date;
  endDate?: string | Date;
}

export interface ContestArchiveMonth<T extends ContestArchiveEntry> {
  key: string;
  month: number | null;
  label: string;
  contests: T[];
}

const stripVietnameseMarks = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, match => match === 'Đ' ? 'D' : 'd');

export const isChotContestTitle = (title?: string | null): boolean => (
  stripVietnameseMarks(String(title || '').trimStart())
    .toLocaleUpperCase('vi-VN')
    .startsWith('CHOT')
);

const contestStartTime = (contest: ContestArchiveEntry): number => {
  const value = new Date(contest.startDate).getTime();
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

export const getContestArchiveYear = (contest: ContestArchiveEntry): number | null => {
  const date = new Date(contest.startDate);
  return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
};

export function groupChotContestsByMonth<T extends ContestArchiveEntry>(
  contests: T[],
  year: number,
): ContestArchiveMonth<T>[] {
  const monthBuckets = new Map<number | null, T[]>();
  for (const contest of contests) {
    if (!isChotContestTitle(contest.title)) continue;
    const date = new Date(contest.startDate);
    const validDate = !Number.isNaN(date.getTime());
    if (validDate && date.getUTCFullYear() !== year) continue;
    if (!validDate && year !== 0) continue;
    const month = validDate ? date.getUTCMonth() + 1 : null;
    const bucket = monthBuckets.get(month) || [];
    bucket.push(contest);
    monthBuckets.set(month, bucket);
  }

  return Array.from(monthBuckets.entries())
    .sort(([monthA], [monthB]) => (monthB ?? -1) - (monthA ?? -1))
    .map(([month, entries]) => ({
      key: month === null ? 'unknown' : `${year}-${String(month).padStart(2, '0')}`,
      month,
      label: month === null ? 'Không rõ ngày bắt đầu' : `Tháng ${month}`,
      contests: [...entries].sort((a, b) => contestStartTime(b) - contestStartTime(a)),
    }));
}

export function createYearArchivePayload<T extends ContestArchiveEntry>(
  contests: T[],
  year: number,
) {
  const archivedContests = contests
    .filter(contest => isChotContestTitle(contest.title) && getContestArchiveYear(contest) === year)
    .sort((a, b) => contestStartTime(a) - contestStartTime(b));

  return {
    format: 'nmc-contest-chot-archive-v1',
    year,
    exportedAt: new Date().toISOString(),
    count: archivedContests.length,
    contests: archivedContests,
  };
}
