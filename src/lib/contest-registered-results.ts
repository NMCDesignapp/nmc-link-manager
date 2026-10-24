import { filterContractsByContest, type Contract, type ContestConfig } from './contest-calculator.ts';
import { targetCode, type RegisteredProgram, type RegisteredTarget, type TargetReward } from './contest-registered-targets.ts';
export type RegisteredResult = RegisteredTarget & { actual: number; ip: number; afyp: number; percent: number; tier: TargetReward | null; bonus: number };
export function computeRegisteredResults(contracts: Contract[], config: ContestConfig, program: RegisteredProgram, structure: {agentCode:string;maBanNhom?:string}[] = []): RegisteredResult[] {
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
    const tier = [...program.tiers].sort((a,b) => b.minPercent - a.minPercent).find(t => actual * 100 >= row.target * t.minPercent) || null;
    const bonus = !tier || tier.type === 'gift' ? 0 : tier.type === 'percent_ip' ? ip * tier.amount / 100 : tier.type === 'percent_afyp' ? afyp * tier.amount / 100 : tier.amount;
    return {...row, actual, ip, afyp, percent, tier, bonus};
  });
}
export function registeredExportRows(rows: RegisteredResult[], program: RegisteredProgram) {
  return [['STT','Nhóm',program.scope === 'nhom' ? 'Mã nhóm' : 'Mã TVV','Họ tên TVV','Chức vụ','Mục tiêu đăng ký (đ)',`Thực hiện ${program.metric.toUpperCase()} (đ)`,'Tỷ lệ HT (%)','Tiền thưởng (đ)','Quà / Ghi chú'], ...rows.map(r => [r.stt,r.group,r.code,r.name,r.position,r.target,r.actual,r.percent,r.bonus,r.tier?.type === 'gift' ? r.tier.text : r.tier ? 'Đạt' : 'Chưa đạt'])];
}
