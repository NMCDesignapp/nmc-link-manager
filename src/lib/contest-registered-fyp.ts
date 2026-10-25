import type { Contract } from './contest-calculator.ts';
import { targetCode } from './contest-registered-targets.ts';
export type SaoVietPersonalRow = { agentCode?: string; fyp?: number | string | null };
/** September baseline: the personal Sao Viet source minus ordinary October 2026 IP. */
export function registeredFypBaseline(contracts: Contract[], rows: SaoVietPersonalRow[] | null): Map<string, number | null> {
  const fyp = new Map<string, number | null>();
  if (!rows) return fyp;
  for (const row of rows) {
    const key = targetCode(row.agentCode);
    if (!key) continue;
    const value = row.fyp === '' || row.fyp == null ? NaN : Number(row.fyp);
    fyp.set(key, fyp.has(key) || !Number.isFinite(value) ? null : value);
  }
  const october = new Map<string, number>();
  for (const c of contracts) {
    if (c.carryoverMonth) continue;
    const source = String(c.nguonDuLieu || '').match(/^NMC_(?:TAMTHU|DOANHSO):(\d{4}-\d{2})(?:\||$)/);
    const date = c.issueDate || c.effectiveDate;
    const month = source?.[1] || (date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString().slice(0,7) : '');
    if (month !== '2026-10') continue;
    const code = targetCode(c.agentCode);
    if (code) october.set(code, (october.get(code) || 0) + (Number(c.pdt10DT) || 0));
  }
  for (const [code, total] of fyp) if (total !== null) fyp.set(code, total - (october.get(code) || 0));
  return fyp;
}
