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
const KPI04_HEADERS=[...HEADERS,'Nguồn dữ liệu'];
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
const canonicalHeader = value => clean(value).normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d')
  .toLocaleLowerCase('vi-VN').replace(/\s+/g,' ').trim();
const APM_ALIASES={
  'Mã TVV':['Mã TVV','Mã ĐL','Mã đại lý','Mã số TVV'],
  'Tên TVV':['Tên TVV','Họ tên TVV','Họ và tên TVV','Tên','Họ tên','Họ và tên','Tên đại lý'],
  'Chức vụ TVV':['Chức vụ TVV','Chức vụ','Chức danh TVV','Chức danh'],
  'Trạng thái TVV':['Trạng thái TVV','Trạng thái','Tình trạng TVV','Tình trạng hoạt động'],
  'Ngày bắt đầu làm việc':['Ngày bắt đầu làm việc','Ngày bắt đầu','Ngày bắt đầu LV','Ngày gia nhập'],
  'Ngày hiệu lực chức vụ':['Ngày hiệu lực chức vụ','Ngày hiệu lực CV','Ngày hiệu lực'],
  'Mã TVV tuyển dụng':['Mã TVV tuyển dụng','Mã TVV TD','Mã người tuyển dụng','Mã NTD','Mã ĐL TD'],
  'Mã nhóm':['Mã nhóm','Mã Ban/Nhóm','Mã đơn vị'],
  'Mã ban':['Mã ban'],
  'Ban':['Ban','Tên ban'],
  'Nhóm':['Nhóm','Tên nhóm'],
  'Kênh':['Kênh','Kênh phân phối'],
  'AD':['AD','Tên AD'],
  'ADO':['ADO']
};
function columnIndexes(header){
  const names=header.map(canonicalHeader);
  const used=new Set();
  const mapped=new Map();
  for(const [field,aliases] of Object.entries(APM_ALIASES)){
    const idx=names.findIndex((name,j)=>name && !used.has(j) &&
      aliases.some(alias=>canonicalHeader(alias)===name));
    if(idx>=0){mapped.set(field,idx);used.add(idx);}
  }
  return mapped;
}
function apmRows(book){
  let selected=null,diagnostic='';
  for(const sheet of book.SheetNames){
    const values=matrix(book,sheet);
    const address=book.Sheets[sheet]['!ref'];
    const offset=address?XLSX.utils.decode_range(address).s.r:0;
    // DMS export: Excel row 1 is blank, row 2 is the actual header.
    // Some Excel libraries omit leading blank rows, so use the physical row.
    const physicalSecond=1-offset;
    const indices=[physicalSecond,...Array.from({length:Math.min(values.length,80)},(_,i)=>i)]
      .filter((idx,i,all)=>idx>=0 && idx<values.length && all.indexOf(idx)===i);
    for(const i of indices){
      const header=values[i]||[];
      const mapped=columnIndexes(header);
      if(i===physicalSecond)diagnostic=header.slice(0,35).map(clean).filter(Boolean).join(' | ');
      if(['Mã TVV','Tên TVV','Chức vụ TVV'].every(key=>mapped.has(key))){
        selected={sheet,values,headerIndex:i,header,mapped};break;
      }
    }
    if(selected)break;
  }
  if(!selected)throw Error('Không nhận diện được tiêu đề APM01 ở dòng 2. Các cột đọc được: '+
    (diagnostic.slice(0,550)||'(không có cột)')+
    '. Cần đối chiếu đúng tên cột; KHÔNG ghi dữ liệu.');
  const {values,headerIndex,header,mapped}=selected;
  const rows=values.slice(headerIndex+1).map(cells=>{
    const result={};
    header.forEach((name,j)=>{if(clean(name))result[clean(name)]=clean(cells[j]);});
    for(const [field,index] of mapped)result[field]=clean(cells[index]);
    return result;
  }).filter(row=>clean(row['Mã TVV']));
  if(!rows.length)throw Error('APM01 không có TVV sau hàng tiêu đề.');
  const ad=new Map();
  // APM01 can contain a supplementary group/AD table in columns AL/AM.
  // Only accept populated pairs; reject conflicting values for the same group.
  for(const cells of values.slice(headerIndex+1)){
    const group=clean(cells[37]),name=clean(cells[38]);
    if(group&&name){
      if(ad.has(group)&&ad.get(group)!==name)throw Error('Bảng nhóm/AD có giá trị mâu thuẫn');
      ad.set(group,name);
    }
  }
  return {rows,ad};
}
function referenceAdMap(book){
  // Cautruc.xlsx is an ordinary multi-sheet workbook, NOT an APM01 report.
  // Only use a sheet when it contains an explicit group/AD header pair.
  const ad=new Map();
  for(const sheet of book.SheetNames){
    const data=matrix(book,sheet);
    for(let rowIndex=0;rowIndex<Math.min(data.length,25);rowIndex++){
      const header=(data[rowIndex]||[]).map(canonicalHeader);
      const groupIndex=header.findIndex(h=>['nhom','ten nhom'].includes(h));
      const adIndex=header.findIndex(h=>['ad','ten ad'].includes(h));
      if(groupIndex<0||adIndex<0)continue;
      for(const row of data.slice(rowIndex+1)){
        const group=clean(row[groupIndex]),name=clean(row[adIndex]);
        if(!group||!name)continue;
        if(ad.has(group)&&ad.get(group)!==name)throw Error('Cautruc có AD mâu thuẫn cho nhóm '+group);
        ad.set(group,name);
      }
      break;
    }
  }
  return ad;
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
function kpi04Rows(book){
  const sheet=book.SheetNames.find(name=>{
    const values=matrix(book,name);
    const header=values[1]||[];
    return clean(header[8])==='Mã đại lý'&&clean(header[14])==='Hợp đồng'&&
      clean(header[18])==='Ngày phát hành';
  });
  if(!sheet)throw Error('Sai cấu trúc báo cáo NEW_KPI04');
  const values=matrix(book,sheet,true);
  const display=matrix(book,sheet);
  const top=values[0]||[],header=values[1]||[];
  const names=Array.from({length:Math.max(top.length,header.length)},(_,i)=>
    clean(header[i])||clean(top[i]));
  const index=new Map(names.map((name,i)=>[canonicalHeader(name),i]));
  for(const field of ['Mã đại lý','Tên đại lý','Hợp đồng','Ngày hiệu lực','Ngày phát hành','IP','AFYP']){
    if(!index.has(canonicalHeader(field)))throw Error('KPI04 thiếu cột '+field);
  }
  return values.slice(2).map((cells,rowOffset)=>{
    const result={};
    names.forEach((name,i)=>{
      if(!name)return;
      const formatted=(display[rowOffset+2]||[])[i];
      result[name]=clean(['Ngày bắt đầu làm việc','Ngày hiệu lực','Ngày phát hành'].includes(name)
        ? formatted:cells[i]);
    });
    return result;
  }).filter(row=>clean(row['Hợp đồng'])||clean(row['Mã đại lý']));
}
function legacyAdByContract(book,{throughMonth}={}){
  if(!Number.isInteger(throughMonth)||throughMonth<1||throughMonth>12){
    throw Error('Thiếu tháng chốt AD lịch sử từ Doanhso');
  }
  const result=new Map();
  const contractHeader=canonicalHeader('Số hợp đồng'),adHeader=canonicalHeader('AD');
  for(const name of book.SheetNames){
    const month=Number(name);
    if(!/^\d{1,2}$/.test(name)||month<1||month>throughMonth)continue;
    const values=matrix(book,name);
    const headerRow=values.findIndex(row=>{
      const headers=row.map(canonicalHeader);
      return headers.includes(contractHeader)&&headers.includes(adHeader);
    });
    if(headerRow<0)throw Error('Doanhso Sheet '+name+' thiếu tiêu đề Số hợp đồng/AD');
    const headers=values[headerRow].map(canonicalHeader);
    const contractIndex=headers.indexOf(contractHeader),adIndex=headers.indexOf(adHeader);
    for(const row of values.slice(headerRow+1)){
      const contract=clean(row[contractIndex]),ad=clean(row[adIndex]);
      if(!contract||!ad)continue;
      if(result.has(contract)&&result.get(contract)!==ad){
        throw Error('Doanhso có AD mâu thuẫn cho Số hợp đồng '+contract);
      }
      result.set(contract,ad);
    }
  }
  return result;
}
function parseKpi04Date(value){
  const text=clean(value);
  let match=text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if(!match){
    const iso=text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(iso)match=[iso[0],iso[3],iso[2],iso[1]];
  }
  if(!match)throw Error('KPI04 có Ngày phát hành không hợp lệ: '+text);
  const day=Number(match[1]),month=Number(match[2]),year=Number(match[3]);
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day){
    throw Error('KPI04 có Ngày phát hành không tồn tại: '+text);
  }
  return {day,month,year,label:`${year}-${String(month).padStart(2,'0')}`};
}
function peopleContext(apm,adMap){
  const people=new Map();
  for(const row of apm){
    const code=ident(row['Mã TVV']);
    if(!code)continue;
    if(people.has(code))throw Error('Mã TVV trùng trong APM01');
    people.set(code,row);
  }
  const adoToAd=new Map();
  for(const agent of people.values()){
    const ado=ident(agent.ADO),group=pick(agent,'Nhóm','Ban');
    const canonical=clean(adMap.get(group));
    if(!ado||!canonical)continue;
    if(adoToAd.has(ado)&&adoToAd.get(ado)!==canonical){
      throw Error('APM01/Cautruc có AD mâu thuẫn cho ADO '+clean(agent.ADO));
    }
    adoToAd.set(ado,canonical);
  }
  return {people,adoToAd};
}
function assignMonthlyRounds(rows){
  const byMonth=new Map();
  for(const row of rows){
    const month=row.__month;
    if(!byMonth.has(month))byMonth.set(month,[]);
    byMonth.get(month).push(row);
  }
  const result=[];
  for(const monthRows of byMonth.values()){
    const totals=new Map(),seen=new Set();
    for(const row of monthRows){
      totals.set(row['Mã ĐL'],(totals.get(row['Mã ĐL'])||0)+row['PĐT + 10% ĐT']);
    }
    for(const row of monthRows){
      const code=row['Mã ĐL'],first=!seen.has(code);seen.add(code);
      const cleanRow={...row,'TÍNH LƯỢT 3 tr':first?(totals.get(code)||0):0};
      delete cleanRow.__month;
      result.push(cleanRow);
    }
  }
  return result.map((row,index)=>({...row,STT:index+1}));
}
function buildKpi04(source,apm,{adMap=new Map(),legacyAdMap=new Map(),legacyAdThroughMonth=0,
  currentMonth,mode='history'}={}){
  if(!/^\d{4}-\d{2}$/.test(currentMonth||''))throw Error('Thiếu tháng Bangkok cho KPI04');
  required(source,['Mã đại lý','Tên đại lý','Hợp đồng','Ngày hiệu lực','Ngày phát hành','IP','AFYP'],'KPI04');
  const [currentYear,currentNumber]=currentMonth.split('-').map(Number);
  const previousDate=new Date(Date.UTC(currentYear,currentNumber-2,1));
  const previousMonth=`${previousDate.getUTCFullYear()}-${String(previousDate.getUTCMonth()+1).padStart(2,'0')}`;
  const {people,adoToAd}=peopleContext(apm,adMap);
  const seenContracts=new Set(),rows=[];
  const audit={sourceRows:source.length,selected:0,missingApm:0,missingAd:0,missingRecruiter:0,
    legacyAdApplied:0,
    excludedNonPositiveIp:0,excludedEffectiveMonth:0,months:{}};
  for(const sourceRow of source){
    const issue=parseKpi04Date(sourceRow['Ngày phát hành']);
    if(issue.year!==currentYear||issue.month<1||issue.month>currentNumber)continue;
    const isCurrent=issue.month===currentNumber;
    if((mode==='history'&&isCurrent)||(mode==='carryover'&&!isCurrent))continue;
    const ip=amount(sourceRow.IP);
    if(ip<=0){audit.excludedNonPositiveIp++;continue;}
    if(mode==='carryover'){
      const effective=parseKpi04Date(sourceRow['Ngày hiệu lực']);
      if(effective.label!==previousMonth){audit.excludedEffectiveMonth++;continue;}
    }
    const contract=clean(sourceRow['Hợp đồng']);
    if(!contract)throw Error('KPI04 có dòng thiếu Số hợp đồng');
    if(seenContracts.has(contract))throw Error('KPI04 trùng Số hợp đồng: '+contract);
    seenContracts.add(contract);
    const code=ident(sourceRow['Mã đại lý']);
    if(!code)throw Error('KPI04 có dòng thiếu Mã đại lý');
    const agent=people.get(code);
    if(!agent)audit.missingApm++;
    const group=pick(sourceRow,'Tên nhóm','Tên ban');
    // The KPI04 group can be matched directly to a Cautruc/APM group label even
    // when the historical agent is no longer present in the current APM01.
    // This is exact source evidence; never infer an AD from a similar name.
    const structuralAd=(agent?pick(agent,'AD'):'')||clean(adMap.get(group))||
      (agent?clean(adoToAd.get(ident(agent.ADO))):'');
    const legacyAd=mode==='history'&&issue.month<=legacyAdThroughMonth
      ? clean(legacyAdMap.get(contract)):'';
    const ad=structuralAd||legacyAd;
    if(!structuralAd&&legacyAd)audit.legacyAdApplied++;
    if(!ad)audit.missingAd++;
    const recruiter=agent?ident(agent['Mã TVV tuyển dụng']):'';
    if(!recruiter)audit.missingRecruiter++;
    rows.push({
      __month:issue.label,'STT':0,'Ban':clean(sourceRow['Tên ban']),'Nhóm':group,
      'Mã Ban/Nhóm':pick(sourceRow,'Mã nhóm','Mã ban'),'Mã ĐL':code,
      'Tên':clean(sourceRow['Tên đại lý']),'Chức vụ':agent?clean(agent['Chức vụ TVV']):'',
      'Ngày bắt đầu làm việc':agent?clean(agent['Ngày bắt đầu làm việc']):clean(sourceRow['Ngày bắt đầu làm việc']),
      'Số hợp đồng':contract,'Ngày hiệu lực':clean(sourceRow['Ngày hiệu lực']),
      'Ngày phát hành':clean(sourceRow['Ngày phát hành']),
      'PĐT + 10% ĐT':ip,'AFYP':amount(sourceRow.AFYP),'AD':ad,
      'TÍNH LƯỢT 3 tr':0,'MÃ ĐL TD':recruiter||(agent?'0':''),'Nguồn dữ liệu':`NMC_DOANHSO:${issue.label}`,
    });
    audit.months[issue.label]=(audit.months[issue.label]||0)+1;
  }
  const enriched=assignMonthlyRounds(rows);
  audit.selected=enriched.length;
  const csv=XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet([
    KPI04_HEADERS,...enriched.map(row=>KPI04_HEADERS.map(header=>row[header]??''))
  ]),{FS:',',RS:'\n',forceQuotes:true});
  const months=Array.from({length:Math.max(0,currentNumber-1)},(_,index)=>
    `${currentYear}-${String(index+1).padStart(2,'0')}`);
  return mode==='carryover'?{input:{month:currentMonth,csv},audit}:
    {input:{csv,months},audit};
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
  const {people,adoToAd}=peopleContext(apm,adMap);
  const base=[];let noPerson=0,noAD=0;
  const missingGroups=new Map();
  for(const r of bc){
    const code=ident(r['MÃ ĐẠI LÝ']);
    if(!code&&!clean(r['SỐ HỢP ĐỒNG']))continue;
    const agent=people.get(code);
    if(code&&!agent)noPerson++;
    const group=pick(r,'TÊN NHÓM','TÊN BAN');
    const ad=agent?(pick(agent,'AD')||clean(adMap.get(group))||
      clean(adoToAd.get(ident(agent.ADO)))):'';
    if(agent&&!ad&&!missingAdAllowed.has(group)){
      noAD++;
      missingGroups.set(group,(missingGroups.get(group)||0)+1);
    }
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
  if(noPerson||noAD){
    const detail=[...missingGroups].map(([group,count])=>group+' ('+count+' dòng)').join(', ');
    throw Error('BC02 thiếu đối chiếu: '+noPerson+' TVV, '+noAD+' AD'+
      (detail?'; nhóm thiếu AD: '+detail:''));
  }
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
export const testOnly={buildStructure,buildTamthu,buildKpi04,kpi04Rows,legacyAdByContract,
  latestApm,apmRows,referenceAdMap};
export function isDmsSource(source){return TRANSFORMS.has(source?.dmsTransform);}
export function isKpi04Source(source){return ['history','carryover'].includes(source?.kpi04Transform);}
export async function readDmsSource(source){
  if(!isDmsSource(source))throw Error('Không hỗ trợ loại DMS');
  if(!source.file)throw Error('Thiếu đường dẫn file DMS');
  const isApm=source.dmsTransform.startsWith('apm01');
  const apmFile=await latestApm(isApm?source.file:
    (source.apmFile||path.join(path.dirname(source.file),'APM01 Agents_*.xlsx')));
  const apm=apmRows(await workbook(apmFile));
  const reference=referenceAdMap(await workbook(source.structureReferenceFile||
    path.join(path.dirname(apmFile),'Cautruc.xlsx')));
  for(const [g,ad] of reference)if(!apm.ad.has(g))apm.ad.set(g,ad);
  // Ghi chú/ngày sinh chưa được APM01 xác nhận: tuyệt đối không suy diễn.
  const structure=buildStructure(apm.rows,{officeRecruiters:source.includeOfficeRecruiters===true});
  let input,audit={tvv:structure.tvv.length,leaders:structure.leaders.length,
    recruiters:structure.recruiters.length};
  if(isApm){
    input=source.dmsTransform==='apm01-tvv'?structure.tvv:
      source.dmsTransform==='apm01-leaders'?structure.leaders:structure.recruiters;
  }else{
    if(path.basename(source.file)!=='NEW_BC02.xlsx')throw Error('BC02 phải là NEW_BC02.xlsx');
    const bc=bcRows(await workbook(source.file));
    // BC02 đã được người dùng cấu hình phạm vi tải. Giữ nguyên mọi ngày thu,
    // chỉ áp dụng TRỪ HỦY theo trạng thái như mẫu Tamthu, không lọc theo tháng.
    const converted=buildTamthu(bc,apm.rows,{
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
export async function readKpi04Source(source){
  if(!isKpi04Source(source))throw Error('Không hỗ trợ loại KPI04');
  if(!source.file)throw Error('Thiếu đường dẫn NEW_KPI04');
  const nowParts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit'})
    .formatToParts(new Date());
  const currentMonth=`${nowParts.find(part=>part.type==='year')?.value}-${nowParts.find(part=>part.type==='month')?.value}`;
  const expectedName=`NEW_KPI04_${currentMonth.slice(0,4)}.xlsx`;
  if(path.basename(source.file).toLocaleLowerCase('vi-VN')!==expectedName.toLocaleLowerCase('vi-VN')){
    throw Error('KPI04 phải là '+expectedName);
  }
  const apmFile=await latestApm(source.apmFile||path.join(path.dirname(source.file),'APM01 Agents_*.xlsx'));
  const apm=apmRows(await workbook(apmFile));
  const reference=referenceAdMap(await workbook(source.structureReferenceFile||
    path.join(path.dirname(apmFile),'Cautruc.xlsx')));
  for(const [group,ad] of reference)if(!apm.ad.has(group))apm.ad.set(group,ad);
  let legacyAdMap=new Map(),legacyAdThroughMonth=0;
  if(source.legacyAdReferenceFile){
    legacyAdThroughMonth=Number(source.legacyAdThroughMonth);
    if(path.basename(source.legacyAdReferenceFile).toLocaleLowerCase('vi-VN')!=='doanhso.xlsx'){
      throw Error('Tham chiếu AD lịch sử phải là Doanhso.xlsx');
    }
    legacyAdMap=legacyAdByContract(await workbook(source.legacyAdReferenceFile),{
      throughMonth:legacyAdThroughMonth,
    });
  }
  const built=buildKpi04(kpi04Rows(await workbook(source.file)),apm.rows,{
    adMap:apm.ad,legacyAdMap,legacyAdThroughMonth,currentMonth,mode:source.kpi04Transform,
  });
  const count=Math.max(0,built.input.csv.trim().split(/\r?\n/).length-1);
  if(source.kpi04Transform==='history'&&count<(source.minRows??1)){
    throw Error('KPI04 có quá ít bản ghi lịch sử: '+count);
  }
  return {input:built.input,audit:{type:'kpi04-'+source.kpi04Transform,count,...built.audit}};
}
