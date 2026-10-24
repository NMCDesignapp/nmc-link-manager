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
export type RegisteredResult = RegisteredTarget & { leaderCode: string; leaderName: string; leaderPosition: string; actual: number; ip: number; afyp: number; percent: number; tier: TargetReward | null; bonus: number };
export function computeRegisteredResults(contracts: Contract[], config: ContestConfig, program: RegisteredProgram, structure: {agentCode:string;maBanNhom?:string}[] = [], leaders: RegisteredLeader[] = []): RegisteredResult[] {
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
    const bonus = !tier || tier.type === 'gift' ? 0 : tier.type === 'percent_ip' ? ip * tier.amount / 100 : tier.type === 'percent_afyp' ? afyp * tier.amount / 100 : tier.amount;
    const leader = program.scope === 'nhom' ? registeredGroupLeader(row.code, leaders) : null;
    return {...row, leaderCode: targetCode(leader?.agentCode), leaderName: leader?.agentName || '', leaderPosition: leader?.chucVu || leader?.position || '', actual, ip, afyp, percent, tier, bonus};
  });
}
export function registeredExportRows(rows: RegisteredResult[], program: RegisteredProgram) {
  return [['STT','Nhóm',program.scope === 'nhom' ? 'Mã TN' : 'Mã TVV',program.scope === 'nhom' ? 'Họ tên TN' : 'Họ tên TVV',program.scope === 'nhom' ? 'Chức vụ TN' : 'Chức vụ','Mục tiêu đăng ký (đ)',`Thực hiện ${program.metric.toUpperCase()} (đ)`,'Tỷ lệ HT (%)','Tiền thưởng (đ)','Quà / Ghi chú'], ...rows.map(r => [r.stt,r.group,program.scope==='nhom'?(r.leaderCode||'—'):r.code,program.scope==='nhom'?(r.leaderName||'Chưa có TN trong Cấu trúc'):r.name,program.scope==='nhom'?(r.leaderPosition||'—'):r.position,r.target,r.actual,r.percent,r.bonus,r.tier?.type === 'gift' ? r.tier.text : r.tier ? 'Đạt' : 'Chưa đạt'])];
}
