type RevenueMetadataRow = {
  contractNumber?: string | null;
  position?: string | null;
  ban?: string | null;
  nhom?: string | null;
  maNhom?: string | null;
  ad?: string | null;
  maDaiLyTD?: string | null;
  recruiterCode?: string | null;
  ngayBatDauLamViec?: Date | string | null;
  startDate?: Date | string | null;
  chucVu2?: string | null;
};

const present = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '';

/**
 * NEW_KPI04 owns dates and production values. Existing rows are only evidence
 * for descriptive fields that must not shift when the historical source changes.
 */
export function preserveHistoricalRevenueMetadata<T extends RevenueMetadataRow>(
  incoming: T[],
  previous: RevenueMetadataRow[],
): number {
  const byContract = new Map<string, RevenueMetadataRow>();
  for (const row of previous) {
    const contract = String(row.contractNumber || '').trim();
    if (!contract || byContract.has(contract)) continue;
    byContract.set(contract, row);
  }

  let changedRows = 0;
  for (const row of incoming) {
    const contract = String(row.contractNumber || '').trim();
    const old = contract ? byContract.get(contract) : undefined;
    if (!old) continue;
    let changed = false;
    for (const field of ['position', 'ban', 'nhom', 'maNhom', 'ad', 'maDaiLyTD', 'recruiterCode',
      'ngayBatDauLamViec', 'startDate', 'chucVu2'] as const) {
      if (present(old[field]) && row[field] !== old[field]) {
        (row as Record<string, unknown>)[field] = old[field];
        changed = true;
      }
    }
    if (changed) changedRows++;
  }
  return changedRows;
}
