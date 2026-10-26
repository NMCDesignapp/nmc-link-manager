'use client';
import { useRegisteredFyp } from '@/hooks/use-registered-fyp';
import { useContestApprovals } from '@/hooks/use-contest-approvals';
import React, { useMemo, useState } from 'react';
import { type RegisteredProgram, parseTargetSheet, registeredClassColor } from '@/lib/contest-registered-targets';
import { computeRegisteredResults, registeredExportRows, registeredGroupLeader, registeredRewardDisplay, type RegisteredLeader, type RegisteredResult } from '@/lib/contest-registered-results';
import { type ContestConfig, type Contract } from '@/lib/contest-calculator';
const number = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 0});
export async function exportRegisteredTargets(rows: RegisteredResult[], program: RegisteredProgram, title: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(registeredExportRows(rows, program));
  sheet['!cols'] = [6,18,16,26,27,29,23,23,17,28].map(wch => ({wch}));
  for (let r = 1; r <= rows.length; r++) for (const c of [4,6,7,9]) { const cell = sheet[XLSX.utils.encode_cell({r,c})]; if (cell) cell.z = '#,##0" đ"'; }
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
    <p>Nhập Excel: Nhóm – Mã số – Họ tên – Mục tiêu đăng ký. Có thể thêm Phân loại 1/2/3; nếu không có thì dùng nhóm thưởng 1. STT tự đánh. Mục tiêu và tiền thưởng nhập bằng đồng.</p>
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
      <button type="button" className="underline" onClick={async()=>{const X=await import('xlsx');const b=X.utils.book_new();X.utils.book_append_sheet(b,X.utils.aoa_to_sheet([['Nhóm','Mã số','Họ tên','Mục tiêu đăng ký','Phân loại']]),'Doi tuong');X.writeFile(b,'Mau_doi_tuong_thi_dua.xlsx');}}>Tải file mẫu</button>
      <span>{value.rows.length} đối tượng</span>
    </div>
    {message&&<p role="status" className="text-amber-200">{message}</p>}
    {value.rows.length>0&&<div className="max-h-48 overflow-auto rounded border border-emerald-500/30"><table className="w-full text-xs"><thead><tr>{['STT','Nhóm',value.scope==='nhom'?'Mã TN':'Mã TVV',value.scope==='nhom'?'Họ tên TN':'Họ tên TVV','Mục tiêu (đ)'].map(h=><th key={h} className="p-2 text-left">{String(h).split('\n').map((line,j)=><span key={j} className={j===0?'block font-bold uppercase':'block italic font-bold text-amber-200'}>{line}</span>)}</th>)}</tr></thead><tbody>{value.rows.slice(0,50).map(r=>{const leader=value.scope==='nhom'?registeredGroupLeader(r.code,leaders):null;return <tr key={r.code} style={{backgroundColor:registeredClassColor(r.classification)}}><td className="p-2">{r.stt}</td><td>{r.group}</td><td>{value.scope==='nhom'?(leader?.agentCode||'—'):r.code}</td><td>{value.scope==='nhom'?(leader?.agentName||'Chưa có TN trong Cấu trúc'):r.name}</td><td className="text-right pr-2">{number(r.target)} đ</td></tr>})}</tbody></table></div>}
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
  const saoViet = useRegisteredFyp();
  const approval = useContestApprovals(config.id);
  const [page,setPage]=useState(0);
  const [query,setQuery]=useState('');
  const [descending,setDescending]=useState(true);
  const [error,setError]=useState('');
  const all=useMemo(
    ()=>computeRegisteredResults(contracts,config,program,structure,leaders,saoViet.rows,approval.approvals),
    [contracts,config,program,structure,leaders,saoViet.rows,approval.approvals]
  );
  const rows=useMemo(()=>all.filter(r=>
    (!program.hideNotAchieved||r.achievedTarget)&&
    `${r.group} ${program.scope==='nhom'?r.leaderCode:r.code} ${program.scope==='nhom'?r.leaderName:r.name}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
  ).sort((a,b)=>{
    const aFyp=a.cumulativeFyp??Number.NEGATIVE_INFINITY;
    const bFyp=b.cumulativeFyp??Number.NEGATIVE_INFINITY;
    if(aFyp!==bFyp) return descending ? bFyp-aFyp : aFyp-bFyp;
    if(a.percent!==b.percent) return descending ? b.percent-a.percent : a.percent-b.percent;
    return a.code.localeCompare(b.code,'vi');
  }),[all,program.hideNotAchieved,program.scope,query,descending]);
  const currentPage=Math.min(page,Math.max(0,Math.ceil(rows.length/100)-1));
  const visibleRows=rows.slice(currentPage*100,(currentPage+1)*100);
  const headers=registeredExportRows([],program)[0];
  const rewarded=all.filter(r=>r.tier);
  const grandBonus=all.reduce((total,r)=>total+r.bonus,0);
  const fmtPct=(v:number)=>v.toLocaleString('vi-VN',{maximumFractionDigits:2})+'%';
  return <section className="bg-white text-slate-800" data-registered-target-results data-saoviet-table={config.id ? `saved-${config.id}` : undefined} data-nmc-kpi-detail-shell="saved-contest">
    <div className="px-3 py-3 bg-emerald-950 text-white">
      <h2 className="font-bold text-lg">{title}</h2>
      <p className="text-sm">{String(config.startDate||'').slice(0,10)} – {String(config.endDate||'').slice(0,10)} · Theo {program.scope==='nhom'?'mã nhóm':'mã TVV'} · {program.metric.toUpperCase()}</p>
    </div>
    {posterUrl&&<img src={posterUrl} alt={title} className="max-h-64 w-full object-contain"/>}
    <div className="p-2 flex gap-2 flex-wrap items-center">
      <input aria-label="Tìm đối tượng đăng ký" placeholder="Tìm nhóm, mã, họ tên" className="p-2 border rounded text-slate-900" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/>
      <button type="button" disabled={saoViet.loading||approval.loading||Boolean(approval.error)} className="border rounded px-3 py-2" onClick={()=>{void exportRegisteredTargets(rows,program,title).catch(e=>setError(String(e)));}}>Tải Excel kết quả</button>
      <button type="button" className="border rounded px-2 py-2 text-xs" onClick={()=>{setDescending(!descending);setPage(0);}} aria-label="Đổi thứ tự FYP lũy kế và tiến độ">{descending?'FYP ↓ · HT ↓':'FYP ↑ · HT ↑'}</button>
      <span className="ml-auto text-xs font-semibold text-slate-600">Đơn vị tính: đồng</span>
    </div>
    {saoViet.loading&&<p role="status" className="px-3 py-1 text-xs">Đang tải FYP Sao Việt…</p>}
    {approval.loading&&<p role="status" className="px-3 py-1 text-xs">Đang tải điều kiện duyệt…</p>}
    {saoViet.error&&<p role="alert" className="px-3 py-1 text-red-700">{saoViet.error}</p>}
    {approval.error&&<p role="alert" className="px-3 py-1 text-red-700">{approval.error}</p>}
    {error&&<p role="alert" className="px-3 py-1 text-red-700">{error}</p>}
    <div className="overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-emerald-900 text-yellow-100"><tr>
          {headers.map((h,i)=><th key={i} className="p-2 border border-emerald-700 text-center font-bold align-middle min-w-[55px]">
            {String(h).split('\n').map((line,j)=><span key={j} className={j===0?'block uppercase':'block italic'} style={i===4&&j===1?{color:'#ff6666',fontWeight:800}:undefined}>{line}</span>)}
          </th>)}
        </tr></thead>
        <tbody>{visibleRows.map(r=>{
          const values=[r.stt,r.group,program.scope==='nhom'?(r.leaderCode||'—'):r.code,program.scope==='nhom'?(r.leaderName||'Chưa có TN trong Cấu trúc'):r.name,
            r.cumulativeFyp===null?(saoViet.loading?'Đang tải…':'Chưa có dữ liệu'):`${number(r.cumulativeFyp)} đ`,
            '',
            `${number(r.target)} đ`,`${number(r.actual)} đ`,fmtPct(r.percent),registeredRewardDisplay(r)];
          return <tr key={r.code} style={{backgroundColor:registeredClassColor(r.classification)}} className="border-b border-slate-300">
            {values.map((v,i)=><td key={i} className={`p-2 border-x border-slate-200 align-middle ${i>=4?'text-center':''} ${i===6||i===7?'font-bold text-blue-800':''} ${i===8?`font-bold ${r.percent>=100?'text-green-800':'text-red-700'}`:''} ${i===9?(r.tier?'font-bold text-green-800':r.achievedTarget?'text-red-700 italic text-[10px]':'text-slate-600 italic'):''}`}>
              {i===5 ? approval.admin && config.id ? <button type="button" title={r.approved?'Bỏ duyệt Sao Việt/nâng hạng':'Duyệt Sao Việt/nâng hạng'} aria-label={`${r.approved?'Bỏ duyệt':'Duyệt'} ${r.code}`} aria-pressed={r.approved} disabled={Boolean(approval.savingCode)||approval.loading} onClick={()=>void approval.setApproved(r.code,!r.approved)} className={`inline-flex h-5 w-5 items-center justify-center rounded border text-sm ${r.approved?'bg-green-700 text-white border-green-700':'bg-white border-slate-400 text-transparent hover:border-green-600'}`}>✓</button> : r.approved ? <span className="inline-block font-black text-green-700 text-lg" aria-label="Đã đạt điều kiện">✓</span> : null
              :i===9&&r.tier?<span className="inline-flex items-center justify-center gap-1"><span className="text-[11px] leading-none" aria-hidden="true">{r.tier.type==='gift'?'🎁':'🏅'}</span><span>{typeof v==='number'?`${number(v)} đ`:r.tier.type==='gift'?v:`${number(r.bonus)} đ`}</span></span>
              :v}
            </td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>
    {rows.length>100&&<div className="p-2 flex justify-center gap-3"><button type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Trước</button><span>Trang {currentPage+1}/{Math.ceil(rows.length/100)} · {rows.length} đối tượng</span><button type="button" disabled={(currentPage+1)*100>=rows.length} onClick={()=>setPage(currentPage+1)}>Sau</button></div>}
    {!rows.length&&<p className="p-4 text-center">Chưa có đối tượng phù hợp.</p>}
    <p className="p-3 font-semibold border-t bg-emerald-50">
      Tổng đối tượng: {all.length} · Đủ mục tiêu tháng 10: {all.filter(r=>r.achievedTarget).length} · Đủ cả 2 điều kiện: {rewarded.length}
      {' '}· Tổng mục tiêu: {number(all.reduce((sum,r)=>sum+r.target,0))} đ · Thực hiện: {number(all.reduce((sum,r)=>sum+r.actual,0))} đ · Tổng thưởng: {number(grandBonus)} đ
    </p>
  </section>;
}
