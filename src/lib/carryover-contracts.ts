/** Isolated contest-only snapshots. Never add these rows to revenue/Contract. */
export const CARRYOVER_SETTING_PREFIX = 'nmc-carryover-contracts:';
export function bangkokMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}
export type ContestSourceRow = { id?: string; contractNumber?: string | null; nguonDuLieu?: string; carryoverMonth?: string; issueDate?: string | null };
export function contractIdentity(row: ContestSourceRow): string {
  return row.contractNumber?.trim() || row.nguonDuLieu?.match(/(?:^|\|)SO_HD_GOC:([^|]+)/)?.[1]?.trim() || '';
}
/** Called AFTER date/condition filtering, so an updated issue date can fill a historical blank. */
export function selectContestSourceRows<T extends ContestSourceRow>(rows: T[], hasIssueDateCondition: boolean): T[] {
  const ordinary = rows.filter(row => !row.carryoverMonth && (!hasIssueDateCondition || Boolean(row.issueDate && Number.isFinite(new Date(row.issueDate).getTime()))));
  if (!hasIssueDateCondition) return ordinary;
  const seen = new Set(ordinary.map(contractIdentity).filter(Boolean));
  const result = [...ordinary];
  for (const row of rows) {
    if (!row.carryoverMonth || !row.issueDate || !Number.isFinite(new Date(row.issueDate).getTime())) continue;
    const key = contractIdentity(row);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    result.push(row);
  }
  return result;
}
