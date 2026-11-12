import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {testOnly,isDmsSource,isKpi04Source} from '../data-hub/dms-auto-source.mjs';
const agent=(id,role='Tư vấn tài chính')=>({
 'Mã TVV':id,'Tên TVV':'Nhân sự mẫu','Chức vụ TVV':role,
 'Trạng thái TVV':'Hoạt động','Ngày bắt đầu làm việc':'01/01/2026',
 'Ngày hiệu lực chức vụ':'05/01/2026','Mã TVV tuyển dụng':'D001',
 'Mã nhóm':'N01','Ban':'Ban A','Nhóm':'Nhóm A','Kênh':'Kênh Đại lý',
 ADO:'Quản lý mẫu - L1234567890','Ngày sinh (ngày)':'39000'
});
const contract=(state,ip,afyp)=>({
 'TÊN BAN':'Ban A','MÃ BAN':'B01','MÃ NHÓM':'N01','TÊN NHÓM':'Nhóm A',
 'MÃ ĐẠI LÝ':'D002','TÊN ĐẠI LÝ':'Nhân sự mẫu','SỐ HỢP ĐỒNG':'12345678901234',
 'TÌNH TRẠNG HỒ SƠ':state,'NGÀY THU':'01/11/2026','NGÀY PHÁT HÀNH':'',
 IP:ip,AFYP:afyp
});
test('Chỉ nhận đúng các nguồn DMS',()=>{
 assert.equal(isDmsSource({dmsTransform:'apm01-tvv'}),true);
 assert.equal(isDmsSource({dmsTransform:'bc02-sheet4'}),true);
 assert.equal(isDmsSource({dmsTransform:'wrong'}),false);
});
test('Chỉ nhận đúng bộ chuyển đổi KPI04',()=>{
 assert.equal(isKpi04Source({kpi04Transform:'history'}),true);
 assert.equal(isKpi04Source({kpi04Transform:'carryover'}),true);
 assert.equal(isKpi04Source({kpi04Transform:'wrong'}),false);
});
test('APM sinh ba bảng tối thiểu, không đưa ngày sinh lên app',()=>{
 const r=testOnly.buildStructure([agent('D001'),agent('D002','Trưởng nhóm'),
 agent('D003','Tiền trưởng nhóm')]);
 assert.equal(r.tvv.length,3);assert.equal(r.leaders.length,1);
 assert.equal(r.recruiters.length,1);
 assert.equal('Ghi chú' in r.tvv[0],false);
 assert.equal('Ngày sinh (ngày)' in r.tvv[0],false);
 assert.equal(r.tvv[0]['Tên Ban/Nhóm'],'Nhóm A');
 assert.equal(r.tvv[0]['Mã AD'],'L1234567890');
});

test('APM01 lấy Mã AD từ cuối cột O và không suy diễn nhóm đối tác',()=>{
 const agency={...agent('D001'),'Mã nhóm':'U2611479530',Nhóm:'An Phát',
  ADO:'Đàm Thị Hương Trang - L1905096997'};
 const partner={...agent('D002'),'Mã nhóm':'A473DSO000',Nhóm:'DSO team - An Giang',
  Kênh:'Kênh đối tác',ADO:'Nguyễn Thị Trí Huệ - L1410061423'};
 const result=testOnly.buildStructure([agency,partner]);
 assert.equal(result.tvv[0]['Mã AD'],'L1905096997');
 assert.equal(result.tvv[1]['Mã AD'],'');
});

test('APM01 chặn cùng Mã nhóm ánh xạ đến hai Mã AD',()=>{
 const a={...agent('D001'),ADO:'ADO Một - L1234567890'};
 const b={...agent('D002'),ADO:'ADO Hai - L9999999999'};
 assert.throws(()=>testOnly.buildStructure([a,b]),/ánh xạ Ban\/Nhóm mâu thuẫn/);
});
test('BC02 thành Sheet2; Sheet4 bỏ những dòng TRỪ HỦY=0 và tính lại lượt',()=>{
 const person={...agent('D002'),AD:'AD mẫu'};
 const r=testOnly.buildTamthu([contract('Có hiệu lực',100,100),
 contract('Từ chối',50,50)],[person]);
 assert.equal(r.sheet2.length,2);assert.equal(r.sheet4.length,1);
 assert.equal(r.sheet2[0]['TÍNH LƯỢT 3 tr'],150);
 assert.equal(r.sheet4[0]['TÍNH LƯỢT 3 tr'],100);
 assert.equal(r.audit.after.afyp,100);
});
test('Nguồn thiếu AD hoặc trùng mã bị chặn',()=>{
 const a=agent('D002');
 assert.throws(()=>testOnly.buildTamthu([contract('Có hiệu lực',10,10)],[a]),/AD/);
 assert.throws(()=>testOnly.buildStructure([a,a]),/trùng/);
});

test('ADO chính xác kế thừa nhãn AD đã được Cautruc xác nhận',()=>{
 const known={...agent('D001'),Nhóm:'Phụng Hoàng Sơn',ADO:'Trương Quốc Uy - L2404058202'};
 const missing={...agent('D002'),Nhóm:'An Kiên Phát',ADO:'Trương Quốc Uy - L2404058202'};
 const r=testOnly.buildTamthu([contract('Có hiệu lực',10,10)],[known,missing],{
  adMap:new Map([['Phụng Hoàng Sơn','AD Uy']])
 });
 assert.equal(r.sheet2[0].AD,'AD Uy');
});

test('Không suy diễn ADO chưa đối chiếu và báo đúng nhóm thiếu',()=>{
 const missing={...agent('D002'),ADO:'Người chưa đối chiếu - L000'};
 assert.throws(()=>testOnly.buildTamthu([contract('Có hiệu lực',10,10)],[missing]),
  /nhóm thiếu AD: Nhóm A \(1 dòng\)/);
});

test('Chặn ADO ánh xạ đến hai nhãn AD mâu thuẫn',()=>{
 const a={...agent('D001'),Nhóm:'Nhóm A',ADO:'Cùng ADO'};
 const b={...agent('D002'),Nhóm:'Nhóm B',ADO:'Cùng ADO'};
 assert.throws(()=>testOnly.buildTamthu([contract('Có hiệu lực',10,10)],[a,b],{
  adMap:new Map([['Nhóm A','AD 1'],['Nhóm B','AD 2']])
 }),/mâu thuẫn/);
});

test('Nhận APM01 Agents_ kèm ngày tháng, bỏ qua tiền tố Agent_ cũ và chọn bản mới nhất',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'nmc-dms-name-'));
 try{
  const older=path.join(dir,'APM01 Agents_20261104.xlsx');
  const newer=path.join(dir,'APM01 Agents_20261105.xlsx');
  const wrong=path.join(dir,'APM01 Agent_20261106.xlsx');
  for(const file of [older,newer,wrong])await fs.writeFile(file,Buffer.alloc(1200));
  await fs.utimes(older,new Date('2026-11-04T10:00:00Z'),new Date('2026-11-04T10:00:00Z'));
  await fs.utimes(newer,new Date('2026-11-05T10:00:00Z'),new Date('2026-11-05T10:00:00Z'));
  await fs.utimes(wrong,new Date('2026-11-06T10:00:00Z'),new Date('2026-11-06T10:00:00Z'));
  assert.equal(await testOnly.latestApm(path.join(dir,'APM01 Agents_*.xlsx')),newer);
  await assert.rejects(testOnly.latestApm(path.join(dir,'APM01 Agent_*.xlsx')),/Mẫu APM01 không hợp lệ/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});


test('BC02 đã chọn phạm vi tải: giữ tất cả ngày thu, không chia lại theo tháng',()=>{
 const person={...agent('D002'),AD:'AD mẫu'};
 const input=[
  {...contract('Có hiệu lực',10,10),'NGÀY THU':'31/10/2026'},
  {...contract('Đang ĐGRR',20,20),'NGÀY THU':'01/11/2026'},
  {...contract('Chờ kiểm tra YCBH',30,30),'NGÀY THU':'02/12/2026'},
  {...contract('Từ chối',40,40),'NGÀY THU':'04/11/2026'}
 ];
 const result=testOnly.buildTamthu(input,[person]);
 assert.equal(result.sheet2.length,4);
 assert.equal(result.sheet4.length,3);
 assert.deepEqual(result.sheet2.map(row=>row['Ngày hiệu lực']),
  ['31/10/2026','01/11/2026','02/12/2026','04/11/2026']);
 assert.deepEqual(result.sheet4.map(row=>row['Ngày hiệu lực']),
  ['31/10/2026','01/11/2026','02/12/2026']);
 assert.equal(result.audit.before.ip,100);
 assert.equal(result.audit.after.ip,60);
 assert.equal(result.sheet2[0]['TÍNH LƯỢT 3 tr'],100);
 assert.equal(result.sheet4[0]['TÍNH LƯỢT 3 tr'],60);
});

test('BC02 không tự loại hợp đồng thiếu ngày thu nếu báo cáo đầu vào vẫn có dòng',()=>{
 const person={...agent('D002'),AD:'AD mẫu'};
 const source=[{...contract('Có hiệu lực',50,50),'NGÀY THU':''}];
 const result=testOnly.buildTamthu(source,[person]);
 assert.equal(result.sheet2.length,1);
 assert.equal(result.sheet4.length,1);
 assert.equal(result.sheet4[0]['Ngày hiệu lực'],'');
});

test('TRỪ HỦY theo đúng bốn trạng thái đã dùng trong mẫu Tamthu',()=>{
 const person={...agent('D002'),AD:'AD mẫu'};
 const statuses=['Từ chối','YCBH hết hiệu lực','Trì hoãn','hết hiệu lực'];
 const source=[
  ...statuses.map((name,index)=>({...contract(name,10,10),'SỐ HỢP ĐỒNG':String(index)})),
  {...contract('Có hiệu lực',20,20),'SỐ HỢP ĐỒNG':'5'}
 ];
 const result=testOnly.buildTamthu(source,[person]);
 assert.equal(result.sheet2.length,5);
 assert.deepEqual(result.sheet2.map(row=>row['TRỪ HỦY']),[0,0,0,0,1]);
 assert.equal(result.sheet4.length,1);
 assert.equal(result.sheet4[0]['PĐT + 10% ĐT'],20);
 assert.equal(result.audit.removed,4);
});

const kpi04=(contractNumber,issueDate,ip,afyp,agentCode='D002',effectiveDate=issueDate)=>({
 'Kênh':'Agency','Mã ban':'B01','Tên ban':'Ban A','Mã nhóm':'N01','Tên nhóm':'Nhóm A',
 'Mã đại lý':agentCode,'Tên đại lý':'Nhân sự mẫu','Ngày bắt đầu làm việc':'01-01-2026',
 'Hợp đồng':contractNumber,'Ngày hiệu lực':effectiveDate,'Ngày phát hành':issueDate,IP:ip,AFYP:afyp,
});

test('KPI04 chia lịch sử theo Ngày phát hành và tính lượt theo TVV trong từng tháng',async()=>{
 const XLSX=(await import('xlsx')).default;
 const person={...agent('D002'),AD:'AD mẫu','Mã TVV tuyển dụng':'D009'};
 const result=testOnly.buildKpi04([
  kpi04('JAN-1','05-01-2026',10,11,'D002','31-12-2025'),
  kpi04('JAN-2','20-01-2026',20,22),
  kpi04('FEB-1','02-02-2026',30,33),
  kpi04('CANCELLED','03-02-2026',0,99),
  kpi04('NOV-1','03-11-2026',40,44),
 ],[person],{currentMonth:'2026-11',mode:'history'});
 const book=XLSX.read(result.input.csv,{type:'string'});
 const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
 assert.equal(rows.length,3);
 assert.deepEqual(result.input.months,['2026-01','2026-02','2026-03','2026-04','2026-05',
  '2026-06','2026-07','2026-08','2026-09','2026-10']);
 assert.deepEqual(rows.map(row=>row['Nguồn dữ liệu']),
  ['NMC_DOANHSO:2026-01','NMC_DOANHSO:2026-01','NMC_DOANHSO:2026-02']);
 assert.equal(rows[0]['Ngày hiệu lực'],'31-12-2025');
 assert.deepEqual(rows.map(row=>Number(row['TÍNH LƯỢT 3 tr'])),[30,0,30]);
 assert.equal(rows[0].AD,'AD mẫu');
 assert.equal(rows[0]['MÃ ĐL TD'],'D009');
 assert.equal(rows[0]['Chức vụ'],'Tư vấn tài chính');
 assert.equal(result.audit.excludedNonPositiveIp,1);
});

test('KPI04 dùng đúng nhãn nhóm Cautruc để lấy AD khi TVV lịch sử không còn trong APM01',async()=>{
 const XLSX=(await import('xlsx')).default;
 const result=testOnly.buildKpi04([
  kpi04('OLD-AGENT','05-10-2026',10,11,'OLD-CODE'),
 ],[],{currentMonth:'2026-11',mode:'history',adMap:new Map([['Nhóm A','AD đối chiếu']])});
 const book=XLSX.read(result.input.csv,{type:'string'});
 const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
 assert.equal(rows[0].AD,'AD đối chiếu');
 assert.equal(result.audit.missingApm,1);
 assert.equal(result.audit.missingAd,0);
});

test('KPI04 chỉ lấy AD Doanhso theo đúng Số hợp đồng và tháng chốt 1-10',async()=>{
 const XLSX=(await import('xlsx')).default;
 const result=testOnly.buildKpi04([
  kpi04('OLD-1','05-10-2026',10,11,'OLD-CODE'),
  kpi04('OLD-2','06-10-2026',20,22,'OLD-CODE'),
  kpi04('CANCELLED','07-10-2026',0,99,'OLD-CODE'),
 ],[],{currentMonth:'2026-11',mode:'history',legacyAdThroughMonth:10,
  legacyAdMap:new Map([['OLD-1','AD Doanhso'],['CANCELLED','AD Doanhso']])});
 const book=XLSX.read(result.input.csv,{type:'string'});
 const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
 assert.equal(rows[0].AD,'AD Doanhso');
 assert.equal(rows[1].AD,'');
 assert.deepEqual(rows.map(row=>Number(row['TÍNH LƯỢT 3 tr'])),[30,0]);
 assert.equal(result.audit.legacyAdApplied,1);
 assert.equal(result.audit.missingAd,1);
 assert.equal(result.audit.excludedNonPositiveIp,1);
});

test('KPI04 không dùng AD Doanhso cho tháng 11 trở đi hoặc HĐ tồn',async()=>{
 const XLSX=(await import('xlsx')).default;
 const map=new Map([['NOV-1','AD cũ']]);
 const carry=testOnly.buildKpi04([
  kpi04('NOV-1','03-11-2026',10,10,'OLD-CODE','31-10-2026'),
 ],[],{currentMonth:'2026-11',mode:'carryover',legacyAdThroughMonth:10,legacyAdMap:map});
 const book=XLSX.read(carry.input.csv,{type:'string'});
 const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
 assert.equal(rows[0].AD,'');
 assert.equal(carry.audit.legacyAdApplied,0);
 assert.equal(carry.audit.missingAd,1);
});

test('Doanhso AD map chặn cùng Số hợp đồng có hai AD',async()=>{
 const XLSX=(await import('xlsx')).default;
 const book={SheetNames:['1','2'],Sheets:{
  '1':XLSX.utils.aoa_to_sheet([['Số hợp đồng','AD'],['A','AD 1']]),
  '2':XLSX.utils.aoa_to_sheet([['Số hợp đồng','AD'],['A','AD 2']]),
 }};
 assert.throws(()=>testOnly.legacyAdByContract(book,{throughMonth:10}),/AD mâu thuẫn/);
});

test('KPI04 tháng hiện tại chỉ giữ HĐ phát hành tháng T và hiệu lực tháng T-1',async()=>{
 const XLSX=(await import('xlsx')).default;
 const person={...agent('D002'),AD:'AD mẫu'};
 const result=testOnly.buildKpi04([
  kpi04('OLD-1','05-10-2026',10,10,'D002','01-10-2026'),
  kpi04('CURRENT-EFFECTIVE','03-11-2026',20,20,'D002','02-11-2026'),
  kpi04('OLDER-EFFECTIVE','04-11-2026',30,30,'D002','15-09-2026'),
  kpi04('CANCELLED','05-11-2026',0,50,'D002','31-10-2026'),
  kpi04('CARRY-1','06-11-2026',40,40,'D002','31-10-2026'),
 ],[person],{currentMonth:'2026-11',mode:'carryover'});
 const book=XLSX.read(result.input.csv,{type:'string'});
 const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
 assert.equal(rows.length,1);
 assert.equal(rows[0]['Số hợp đồng'],'CARRY-1');
 assert.equal(result.audit.excludedEffectiveMonth,2);
 assert.equal(result.audit.excludedNonPositiveIp,1);
 assert.equal(result.input.month,'2026-11');
});

test('KPI04 HĐ tồn xử lý đúng T-1 khi tháng hiện tại là tháng 1',async()=>{
 const XLSX=(await import('xlsx')).default;
 const person={...agent('D002'),AD:'AD mẫu'};
 const result=testOnly.buildKpi04([
  kpi04('DEC-EFFECTIVE','02-01-2027',10,10,'D002','15-12-2026'),
  kpi04('JAN-EFFECTIVE','03-01-2027',20,20,'D002','01-01-2027'),
 ],[person],{currentMonth:'2027-01',mode:'carryover'});
 const book=XLSX.read(result.input.csv,{type:'string'});
 const rows=XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{defval:'',raw:false});
 assert.deepEqual(rows.map(row=>row['Số hợp đồng']),['DEC-EFFECTIVE']);
 assert.equal(result.audit.excludedEffectiveMonth,1);
});

test('KPI04 chặn ngày sai và Số hợp đồng trùng',()=>{
 const person={...agent('D002'),AD:'AD mẫu'};
 assert.throws(()=>testOnly.buildKpi04([kpi04('A','31-02-2026',10,10)],[person],{
  currentMonth:'2026-11',mode:'history'
 }),/không tồn tại/);
 assert.throws(()=>testOnly.buildKpi04([
  kpi04('A','01-01-2026',10,10),kpi04('A','02-01-2026',20,20)
 ],[person],{currentMonth:'2026-11',mode:'history'}),/trùng Số hợp đồng/);
});


// Synthetic DMS workbooks: the real APM01 exporter may prepend a report title.
test('APM01 reads the true header below report title / blank rows', async()=>{
 const XLSX=(await import('xlsx')).default;
 const row=['Ban','Nhóm','Mã TVV','Tên TVV','Ngày bắt đầu làm việc','Trạng thái TVV',
    'Chức vụ TVV','Ngày hiệu lực chức vụ','Mã TVV tuyển dụng'];
 const values=[
  ['APM01 Agent Detail Information'],[],['Bao cao chot ngay 05/11/2026'],
  row,['Ban A','Nhom A','D001','Nhan su mau','01/01/2026','Hoat dong',
   'Tu van tai chinh','01/01/2026','D000']
 ];
 const book={SheetNames:['Export'],Sheets:{Export:XLSX.utils.aoa_to_sheet(values)}};
 const actual=testOnly.apmRows(book);
 assert.equal(actual.rows.length,1);
 assert.equal(actual.rows[0]['Mã TVV'],'D001');
 assert.equal(actual.rows[0]['Tên TVV'],'Nhan su mau');
});

test('APM01 accepts header not starting at first column',async()=>{
 const XLSX=(await import('xlsx')).default;
 const book={SheetNames:['Sheet1'],Sheets:{Sheet1:XLSX.utils.aoa_to_sheet([
  ['Tai lieu DMS'],['STT','Mã TVV','Tên TVV','Chức vụ TVV'],
  [1,'D002','Nhan su mau','Truong nhom']
 ])}};
 assert.equal(testOnly.apmRows(book).rows[0]['Mã TVV'],'D002');
});

test('APM01 rejects unknown report structure instead of overwriting live data',async()=>{
 const XLSX=(await import('xlsx')).default;
 const book={SheetNames:['Sheet1'],Sheets:{Sheet1:XLSX.utils.aoa_to_sheet([
  ['Ma so','Ho ten','Nguoi quan ly'],['D001','A','B']
 ])}};
 assert.throws(()=>testOnly.apmRows(book),/tiêu đề APM01/);
});


test('APM01: Excel dòng 1 trống, dòng 2 tiêu đề cột, dòng 3 dữ liệu',async()=>{
 const XLSX=(await import('xlsx')).default;
 const header=['STT','Mã TVV','Tên','Chức vụ','Trạng thái','Ngày bắt đầu làm việc',
  'Ngày hiệu lực CV','Mã TVV TD','Mã Ban/Nhóm','Nhóm','Ban','AD'];
 const book={SheetNames:['Bao cao DMS'],Sheets:{'Bao cao DMS':XLSX.utils.aoa_to_sheet([
   [],header,[1,'D101','Nguyễn Thị A','Trưởng nhóm','Hoạt động','02/02/2026',
   '03/02/2026','D001','U001','Nhóm A','Ban A','AD A']
 ])}};
 const result=testOnly.apmRows(book);
 assert.equal(result.rows.length,1);
 assert.equal(result.rows[0]['Mã TVV'],'D101');
 assert.equal(result.rows[0]['Tên TVV'],'Nguyễn Thị A');
 assert.equal(result.rows[0]['Chức vụ TVV'],'Trưởng nhóm');
 assert.equal(result.rows[0]['Trạng thái TVV'],'Hoạt động');
 assert.equal(result.rows[0]['Mã TVV tuyển dụng'],'D001');
 assert.equal(result.rows[0]['Mã nhóm'],'U001');
 assert.equal(testOnly.buildStructure(result.rows).leaders.length,1);
});

test('Cautruc có DS CLB và tuyen-ngang không phải là sheet APM01',async()=>{
 const XLSX=(await import('xlsx')).default;
 const book={SheetNames:['DS CLB','tuyen-ngang'],Sheets:{
   'DS CLB':XLSX.utils.aoa_to_sheet([['Mã số','Họ tên'],['D001','A']]),
   'tuyen-ngang':XLSX.utils.aoa_to_sheet([['NHÓM','MÃ TVV','HỌ TÊN'],['N1','D001','A']])
 }};
 assert.equal(testOnly.referenceAdMap(book).size,0);
 assert.throws(()=>testOnly.apmRows(book),/Không nhận diện được tiêu đề APM01/);
});

test('Cautruc có bảng tên nhóm và AD được đọc riêng, không dùng APM01 parser',async()=>{
 const XLSX=(await import('xlsx')).default;
 const book={SheetNames:['DS AD'],Sheets:{
   'DS AD':XLSX.utils.aoa_to_sheet([['Nhóm','AD'],['Nhóm A','AD A']])
 }};
 assert.equal(testOnly.referenceAdMap(book).get('Nhóm A'),'AD A');
});

test('APM01 tiêu đề thiếu tên TVV báo chính xác tên cột ở dòng 2',async()=>{
 const XLSX=(await import('xlsx')).default;
 const book={SheetNames:['Export'],Sheets:{
   Export:XLSX.utils.aoa_to_sheet([[],['Mã TVV','Chức vụ','Cột lạ'],['D001','TVV','?']])
 }};
 assert.throws(()=>testOnly.apmRows(book),error=>
   /dòng 2/.test(error.message) && /Cột lạ/.test(error.message));
});
