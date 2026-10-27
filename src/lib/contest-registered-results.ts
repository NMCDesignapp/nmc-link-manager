import { registeredFypBaseline, type SaoVietPersonalRow } from './contest-registered-fyp.ts';
import { filterContractsByContest, type Contract, type ContestConfig } from './contest-calculator.ts';
import { targetCode, type RegisteredProgram, type RegisteredTarget, type TargetReward } from './contest-registered-targets.ts';
export type RegisteredLeader = { agentCode?: string; agentName?: string; maNhom?: string; maBanNhom?: string; position?: string; chucVu?: string };
export function registeredGroupLeader(code: string, leaders: RegisteredLeader[]) {
  const matches = leaders.filter(l => targetCode(l.maBanNhom || l.maNhom) === targetCode(code));
  const isTN = (l: RegisteredLeader) => /^(tn|truong nhom)$/.test(String(l.chucVu || l.position || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim());
  const tn = matches.filter(isTN);
  const unique = new Map((tn.length ? tn : matches).filter(l=>targetCode(l.agentCode)).map(l=>[targetCode(l.agentCode),l]));
  return unique.size === 1 ? [...unique.values()][0] : null;
}
export type RegisteredResult = RegisteredTarget & { cumulativeFyp: number | null; leaderCode: string; leaderName: string; leaderPosition: string; actual: number; ip: number; afyp: number; percent: number; tier: TargetReward | null; achievedTarget: boolean; approved: boolean; bonus: number };
export function computeRegisteredResults(contracts: Contract[], config: ContestConfig, program: RegisteredProgram, structure: {agentCode:string;maBanNhom?:string}[] = [], leaders: RegisteredLeader[] = [], saoVietRows: SaoVietPersonalRow[] | null = null, approvals: Record<string, boolean> = {}): RegisteredResult[] {
  const baseline = registeredFypBaseline(contracts, saoVietRows);
  const eligible = filterContractsByContest(contracts, { ...config, usePhase2: false, useSecondaryCondition: false });
  const groups = new Map(structure.map(r => [targetCode(r.agentCode), targetCode(r.maBanNhom)]));
  const totals = new Map<string, {ip: number; afyp: number}>();
  for (const c of eligible) {
    if (c.pdt10DT < program.minIP || c.afyp < program.minAFYP) continue;
    const key = targetCode(program.scope === 'nhom' ? (c.maNhom || groups.get(targetCode(c.agentCode))) : c.agentCode);
    if (!key) continue;
    const total = totals.get(key) || {ip: 0, afyp: 0};
    total.ip += Number(c.pdt10DT) || 0; total.afyp += Number(c.afyp) || 0; totals.set(key, total);
  }
  return program.rows.map(row => {
    const {ip, afyp} = totals.get(targetCode(row.code)) || {ip: 0, afyp: 0};
    const actual = program.metric === 'ip' ? ip : afyp;
    const percent = actual / row.target * 100;
    // Compare unrounded values; a displayed rounded 100% must not create a reward.
    const tier = [...program.tiers].filter(t => (t.classification ?? 1) === (row.classification ?? 1)).sort((a,b) => b.minPercent - a.minPercent).find(t => actual * 100 >= row.target * t.minPercent) || null;
    const achievedTarget = actual >= row.target;
    const approved = approvals[targetCode(row.code)] === true;
    // Progress and contract totals remain unchanged; all rewards (cash, gift and %) require both conditions.
    const rewardTier = achievedTarget && approved ? tier : null;
    const bonus = !rewardTier || rewardTier.type === 'gift' ? 0 : rewardTier.type === 'percent_ip' ? ip * rewardTier.amount / 100 : rewardTier.type === 'percent_afyp' ? afyp * rewardTier.amount / 100 : rewardTier.amount;
    const leader = program.scope === 'nhom' ? registeredGroupLeader(row.code, leaders) : null;
    return {...row, cumulativeFyp: baseline.get(program.scope === 'nhom' ? targetCode(leader?.agentCode) : targetCode(row.code)) ?? null, leaderCode: targetCode(leader?.agentCode), leaderName: leader?.agentName || '', leaderPosition: leader?.chucVu || leader?.position || '', actual, ip, afyp, percent, tier: rewardTier, achievedTarget, approved, bonus};
  });
}
export const registeredHeaders = (program: RegisteredProgram) => [
  'STT','NHÓM',program.scope === 'nhom' ? 'MÃ TN' : 'MÃ SỐ',
  program.scope === 'nhom' ? 'HỌ TÊN TN' : 'HỌ TÊN',
  'FYP LŨY KẾ\n(01/12/2025 - 30/09/2026)',
  'ĐK ĐẠT SV',
  'MỤC TIÊU ĐĂNG KÝ',`${program.metric.toUpperCase()} THÁNG 10`,
  'TIẾN ĐỘ HT\nT10','TIỀN THƯỞNG'
];
export function registeredRewardDisplay(row: RegisteredResult, showShortfall = false): string | number {
  if (!row.achievedTarget) return showShortfall ? (row.actual - row.target).toLocaleString('vi-VN', {maximumFractionDigits: 0}) : 'Chưa đạt';
  if (!row.approved) return 'Chưa đạt SV/nâng hạng';
  if (row.tier?.type === 'gift') return row.tier.text;
  return row.tier ? row.bonus : 'Chưa đạt';
}
export function registeredExportRows(rows: RegisteredResult[], program: RegisteredProgram, showShortfall = false) {
  return [registeredHeaders(program), ...rows.map((r,index) => [
    index+1,r.group,program.scope==='nhom'?(r.leaderCode||'—'):r.code,
    program.scope==='nhom'?(r.leaderName||'Chưa có TN trong Cấu trúc'):r.name,
    r.cumulativeFyp ?? 'Chưa có dữ liệu',r.approved?'✓':'',
    r.target,r.actual,r.percent,registeredRewardDisplay(r, showShortfall)
  ])];
}
