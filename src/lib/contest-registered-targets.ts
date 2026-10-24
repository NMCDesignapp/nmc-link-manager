import { parseBusinessNumber } from './parse-business-number.ts';
export type RegisteredTarget = { stt: string; group: string; code: string; name: string; position: string; target: number };
export type TargetReward = { id: string; minPercent: number; type: 'money' | 'gift' | 'percent_ip' | 'percent_afyp'; amount: number; text: string };
export type RegisteredProgram = { kind: 'registered-target-v1'; scope: 'tvv' | 'nhom'; metric: 'ip' | 'afyp'; rows: RegisteredTarget[]; tiers: TargetReward[]; minIP: number; minAFYP: number; hideNotAchieved: boolean };
export const targetCode = (v: unknown) => String(v ?? '').trim().toUpperCase();
const header = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');
const columns = ['stt', 'nhom', 'maso', 'hotentvv', 'chucvu', 'muctieudangky'];
export function parseTargetSheet(data: unknown[][]): RegisteredTarget[] {
  const at = data.findIndex(row => columns.every(c => row.map(header).includes(c)));
  if (at < 0) throw new Error('Thiếu cột: STT, Nhóm, Mã số, Họ tên TVV, Chức vụ, Mục tiêu đăng ký.');
  const keys = data[at].map(header); const seen = new Set<string>(); const rows: RegisteredTarget[] = [];
  for (let i = at + 1; i < data.length; i++) {
    const r = data[i]; if (r.every(v => v === '' || v == null)) continue;
    const cell = (key: string) => r[keys.indexOf(key)];
    const code = targetCode(cell('maso')); const raw = cell('muctieudangky');
    const value = parseBusinessNumber(raw);
    if (!code || !String(cell('hotentvv') ?? '').trim() || !String(cell('nhom') ?? '').trim()) throw new Error(`Dòng ${i + 1}: thiếu mã số, nhóm hoặc họ tên.`);
    if (seen.has(code)) throw new Error(`Dòng ${i + 1}: mã số ${code} bị trùng.`);
    if (!(value > 0) || !Number.isSafeInteger(value) || (typeof raw === 'string' && !/^[\d\s.,đĐ₫VNDvnd]+$/.test(raw.trim()))) throw new Error(`Dòng ${i + 1}: mục tiêu phải là số tiền nguyên dương theo đồng.`);
    seen.add(code); rows.push({ stt: String(cell('stt') ?? rows.length + 1), group: String(cell('nhom')).trim(), code, name: String(cell('hotentvv')).trim(), position: String(cell('chucvu') ?? '').trim(), target: value });
  }
  if (!rows.length) throw new Error('File chưa có đối tượng thi đua.');
  if (rows.length > 5000) throw new Error('Tối đa 5.000 đối tượng mỗi chương trình.');
  return rows;
}
export function decodeRegisteredProgram(raw: unknown): RegisteredProgram | null {
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!p || p.kind !== 'registered-target-v1') return null;
    if (!['tvv','nhom'].includes(p.scope) || !['ip','afyp'].includes(p.metric) || !Array.isArray(p.rows) || !Array.isArray(p.tiers)) throw Error('Cấu hình mục tiêu đăng ký không hợp lệ.');
    const seen = new Set<string>();
    for (const r of p.rows) {
      const code = targetCode(r.code);
      if (!code || seen.has(code) || typeof r.name !== 'string' || typeof r.group !== 'string' || !Number.isSafeInteger(r.target) || r.target <= 0) throw Error('Danh sách mục tiêu không hợp lệ hoặc trùng mã.');
      seen.add(code);
    }
    if (!p.rows.length || !p.tiers.length || p.rows.length > 5000 || p.tiers.some((t: TargetReward) => !['money','gift','percent_ip','percent_afyp'].includes(t.type) || !Number.isFinite(t.minPercent) || t.minPercent <= 0 || !Number.isFinite(t.amount) || t.amount < 0)) throw Error('Mức thưởng không hợp lệ.');
    if (new Set(p.tiers.map((t: TargetReward) => t.minPercent)).size !== p.tiers.length || p.tiers.some((t: TargetReward) => t.type === 'gift' && !t.text.trim())) throw Error('Mốc tỷ lệ bị trùng hoặc chưa nhập tên quà.');
    if (![p.minIP,p.minAFYP].every(v => Number.isFinite(v) && v >= 0)) throw Error('Ngưỡng IP/AFYP không hợp lệ.');
    return { ...p, rows: p.rows.map((r: RegisteredTarget) => ({...r, code: targetCode(r.code)})) };
  } catch (e) { if (typeof raw === 'string' && !raw.includes('registered-target-v1')) return null; throw e; }
}
export const defaultRegisteredProgram = (): RegisteredProgram => ({ kind: 'registered-target-v1', scope: 'tvv', metric: 'ip', rows: [], minIP: 0, minAFYP: 0, hideNotAchieved: false, tiers: [{ id: 'target-100', minPercent: 100, type: 'money', amount: 0, text: '' }] });
