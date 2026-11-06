import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {testOnly,isDmsSource} from '../data-hub/dms-auto-source.mjs';
const agent=(id,role='Tư vấn tài chính')=>({
 'Mã TVV':id,'Tên TVV':'Nhân sự mẫu','Chức vụ TVV':role,
 'Trạng thái TVV':'Hoạt động','Ngày bắt đầu làm việc':'01/01/2026',
 'Ngày hiệu lực chức vụ':'05/01/2026','Mã TVV tuyển dụng':'D001',
 'Mã nhóm':'N01','Ban':'Ban A','Nhóm':'Nhóm A','Ngày sinh (ngày)':'39000'
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
test('APM sinh ba bảng tối thiểu, không đưa ngày sinh lên app',()=>{
 const r=testOnly.buildStructure([agent('D001'),agent('D002','Trưởng nhóm'),
 agent('D003','Tiền trưởng nhóm')]);
 assert.equal(r.tvv.length,3);assert.equal(r.leaders.length,1);
 assert.equal(r.recruiters.length,1);
 assert.equal('Ghi chú' in r.tvv[0],false);
 assert.equal('Ngày sinh (ngày)' in r.tvv[0],false);
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
