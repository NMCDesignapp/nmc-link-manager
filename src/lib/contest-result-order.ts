const normalizedTitle = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/gi, 'd')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase();

export function usesMienTayDaySongTvvOrder(
  title: string,
  conditionType: string,
  targetType: string,
): boolean {
  return targetType === 'tvv'
    && conditionType === 'total_ip'
    && normalizedTitle(title).startsWith('mien tay day song');
}

export function achievedFirstThenIp<T>(
  rows: readonly T[],
  isAchieved: (row: T) => boolean,
  getIp: (row: T) => number,
): T[] {
  return rows
    .map((row, index) => ({ row, index, achieved: isAchieved(row), ip: getIp(row) }))
    .sort((a, b) => Number(b.achieved) - Number(a.achieved) || b.ip - a.ip || a.index - b.index)
    .map(({ row }) => row);
}
