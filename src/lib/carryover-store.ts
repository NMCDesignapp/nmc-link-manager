import { db } from '@/lib/db';
import { CARRYOVER_SETTING_PREFIX } from '@/lib/carryover-contracts';

export async function readCarryoverSnapshots() {
  const settings = await db.setting.findMany({ where: { key: { startsWith: CARRYOVER_SETTING_PREFIX } }, select: { value: true }, orderBy: { key: 'desc' } });
  return settings.map(setting => {
    const snapshot = JSON.parse(setting.value || 'null');
    if (!snapshot || !/^\d{4}-(0[1-9]|1[0-2])$/.test(snapshot.month) || !Array.isArray(snapshot.contracts)) throw new Error('Dữ liệu HĐ tồn không hợp lệ');
    return snapshot as { month: string; updatedAt: string; contracts: any[] };
  });
}
