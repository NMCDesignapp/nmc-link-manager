export type Apm01GroupSourceRow = Record<string, unknown>;

export type ExistingAd = { maAD: string };
export type ExistingGroup = {
  id: string;
  maBanNhom: string;
  tenBanNhom: string;
  maAD: string;
};

export type PlannedGroup = {
  maBanNhom: string;
  tenBanNhom: string;
  maAD: string;
};

const text = (value: unknown): string => value == null ? '' : String(value).trim();

export function planApm01GroupSync(
  sourceRows: Apm01GroupSourceRow[],
  existingAds: ExistingAd[],
  existingGroups: ExistingGroup[],
) {
  const candidates = new Map<string, PlannedGroup>();

  for (const row of sourceRows) {
    const maAD = text(row['Mã AD']);
    if (!maAD) continue;

    const maBanNhom = text(row['Mã Ban/Nhóm']);
    const tenBanNhom = text(row['Tên Ban/Nhóm']);
    if (!maBanNhom || !tenBanNhom) {
      throw new Error(`APM01 có Mã AD ${maAD} nhưng thiếu mã hoặc tên Ban/Nhóm`);
    }

    const current = candidates.get(maBanNhom);
    if (current && (current.maAD !== maAD || current.tenBanNhom !== tenBanNhom)) {
      throw new Error(`APM01 có ánh xạ Ban/Nhóm mâu thuẫn: ${maBanNhom}`);
    }
    candidates.set(maBanNhom, { maBanNhom, tenBanNhom, maAD });
  }

  const knownAds = new Set(existingAds.map(ad => text(ad.maAD)).filter(Boolean));
  const unknownAds = [...new Set([...candidates.values()]
    .map(group => group.maAD)
    .filter(maAD => !knownAds.has(maAD)))];
  if (unknownAds.length) {
    throw new Error(`APM01 có Mã AD chưa tồn tại trong Cấu trúc: ${unknownAds.join(', ')}`);
  }

  const existingByCode = new Map(existingGroups.map(group => [text(group.maBanNhom), group]));
  const create: PlannedGroup[] = [];
  const update: Array<PlannedGroup & { id: string }> = [];
  const conflicts: Array<PlannedGroup & { currentMaAD: string }> = [];

  for (const candidate of candidates.values()) {
    const existing = existingByCode.get(candidate.maBanNhom);
    if (!existing) {
      create.push(candidate);
      continue;
    }
    const existingMaAD = text(existing.maAD);
    if (existingMaAD && existingMaAD !== candidate.maAD) {
      // APM01 only auto-adds new groups. Never overwrite an existing manual
      // assignment; surface it for reconciliation while the TVV sync continues.
      conflicts.push({ ...candidate, currentMaAD: existingMaAD });
      continue;
    }
    if (!existingMaAD) {
      update.push({ ...candidate, id: existing.id });
    }
  }

  return { create, update, conflicts, candidates: [...candidates.values()] };
}
