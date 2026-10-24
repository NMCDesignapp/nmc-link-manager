import { parseBusinessNumber } from './parse-business-number.ts';
export type RegisteredTarget = { stt: string; group: string; code: string; name: string; position: string; target: number; classification?: 1 | 2 | 3 };
export type TargetReward = { id: string; classification?: 1 | 2 | 3; minPercent: number; type: 'money' | 'gift' | 'percent_ip' | 'percent_afyp'; amount: number; text: string };
export type RegisteredProgram = { kind: 'registered-target-v1'; scope: 'tvv' | 'nhom'; metric: 'ip' | 'afyp'; rows: RegisteredTarget[]; tiers: TargetReward[]; minIP: number; minAFYP: number; hideNotAchieved: boolean };
export const targetCode = (v: unknown) => String(v ?? '').trim().toUpperCase();
const header = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]/g, '');
const columns = ['stt', 'nhom', 'maso', 'hotentvv', 'chucvu', 'muctieudangky', 'phanloai'];
export function parseTargetSheet(data: unknown[][]): RegisteredTarget[] {
  const at = data.findIndex(row => columns.every(c => row.map(header).includes(c)));
  if (at < 0) throw new Error('Thiếu cột: STT, Nhóm, Mã số, Họ tên TVV, Chức vụ, Mục tiêu đăng ký, Phân loại.');
  const keys = data[at].map(header); const seen = new Set<string>(); const rows: RegisteredTarget[] = [];
  for (let i = at + 1; i < data.length; i++) {
    const r = data[i]; if (r.every(v => v === '' || v == null)) continue;
    const cell = (key: string) => r[keys.indexOf(key)];
    const code = targetCode(cell('maso')); const raw = cell('muctieudangky');
    const value = parseBusinessNumber(raw);
    const classification = Number(String(cell('phanloai') ?? '').trim());
    if (![1,2,3].includes(classification)) throw Error(`Dòng ${i + 1}: Phân loại chỉ nhận 1, 2 hoặc 3.`);
    if (!code || !String(cell('hotentvv') ?? '').trim() || !String(cell('nhom') ?? '').trim()) throw new Error(`Dòng ${i + 1}: thiếu mã số, nhóm hoặc họ tên.`);
    if (seen.has(code)) throw new Error(`Dòng ${i + 1}: mã số ${code} bị trùng.`);
    if (!(value > 0) || !Number.isSafeInteger(value) || (typeof raw === 'string' && !/^[\d\s.,đĐ₫VNDvnd]+$/.test(raw.trim()))) throw new Error(`Dòng ${i + 1}: mục tiêu phải là số tiền nguyên dương theo đồng.`);
    seen.add(code); rows.push({ stt: String(cell('stt') ?? rows.length + 1), group: String(cell('nhom')).trim(), code, name: String(cell('hotentvv')).trim(), position: String(cell('chucvu') ?? '').trim(), target: value, classification: classification as 1 | 2 | 3 });
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
      if (![1,2,3].includes(r.classification ?? 1)) throw Error('Phân loại đối tượng phải là 1, 2 hoặc 3.');
      seen.add(code);
    }
    if (!p.rows.length || !p.tiers.length || p.rows.length > 5000 || p.tiers.some((t: TargetReward) => ![1,2,3].includes(t.classification ?? 1) || !['money','gift','percent_ip','percent_afyp'].includes(t.type) || !Number.isFinite(t.minPercent) || t.minPercent <= 0 || !Number.isFinite(t.amount) || t.amount < 0)) throw Error('Mức thưởng không hợp lệ.');
    if (new Set(p.tiers.map((t: TargetReward) => `${t.classification ?? 1}:${t.minPercent}`)).size !== p.tiers.length || p.tiers.some((t: TargetReward) => t.type === 'gift' && !t.text.trim())) throw Error('Mốc tỷ lệ bị trùng hoặc chưa nhập tên quà.');
    if (p.rows.some((r: RegisteredTarget) => !p.tiers.some((t: TargetReward) => (t.classification ?? 1) === (r.classification ?? 1)))) throw Error('Chưa cài mức thưởng cho một phân loại trong file.');
    if (![p.minIP,p.minAFYP].every(v => Number.isFinite(v) && v >= 0)) throw Error('Ngưỡng IP/AFYP không hợp lệ.');
    return { ...p, rows: p.rows.map((r: RegisteredTarget) => ({...r, code: targetCode(r.code), classification: r.classification ?? 1})) };
  } catch (e) { if (typeof raw === 'string' && !raw.includes('registered-target-v1')) return null; throw e; }
}
export const defaultRegisteredProgram = (): RegisteredProgram => ({ kind: 'registered-target-v1', scope: 'tvv', metric: 'ip', rows: [], minIP: 0, minAFYP: 0, hideNotAchieved: false, tiers: ([1,2,3] as const).map(classification => ({ id: `target-${classification}-100`, classification, minPercent: 100, type: 'money' as const, amount: 0, text: '' })) });

/** Apply the same tint to every cell of a classification row. */
export const registeredClassColor = (classification: number = 1): string => ({1:'#ffffff',2:'#eff6ff',3:'#fff7ed'}[classification] || '#ffffff');
