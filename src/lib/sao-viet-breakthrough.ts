/** The three full-year programs remain the sole source of achievement. */
export type SVSourceRow = { agentCode?: string; agentName?: string; nhomKD?: string; fyp?: number; fypTVVm?: number; slTvvmHDC?: number };
export type SVTier = { label: string; min: number; vouchers: number };
export type SVRecruitTier = { label: string; minFyp: number; minHdc: number };
export type SVLeader = { agentCode: string; agentName: string; nhom: string; maNhom: string; position: string; ngayHieuLuc?: string | null };
export type SVAchiever = { code: string; name: string; group: string; notes: string[]; reward: number };
export type SVGroup = { key: string; name: string; leaderCode: string; leaderName: string; members: SVAchiever[]; leaderReward: number; issue: string };
const normalize = (value: string | undefined) => String(value || '').normalize('NFC').trim().toLocaleUpperCase('vi-VN');
// Only this contest uses the original groups. Never remap source programs or
// leaders themselves: the promoted TN is an achiever, not the root group's payee.
const originalGroup = (value: string | undefined): string => {
  const name = String(value || '').normalize('NFC').trim();
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toUpperCase();
  if (key === 'THANH CONG' || key === 'AN KHANG') return 'An Khang';
  if (key === 'NIEM TIN' || key === 'SAO CHO MOI') return 'Sao Chợ Mới';
  return name;
};
export function calculateSVBreakthrough(
  sources: Record<string, SVSourceRow[]>,
  personalTiers: SVTier[], businessTiers: SVTier[], recruitmentTiers: SVRecruitTier[],
  leaders: SVLeader[],
): SVGroup[] {
  const people = new Map<string, SVAchiever>();
  const add = (row: SVSourceRow, note: string) => {
    const code = normalize(row.agentCode);
    if (!code || !note) return;
    let person = people.get(code);
    if (!person) {
      person = { code, name: String(row.agentName || '').trim(), group: originalGroup(row.nhomKD), notes: [], reward: 0 };
      people.set(code, person);
    }
    if (!person.name) person.name = String(row.agentName || '').trim();
    if (!person.group) person.group = originalGroup(row.nhomKD);
    if (!person.notes.includes(note)) person.notes.push(note);
  };
  for (const [program, tiers, role] of [
    ['ca-nhan', personalTiers, 'Cá nhân'], ['tn-ktm', businessTiers, 'TN KTM'],
  ] as const) {
    for (const row of sources[program] || []) {
      // Highest achieved tier per role; lower tiers are not additional awards.
      const rank = [...tiers].sort((a, b) => b.min - a.min).find(tier => Number(row.fyp) >= tier.min);
      if (rank) add(row, `${role}: ${rank.label} (${rank.vouchers} vé)`);
    }
  }
  for (const row of sources['tn-td'] || []) {
    const rank = [...recruitmentTiers].sort((a, b) => b.minFyp - a.minFyp)
      .find(tier => Number(row.fypTVVm) >= tier.minFyp && Number(row.slTvvmHDC) >= tier.minHdc);
    if (rank) add(row, `TN tuyển dụng: ${rank.label}`);
  }
  const groups = new Map<string, SVGroup>();
  for (const person of people.values()) {
    const key = normalize(person.group) || '__UNASSIGNED__';
    let group = groups.get(key);
    if (!group) {
      const matches = leaders.filter(l => normalize(l.nhom) === key || normalize(l.maNhom) === key);
      const unique = [...new Map(matches.filter(l => normalize(l.agentCode)).map(l => [normalize(l.agentCode), l])).values()];
      const matched = unique.length === 1 ? unique[0] : undefined;
      // Only the role-effective date determines exclusion, never employment start.
      const date = String(matched?.ngayHieuLuc || '').trim();
      const excluded = /^2026-/.test(date) || /^\d{1,2}[/-]\d{1,2}[/-]2026$/.test(date);
      const leader = excluded ? undefined : matched;
      group = { key, name: person.group || 'Chưa có nhóm', leaderCode: leader ? normalize(leader.agentCode) : '', leaderName: leader?.agentName || '', members: [], leaderReward: 0,
        issue: excluded ? 'Chờ chỉ định TN nhận số lượng SV' : !person.group ? 'Chưa có nhóm trong nguồn Sao Việt' : unique.length > 1 ? 'Nhóm có nhiều TN, cần đối chiếu' : !leader ? 'Chưa đối chiếu được mã TN' : '' };
      groups.set(key, group);
    }
    group.members.push(person);
  }
  // Count people, never vouchers or roles. Compute before any UI filtering.
  for (const group of groups.values()) {
    const count = group.members.length;
    group.members.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    for (const person of group.members) person.reward = count >= 3 ? 10_000_000 : 3_000_000;
    group.leaderReward = group.leaderCode ? count * (count >= 3 ? 2_000_000 : 1_000_000) : 0;
  }
  const sorted = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  // Personal + management awards share the same 30m ceiling per normalized code.
  const paid = new Map([...people.values()].map(p => [p.code, p.reward]));
  for (const group of sorted) {
    if (!group.leaderCode) continue;
    const available = Math.max(0, 30_000_000 - (paid.get(group.leaderCode) || 0));
    group.leaderReward = Math.min(group.leaderReward, available);
    paid.set(group.leaderCode, (paid.get(group.leaderCode) || 0) + group.leaderReward);
  }
  return sorted;
}
