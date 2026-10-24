'use client';
import React, { useMemo, useState } from 'react';
import { type RegisteredProgram, parseTargetSheet, registeredClassColor } from '@/lib/contest-registered-targets';
import { computeRegisteredResults, registeredExportRows, registeredGroupLeader, type RegisteredLeader, type RegisteredResult } from '@/lib/contest-registered-results';
import { type ContestConfig, type Contract } from '@/lib/contest-calculator';
const number = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 0});
export async function exportRegisteredTargets(rows: RegisteredResult[], program: RegisteredProgram, title: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(registeredExportRows(rows, program));
  sheet['!cols'] = [6,22,18,28,22,25,25,18,24,28].map(wch => ({wch}));
  for (let r = 1; r <= rows.length; r++) for (const c of [5,6,8]) { const cell = sheet[XLSX.utils.encode_cell({r,c})]; if (cell) cell.z = '#,##0" đ"'; }
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, sheet, 'Ket qua');
  XLSX.writeFile(wb, `${title.replace(/[\\/:*?"<>|]/g, '_') || 'Muc_tieu_dang_ky'}.xlsx`);
}
export function RegisteredTargetSetup({value,onChange,leaders=[]}:{value: RegisteredProgram;onChange:(p: RegisteredProgram)=>void;leaders?:RegisteredLeader[]}) {
  const [rewardGroup,setRewardGroup] = useState<1|2|3>(1);
  const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  const change = (patch: Partial<RegisteredProgram>) => onChange({...value,...patch});
  const input = 'rounded border border-emerald-500/40 bg-slate-900 text-white p-2 min-w-0 w-full';
  const numeric = (v: string) => Math.max(0, Number(v) || 0);
  return <section className="space-y-3 text-sm text-emerald-100" aria-label="Thi đua mục tiêu đăng ký">
    <p>Nhập Excel: STT – Nhóm – Mã số – Họ tên TVV – Chức vụ – Mục tiêu đăng ký – Phân loại. Mục tiêu và tiền thưởng nhập bằng đồng.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label>Đối tượng từ Excel<select aria-label="Đối tượng từ Excel" className={input} value={value.scope} onChange={e=>change({scope:e.target.value as 'tvv'|'nhom'})}><option value="tvv">TVV — cộng theo mã TVV</option><option value="nhom">Nhóm — cộng theo mã nhóm</option></select></label>
      <label>Số liệu so với mục tiêu<select aria-label="Số liệu so với mục tiêu" className={input} value={value.metric} onChange={e=>change({metric:e.target.value as 'ip'|'afyp'})}><option value="ip">Tổng IP trong kỳ (đ)</option><option value="afyp">Tổng AFYP trong kỳ (đ)</option></select></label>
    </div>
    <p className="text-xs">Cột Mã số phải là {value.scope==='nhom'?'mã nhóm; mỗi nhóm một dòng':'mã TVV; mỗi TVV một dòng'}. Ghép doanh số theo mã, không theo tên. Kỳ tính dùng ngày hiệu lực / phát hành phía trên.</p>
    <div className="flex flex-wrap gap-3 items-center">
      <label className="cursor-pointer rounded bg-emerald-700 px-3 py-2">{busy?'Đang đọc…':'Nạp Excel đối tượng'}<input aria-label="Nạp Excel đối tượng" type="file" accept=".xlsx,.xls" className="sr-only" disabled={busy} onChange={async e=>{
        const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);setMessage('');
        try {if(file.size>5*1024*1024)throw Error('File tối đa 5 MB.');const XLSX=await import('xlsx');const book=XLSX.read(await file.arrayBuffer(),{type:'array'});const rows=parseTargetSheet(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:'',raw:false}) as unknown[][]);change({rows});setMessage(`Đã nạp ${rows.length} đối tượng. Dữ liệu cũ chỉ được thay khi toàn bộ file hợp lệ.`);}catch(err){setMessage(String((err as Error).message));}finally{setBusy(false);}
      }}/></label>
      <button type="button" className="underline" onClick={async()=>{const X=await import('xlsx');const b=X.utils.book_new();X.utils.book_append_sheet(b,X.utils.aoa_to_sheet([['STT','Nhóm','Mã số','Họ tên TVV','Chức vụ','Mục tiêu đăng ký','Phân loại']]),'Doi tuong');X.writeFile(b,'Mau_doi_tuong_thi_dua.xlsx');}}>Tải file mẫu</button>
      <span>{value.rows.length} đối tượng</span>
    </div>
    {message&&<p role="status" className="text-amber-200">{message}</p>}
    {value.rows.length>0&&<div className="max-h-48 overflow-auto rounded border border-emerald-500/30"><table className="w-full text-xs"><thead><tr>{['STT','Nhóm',value.scope==='nhom'?'Mã TN':'Mã TVV',value.scope==='nhom'?'Họ tên TN':'Họ tên TVV','Chức vụ','Mục tiêu (đ)'].map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr></thead><tbody>{value.rows.slice(0,50).map(r=>{const leader=value.scope==='nhom'?registeredGroupLeader(r.code,leaders):null;return <tr key={r.code} style={{backgroundColor:registeredClassColor(r.classification)}}><td className="p-2">{r.stt}</td><td>{r.group}</td><td>{value.scope==='nhom'?(leader?.agentCode||'—'):r.code}</td><td>{value.scope==='nhom'?(leader?.agentName||'Chưa có TN trong Cấu trúc'):r.name}</td><td>{value.scope==='nhom'?(leader?.chucVu||leader?.position||'—'):r.position}</td><td className="text-right pr-2">{number(r.target)} đ</td></tr>})}</tbody></table></div>}
    <div className="grid sm:grid-cols-2 gap-3"><label>Chỉ tính HĐ có IP từ (đ)<input aria-label="IP mỗi HĐ từ (đ)" className={input} type="number" min="0" value={value.minIP} onChange={e=>change({minIP:numeric(e.target.value)})}/></label><label>Chỉ tính HĐ có AFYP từ (đ)<input aria-label="AFYP mỗi HĐ từ (đ)" className={input} type="number" min="0" value={value.minAFYP} onChange={e=>change({minAFYP:numeric(e.target.value)})}/></label></div>
    <p className="text-xs">Cột Phân loại nhập 1, 2 hoặc 3 để chọn bộ thưởng riêng; không hiển thị trong bảng hoặc Excel kết quả.</p>
    <div className="flex gap-2 flex-wrap" aria-label="Chọn nhóm thưởng">{([1,2,3] as const).map(g=><button type="button" key={g} aria-pressed={rewardGroup===g} onClick={()=>setRewardGroup(g)} className={`rounded border px-3 py-2 ${rewardGroup===g?'bg-amber-600 border-amber-300 text-white':'border-emerald-500/40'}`}>Nhóm thưởng {g} ({value.rows.filter(r=>(r.classification??1)===g).length})</button>)}</div>
    <p className="font-bold">Nhóm thưởng {rewardGroup} · Mức thưởng theo tỷ lệ hoàn thành mục tiêu (%)</p><p className="text-xs">Chọn mức cao nhất đã đạt, không cộng dồn các mức. So sánh trên số thực tế, trước khi làm tròn.</p>
    {value.tiers.filter(t=>(t.classification??1)===rewardGroup).map((t,i)=><div key={t.id} className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded border border-emerald-500/30 p-2">
      <label>Tỷ lệ từ (%)<input aria-label={`Tỷ lệ mức ${i+1}`} className={input} type="number" min="0.01" step="0.01" value={t.minPercent} onChange={e=>change({tiers:value.tiers.map(v=>v.id===t.id?{...v,minPercent:numeric(e.target.value)}:v)})}/></label>
      <label>Hình thức<select aria-label={`Thưởng mức ${i+1}`} className={input} value={t.type} onChange={e=>change({tiers:value.tiers.map(v=>v.id===t.id?{...v,type:e.target.value as typeof t.type}:v)})}><option value="money">Tiền (đ)</option><option value="gift">Quà</option><option value="percent_ip">% IP thực hiện</option><option value="percent_afyp">% AFYP thực hiện</option></select></label>
      <label>{t.type==='gift'?'Quà':t.type==='money'?'Số tiền (đ)':'Tỷ lệ thưởng (%)'}<input aria-label={`Giá trị thưởng mức ${i+1}`} className={input} type={t.type==='gift'?'text':'number'} min="0" value={t.type==='gift'?t.text:t.amount} onChange={e=>change({tiers:value.tiers.map(v=>v.id===t.id?{...v,...(t.type==='gift'?{text:e.target.value}:{amount:numeric(e.target.value)})}:v)})}/></label>
      <button type="button" className="text-red-300" onClick={()=>change({tiers:value.tiers.filter(v=>v.id!==t.id)})}>Xóa mức {i+1}</button>
    </div>)}
    <button type="button" className="underline" onClick={()=>change({tiers:[...value.tiers,{id:crypto.randomUUID(),classification:rewardGroup,minPercent:120,type:'money',amount:0,text:''}]})}>Thêm mức thưởng nhóm {rewardGroup}</button>
    <label className="flex gap-2"><input type="checkbox" checked={value.hideNotAchieved} onChange={e=>change({hideNotAchieved:e.target.checked})}/>Ẩn đối tượng chưa đạt</label>
  </section>;
}
export function RegisteredTargetResults({program,contracts,config,title,posterUrl='',structure=[],leaders=[]}:{program:RegisteredProgram;contracts:Contract[];config:ContestConfig;title:string;posterUrl?:string;structure?:{agentCode:string;maBanNhom?:string}[];leaders?:RegisteredLeader[]}) {
  const [page,setPage]=useState(0);
  const [query,setQuery]=useState(''); const [error,setError]=useState('');
  const all=useMemo(()=>computeRegisteredResults(contracts,config,program,structure,leaders),[contracts,config,program,structure,leaders]);
  const rows=all.filter(r=>(!program.hideNotAchieved||r.tier)&&`${r.group} ${program.scope==='nhom'?r.leaderCode:r.code} ${program.scope==='nhom'?r.leaderName:r.name}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const currentPage=Math.min(page,Math.max(0,Math.ceil(rows.length/100)-1));
  const visibleRows=rows.slice(currentPage*100,(currentPage+1)*100);
  return <section className="bg-white text-slate-800" data-registered-target-results data-saoviet-table={config.id ? `saved-${config.id}` : undefined} data-nmc-kpi-detail-shell="saved-contest">
    <div className="p-3 bg-emerald-950 text-white"><h2 className="font-bold text-lg">{title}</h2><p>{String(config.startDate||'').slice(0,10)} – {String(config.endDate||'').slice(0,10)} · Theo {program.scope==='nhom'?'mã nhóm':'mã TVV'} · {program.metric.toUpperCase()} (đ)</p></div>
    {posterUrl&&<img src={posterUrl} alt={title} className="max-h-64 w-full object-contain"/>}
    <div className="p-2 flex gap-2 flex-wrap"><input aria-label="Tìm đối tượng đăng ký" placeholder="Tìm nhóm, mã, họ tên" className="p-2 border rounded text-slate-900" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><button type="button" className="border rounded px-3" onClick={()=>{void exportRegisteredTargets(rows,program,title).catch(e=>setError(String(e)));}}>Tải Excel kết quả</button></div>
    {error&&<p role="alert">{error}</p>}
    <div className="overflow-auto"><table className="w-full text-xs border-collapse"><thead className="bg-emerald-900 text-yellow-100"><tr>{registeredExportRows([],program)[0].map((h,i)=><th key={i} className="p-2 border border-emerald-700 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{visibleRows.map(r=><tr key={r.code} className="border-b-2 border-slate-300" style={{backgroundColor:registeredClassColor(r.classification)}}>{[r.stt,r.group,program.scope==='nhom'?(r.leaderCode||'—'):r.code,program.scope==='nhom'?(r.leaderName||'Chưa có TN trong Cấu trúc'):r.name,program.scope==='nhom'?(r.leaderPosition||'—'):r.position,`${number(r.target)} đ`,`${number(r.actual)} đ`,`${r.percent.toLocaleString('vi-VN',{maximumFractionDigits:2})}%`,`${number(r.bonus)} đ`,r.tier?.type==='gift'?r.tier.text:r.tier?'Đạt':`Chưa đạt · còn ${number(Math.max(0,Math.min(...program.tiers.filter(t=>(t.classification??1)===(r.classification??1)).map(t=>r.target*t.minPercent/100))-r.actual))} đ`].map((v,i)=><td key={i} className={`p-2 whitespace-nowrap ${i>=5?'text-center':''} ${i===9?(r.tier?'font-bold text-emerald-700':'italic text-red-600'):''}`}>{v}</td>)}</tr>)}</tbody></table></div>
    {rows.length>100&&<div className="p-2 flex justify-center gap-3"><button type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Trước</button><span>Trang {currentPage+1}/{Math.ceil(rows.length/100)} · {rows.length} đối tượng</span><button type="button" disabled={(currentPage+1)*100>=rows.length} onClick={()=>setPage(currentPage+1)}>Sau</button></div>}
    {!rows.length&&<p className="p-4 text-center">Chưa có đối tượng phù hợp.</p>}
    <p className="p-3 font-semibold border-t bg-emerald-50">Tổng đối tượng: {all.length} · Đạt: {all.filter(r=>r.tier).length} · Tổng mục tiêu: {number(all.reduce((s,r)=>s+r.target,0))} đ · Thực hiện: {number(all.reduce((s,r)=>s+r.actual,0))} đ · Tổng thưởng: {number(all.reduce((s,r)=>s+r.bonus,0))} đ</p>
  </section>;
}
