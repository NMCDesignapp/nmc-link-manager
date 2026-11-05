/**
 * DMS local bridge for NC-Link Data Hub. No network calls or database writes.
 * Only the minimal structure and Tamthu columns leave this module.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import XLSX from 'xlsx';

const TRANSFORMS=new Set(['apm01-tvv','apm01-leaders','apm01-recruiters','bc02-sheet2','bc02-sheet4']);
const REMOVED=new Set(['từ chối','ycbh hết hiệu lực','trì hoãn','hết hiệu lực']);
const HEADERS=['STT','Ban','Nhóm','Mã Ban/Nhóm','Mã ĐL','Tên','Chức vụ','Ngày bắt đầu làm việc',
'Số hợp đồng','Ngày hiệu lực','Ngày phát hành','PĐT + 10% ĐT','AFYP','AD','TÍNH LƯỢT 3 tr','MÃ ĐL TD'];
const clean=v=>String(v??'').trim();
const lower=v=>clean(v).normalize('NFC').toLocaleLowerCase('vi-VN');
const ident=v=>clean(v).toUpperCase();
const pick=(row,...fields)=>{for(const f of fields)if(clean(row[f]))return clean(row[f]);return '';};
const amount=v=>{
  if(typeof v==='number'&&Number.isFinite(v))return v;
  const s=clean(v);
  if(!s)return 0;
  const result=Number(s.replace(/[\s,]/g,''));
  if(!Number.isFinite(result))throw Error('BC02 có số tiền không hợp lệ');
  return result;
};
function required(rows,fields,context){
  if(!rows.length)throw Error(context+' rỗng');
  const found=new Set(Object.keys(rows[0]).map(lower));
  const absent=fields.filter(f=>!found.has(lower(f)));
  if(absent.length)throw Error(context+' thiếu cột '+absent.join(', '));
}
async function stable(file){
  if(!/\.xlsx$/i.test(file)||path.basename(file).startsWith('~$'))throw Error('Tệp DMS không hợp lệ');
  const a=await fs.stat(file);
  if(!a.isFile()||a.size<1000)throw Error('DMS chưa ghi xong báo cáo');
  await new Promise(r=>setTimeout(r,700));
  const b=await fs.stat(file);
  if(a.size!==b.size||a.mtimeMs!==b.mtimeMs)throw Error('DMS đang ghi báo cáo, hoãn xử lý');
  return b;
}
async function latestApm(mask){
  if(!mask)throw Error('Thiếu đường dẫn APM01');
  const dir=path.dirname(mask),name=path.basename(mask);
  if(!name.includes('*')){
    if(!/^APM01 Agents_.+\.xlsx$/i.test(name))throw Error('Tên APM01 không đúng');
    return mask;
  }
  if(name!=='APM01 Agents_*.xlsx')throw Error('Mẫu APM01 không hợp lệ');
  const entries=(await fs.readdir(dir,{withFileTypes:true})).filter(e=>e.isFile()&&/^APM01 Agents_.+\.xlsx$/i.test(e.name));
  if(!entries.length)throw Error('Không tìm thấy APM01 Agents_...xlsx');
  const list=await Promise.all(entries.map(async e=>{
    const file=path.join(dir,e.name),s=await fs.stat(file);
    return {file,time:s.mtimeMs,size:s.size};
  }));
  list.sort((a,b)=>b.time-a.time);
  if(list[0].size<1000)throw Error('File APM01 mới nhất chưa hoàn tất; không dùng bản cũ');
  return list[0].file;
}
async function workbook(file){
  const initial=await stable(file);
  const result=XLSX.readFile(file,{raw:true,cellDates:false});
  const ending=await fs.stat(file);
  if(initial.size!==ending.size||initial.mtimeMs!==ending.mtimeMs)throw Error('File thay đổi trong lúc đọc');
  return result;
}
function matrix(book,sheet,raw=false){
  if(!book.Sheets[sheet])throw Error('Thiếu sheet '+sheet);
  return XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:'',raw,blankrows:true});
}
function apmRows(book){
  const sheet=book.SheetNames.find(name=>{
    const r=matrix(book,name);
    return r[0]&&clean(r[0][2])==='Mã TVV'&&r[0].some(x=>clean(x)==='Chức vụ TVV');
  });
  if(!sheet)throw Error('Không tìm thấy sheet APM01 Agent Detail Information');
  const data=matrix(book,sheet),header=data[0];
  const rows=data.slice(1).map((cells,i)=>{
    const result={};
    header.slice(0,28).forEach((h,j)=>{if(clean(h))result[clean(h)]=clean(cells[j]);});
    return result;
  }).filter(r=>clean(r['Mã TVV']));
  const ad=new Map();
  for(const cells of data.slice(1)){
    const group=clean(cells[37]),name=clean(cells[38]);
    if(group&&name){
      if(ad.has(group)&&ad.get(group)!==name)throw Error('Bảng nhóm/AD có giá trị mâu thuẫn');
      ad.set(group,name);
    }
  }
  return {rows,ad};
}
function bcRows(book){
  const sheet=book.SheetNames.find(name=>{
    const rows=matrix(book,name);
    return rows[1]&&clean(rows[1][14])==='MÃ ĐẠI LÝ'&&clean(rows[1][18])==='SỐ HỢP ĐỒNG';
  });
  if(!sheet)throw Error('Sai cấu trúc báo cáo NEW_BC02');
  const data=matrix(book,sheet),raw=matrix(book,sheet,true);
  const h=Array.from({length:42},(_,i)=>clean(data[1][i])||clean(data[0]?.[i]));
  if(!h.includes('IP')||!h.includes('AFYP'))throw Error('BC02 thiếu IP hoặc AFYP');
  const rows=[];
  for(let i=2;i<data.length;i++){
    const fmt=data[i]||[],actual=raw[i]||[];
    if(!clean(fmt[14])&&!clean(fmt[18]))continue;
    const r={};
    h.forEach((field,j)=>{
      if(!field)return;
      r[field]=clean(['NGÀY THU','NGÀY PHÁT HÀNH','NGÀY CẬP NHẬT'].includes(field)?fmt[j]:actual[j]);
    });
    rows.push(r);
  }
  return rows;
}
function buildStructure(source,{officeRecruiters=false}={}){
  required(source,['Mã TVV','Tên TVV','Chức vụ TVV','Trạng thái TVV','Ngày bắt đầu làm việc',
    'Ngày hiệu lực chức vụ','Mã TVV tuyển dụng'],'APM01');
  const seen=new Set(),tvv=[],leaders=[],recruiters=[];
  let missingGroup=0;
  for(const r of source){
    const code=ident(r['Mã TVV']);
    if(!code)continue;
    if(seen.has(code))throw Error('Mã TVV bị trùng');
    if(!clean(r['Tên TVV']))throw Error('TVV không có tên');
    seen.add(code);
    const rawGroup=pick(r,'Mã nhóm','Mã ban');
    const banca=lower(r.Ban).startsWith('dso team')||(!rawGroup&&lower(r['Kênh'])==='kênh đối tác');
    const group=pick(r,'MÃ NHÓM')||(banca?'Banca':rawGroup);
    if(!group)missingGroup++;
    const name=clean(r['Tên TVV']),position=clean(r['Chức vụ TVV']);
    const joined=clean(r['Ngày bắt đầu làm việc']);
    tvv.push({'Mã TVV':code,'Tên TVV':name,'Mã Ban/Nhóm':group,'Chức vụ':position,
      'Ngày bắt đầu làm việc':joined,'Mã TVV TD':ident(r['Mã TVV tuyển dụng']),
      'Trạng thái':clean(r['Trạng thái TVV'])});
    if(['trưởng nhóm','trưởng ban'].includes(lower(position))){
      leaders.push({'Mã số':code,'Họ tên':name,'Chức vụ':position,'Ban':clean(r.Ban),
        'Nhóm':pick(r,'Nhóm','Ban'),'Mã nhóm':group,'Tiền/tháng':'','SĐT':'',
        'Email':'','Ngày bắt đầu':joined,'Ghi chú':''});
    }
    if(lower(position)==='tiền trưởng nhóm'&&(officeRecruiters||lower(r.Ban)!=='văn phòng')){
      recruiters.push({'Mã số':code,'Họ tên':name,'Chức vụ':position,
        'Nhóm':pick(r,'Nhóm','Ban'),'Ngày bắt đầu':joined,
        'Ngày hiệu lực chức vụ':clean(r['Ngày hiệu lực chức vụ'])});
    }
  }
  if(missingGroup)throw Error('APM01 có '+missingGroup+' mã nhóm thiếu; dừng đối chiếu');
  return {tvv,leaders,recruiters};
}
function buildTamthu(bc,apm,{adMap=new Map(),missingAdAllowed=new Set()}={}){
  required(bc,['TÊN BAN','MÃ BAN','MÃ NHÓM','TÊN NHÓM','MÃ ĐẠI LÝ','TÊN ĐẠI LÝ',
    'SỐ HỢP ĐỒNG','TÌNH TRẠNG HỒ SƠ','NGÀY THU','NGÀY PHÁT HÀNH','IP','AFYP'],'BC02');
  const people=new Map();
  for(const r of apm){
    const id=ident(r['Mã TVV']);if(!id)continue;
    if(people.has(id))throw Error('Mã TVV trùng trong APM01');
    people.set(id,r);
  }
  const base=[];let noPerson=0,noAD=0;
  for(const r of bc){
    const code=ident(r['MÃ ĐẠI LÝ']);
    if(!code&&!clean(r['SỐ HỢP ĐỒNG']))continue;
    const agent=people.get(code);
    if(code&&!agent)noPerson++;
    const group=pick(r,'TÊN NHÓM','TÊN BAN');
    const ad=agent?(pick(agent,'AD')||clean(adMap.get(group))):'';
    if(agent&&!ad&&!missingAdAllowed.has(group))noAD++;
    base.push({'STT':base.length+1,'Ban':clean(r['TÊN BAN']),'Nhóm':group,
      'Mã Ban/Nhóm':pick(r,'MÃ NHÓM','MÃ BAN'),'Mã ĐL':code,
      'Tên':clean(r['TÊN ĐẠI LÝ']),'Chức vụ':agent?clean(agent['Chức vụ TVV']):'',
      'Ngày bắt đầu làm việc':agent?clean(agent['Ngày bắt đầu làm việc']):'',
      'Số hợp đồng':clean(r['SỐ HỢP ĐỒNG']),'Ngày hiệu lực':clean(r['NGÀY THU']),
      'Ngày phát hành':clean(r['NGÀY PHÁT HÀNH']),
      'PĐT + 10% ĐT':amount(r.IP),'AFYP':amount(r.AFYP),'AD':ad,
      'TÍNH LƯỢT 3 tr':0,'MÃ ĐL TD':agent?(ident(agent['Mã TVV tuyển dụng'])||'0'):'',
      'Tình trạng HĐ':clean(r['TÌNH TRẠNG HỒ SƠ']),
      'TRỪ HỦY':REMOVED.has(lower(r['TÌNH TRẠNG HỒ SƠ']))?0:1});
  }
  if(noPerson||noAD)throw Error('BC02 thiếu đối chiếu: '+noPerson+' TVV, '+noAD+' AD');
  function sums(rows){
    const total=new Map(),seen=new Set();
    for(const r of rows)total.set(r['Mã ĐL'],(total.get(r['Mã ĐL'])||0)+r['PĐT + 10% ĐT']);
    return rows.map((r,i)=>{
      const first=!seen.has(r['Mã ĐL']);seen.add(r['Mã ĐL']);
      return {...r,STT:i+1,'TÍNH LƯỢT 3 tr':first?total.get(r['Mã ĐL']):0};
    });
  }
  const sheet2=sums(base),filtered=sums(base.filter(row=>row['TRỪ HỦY']!==0));
  const stats=rows=>({rows:rows.length,ip:rows.reduce((s,r)=>s+r['PĐT + 10% ĐT'],0),
    afyp:rows.reduce((s,r)=>s+r.AFYP,0)});
  return {sheet2,sheet4:filtered.map(r=>Object.fromEntries(HEADERS.map(h=>[h,r[h]??'']))),
    audit:{before:stats(sheet2),after:stats(filtered),removed:sheet2.length-filtered.length}};
}
export const testOnly={buildStructure,buildTamthu,latestApm};
export function isDmsSource(source){return TRANSFORMS.has(source?.dmsTransform);}
export async function readDmsSource(source){
  if(!isDmsSource(source))throw Error('Không hỗ trợ loại DMS');
  if(!source.file)throw Error('Thiếu đường dẫn file DMS');
  const isApm=source.dmsTransform.startsWith('apm01');
  const apmFile=await latestApm(isApm?source.file:
    (source.apmFile||path.join(path.dirname(source.file),'APM01 Agents_*.xlsx')));
  const apm=apmRows(await workbook(apmFile));
  const reference=apmRows(await workbook(source.structureReferenceFile||
    path.join(path.dirname(apmFile),'Cautruc.xlsx')));
  for(const [g,ad] of reference.ad)if(!apm.ad.has(g))apm.ad.set(g,ad);
  // Ghi chú/ngày sinh chưa được APM01 xác nhận: tuyệt đối không suy diễn.
  const structure=buildStructure(apm.rows,{officeRecruiters:source.includeOfficeRecruiters===true});
  let input,audit={tvv:structure.tvv.length,leaders:structure.leaders.length,
    recruiters:structure.recruiters.length};
  if(isApm){
    input=source.dmsTransform==='apm01-tvv'?structure.tvv:
      source.dmsTransform==='apm01-leaders'?structure.leaders:structure.recruiters;
  }else{
    if(path.basename(source.file)!=='NEW_BC02.xlsx')throw Error('BC02 phải là NEW_BC02.xlsx');
    const converted=buildTamthu(bcRows(await workbook(source.file)),apm.rows,{
      adMap:apm.ad,missingAdAllowed:new Set(source.allowedMissingADGroups||['DSO team - An Giang'])});
    audit=converted.audit;
    if(source.dmsTransform==='bc02-sheet2')input=converted.sheet2;
    else{
      const rows=[HEADERS,...converted.sheet4.map(r=>HEADERS.map(h=>r[h]??''))];
      input=XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(rows),
        {FS:',',RS:'\n',forceQuotes:true});
    }
  }
  const count=Array.isArray(input)?input.length:Math.max(0,
    input.trim().split(/\r?\n/).length-1);
  if(count<(source.minRows??1))throw Error('DMS có quá ít bản ghi: '+count);
  return {input,audit:{type:source.dmsTransform,count,...audit}};
}
