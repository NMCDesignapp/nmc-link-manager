import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseTargetSheet, defaultRegisteredProgram, decodeRegisteredProgram, type RegisteredProgram } from '../src/lib/contest-registered-targets.ts';
import { computeRegisteredResults, registeredExportRows } from '../src/lib/contest-registered-results.ts';
import { parseContestConfig, type Contract } from '../src/lib/contest-calculator.ts';
const heads=['STT','Nhóm','Mã số','Họ tên TVV','Chức vụ','Mục tiêu đăng ký','Phân loại'];
const sample=[[1,'Demo','001','Người A','TVV','10.000.000',1],[2,'Demo','002','Người B','TVV',20_000_000,1]];
const program=(): RegisteredProgram=>({...defaultRegisteredProgram(),rows:parseTargetSheet([heads,...sample]),tiers:[{id:'100',minPercent:100,type:'money' as const,amount:100_000,text:''},{id:'120',minPercent:120,type:'money' as const,amount:200_000,text:''}]});
const cfg=()=>parseContestConfig({startDate:'2026-10-01',endDate:'2026-10-31',conditionType:'total_ip',targetType:'tvv'});
const contract=(id:string,agentCode:string,ip:number,extra={})=>({id,contractNumber:id,agentCode,agentName:'Tên trên doanh số khác file',maNhom:'G01',effectiveDate:'2026-10-10',issueDate:'2026-10-11',pdt10DT:ip,afyp:ip*2,...extra}) as Contract;
test('real XLSX roundtrip preserves text codes, exact đồng and file order',()=>{
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([heads,...sample]),'Doi tuong');
 const reread=XLSX.read(XLSX.write(book,{type:'buffer',bookType:'xlsx'}));
 const rows=parseTargetSheet(XLSX.utils.sheet_to_json(reread.Sheets.Doi_tuong||reread.Sheets['Doi tuong'],{header:1,raw:false,defval:''}));
 assert.equal(rows[0].code,'001');assert.equal(rows[0].target,10_000_000);assert.equal(rows[1].target,20_000_000);
});
test('reject duplicate normalized IDs, missing headers, blanks, zero/negative/invalid targets',()=>{
 for(const rows of [[heads,...sample,[3,'Demo',' 001 ','X','TVV',1]],[['Mã số'],['x']],[heads,[1,'D','','A','TVV',1]],[heads,[1,'D','A','A','TVV',0]],[heads,[1,'D','A','A','TVV',-1]],[heads,[1,'D','A','A','TVV','abc100']]]) assert.throws(()=>parseTargetSheet(rows));
});
test('TVV uses normalized code, includes zero-sales entrants and excludes outsiders',()=>{
 const p=program();const results=computeRegisteredResults([contract('1',' 001 ',4_000_000),contract('2','001',8_000_000),contract('3','OUT',99_000_000)],cfg(),p,[],[],null,{'001':true});
 assert.equal(results.length,2);assert.equal(results[0].actual,12_000_000);assert.equal(results[0].bonus,200_000);assert.equal(results[0].name,'Người A');assert.equal(results[1].actual,0);assert.equal(results[1].tier,null);
});
test('group uses only group code, sums multiple agents, never groups by names',()=>{
 const p={...program(),scope:'nhom' as const,rows:[{...program().rows[0],code:'G01'}]};
 const rows=computeRegisteredResults([contract('1','001',4_000_000),contract('2','002',6_000_000),contract('3','G01',99_000_000,{maNhom:'OTHER',nhom:'Demo'})],cfg(),p,[],[],null,{'G01':true});
 assert.equal(rows[0].actual,10_000_000);assert.equal(rows[0].bonus,100_000);
 const fallback=computeRegisteredResults([contract('4','003',2_000_000,{maNhom:''})],cfg(),p,[{agentCode:'003',maBanNhom:'G01'}]);assert.equal(fallback[0].actual,2_000_000);
});
test('near threshold never rewards because displayed percentage rounded up; exact boundary does',()=>{
 const p=program();const r=computeRegisteredResults([contract('1','001',9_999_999)],cfg(),p)[0];assert.equal(r.tier,null);
 assert.equal(computeRegisteredResults([contract('1','001',10_000_000)],cfg(),p,[],[],null,{'001':true})[0].bonus,100_000);
});
test('AFYP actual, per-HĐ filters, highest tier and percentage reward base',()=>{
 const p={...program(),metric:'afyp' as const,minIP:1_000_000,minAFYP:3_000_000,tiers:[{id:'a',minPercent:100,type:'percent_ip' as const,amount:10,text:''}]};
 const r=computeRegisteredResults([contract('a','001',6_000_000),contract('b','001',500_000)],cfg(),p,[],[],null,{'001':true})[0];assert.equal(r.actual,12_000_000);assert.equal(r.bonus,600_000);
 p.tiers=[{...p.tiers[0],type:'percent_afyp'} as any];assert.equal(computeRegisteredResults([contract('a','001',6_000_000)],cfg(),p,[],[],null,{'001':true})[0].bonus,1_200_000);
});
test('carryover only with issue condition, intersects date ranges and deduplicates contracts',()=>{
 const rows=[contract('a','001',5_000_000),contract('a','001',5_000_000,{carryoverMonth:'2026-10'}),contract('b','001',6_000_000,{carryoverMonth:'2026-10'}),contract('c','001',9_000_000,{issueDate:'2026-11-01'}),contract('d','001',9_000_000,{effectiveDate:'2026-09-30'})];
 assert.equal(computeRegisteredResults(rows,cfg(),program())[0].actual,14_000_000);
 assert.equal(computeRegisteredResults(rows,{...cfg(),issueDate:'2026-10-01',issueEndDate:'2026-10-31'},program())[0].actual,11_000_000);
});
test('saved payload roundtrip and legacy participant arrays remain compatible',()=>{
 const p=program();const raw=JSON.stringify(p);assert.deepEqual(decodeRegisteredProgram(raw),p);
 const c=parseContestConfig({participants:raw});assert.deepEqual(c.registeredProgram,p);assert.deepEqual(c.participants,['001','002']);
 assert.deepEqual(parseContestConfig({participants:'["A"]'}).participants,['A']);assert.equal(parseContestConfig({participants:'["A"]'}).registeredProgram,null);
});
test('Excel columns retain exact numbers in đồng and gift rewards',()=>{
 const p=program();p.tiers=[{id:'g',minPercent:100,type:'gift',amount:0,text:'Demo Gift'} as any];
 const rows=computeRegisteredResults([contract('a','001',10_000_000)],cfg(),p,[],[],null,{'001':true});const data=registeredExportRows(rows,p);
 assert.equal(data[1][5],'✓');assert.equal(data[1][6],10_000_000);assert.equal(data[1][7],10_000_000);assert.equal(data[1][9],'Demo Gift');assert.equal(rows[0].bonus,0);
});
test('group exports show TN identity and never expose the internal group code',()=>{
 const p={...program(),scope:'nhom' as const,rows:[{...program().rows[0],code:'GROUP-INTERNAL'}]};
 const leaders=[{agentCode:'LEADER-A',agentName:'TN mẫu',maBanNhom:'GROUP-INTERNAL',chucVu:'Trưởng nhóm'}];
 const results=computeRegisteredResults([contract('g','001',10_000_000,{maNhom:'GROUP-INTERNAL'})],cfg(),p,[],leaders);
 assert.equal(results[0].actual,10_000_000);assert.equal(results[0].leaderCode,'LEADER-A');
 const out=registeredExportRows(results,p);assert.equal(out[0][2],'MÃ TN');assert.equal(out[0][3],'HỌ TÊN TN');assert.equal(out[1][2],'LEADER-A');assert.equal(out[1][3],'TN mẫu');assert.ok(!JSON.stringify(out).includes('GROUP-INTERNAL'));
});
test('group chooses the TN instead of TB in the same group',()=>{
 const p={...program(),scope:'nhom' as const,rows:[{...program().rows[0],code:'G01'}]};
 const leaders=[{agentCode:'TB',agentName:'TB mẫu',maNhom:'G01',position:'Trưởng ban'},{agentCode:'TN',agentName:'TN mẫu',maNhom:'G01',position:'Trưởng nhóm'}];
 assert.equal(computeRegisteredResults([],cfg(),p,[],leaders)[0].leaderCode,'TN');
});
test('missing/ambiguous TN never falls back to displaying group code as a person code',()=>{
 const p={...program(),scope:'nhom' as const,rows:[{...program().rows[0],code:'GROUP-INTERNAL'}]};
 const out=registeredExportRows(computeRegisteredResults([],cfg(),p),p);
 assert.equal(out[1][2],'—');assert.ok(!JSON.stringify(out).includes('GROUP-INTERNAL'));
});
test('optional classification accepts only 1, 2, 3 when provided',()=>{
 for(const value of ['',0,4,1.5,'Nhóm 1']) assert.throws(()=>parseTargetSheet([heads,[1,'Demo','A','Người A','TVV',100,value]]),/Phân loại/);
 assert.equal(parseTargetSheet([heads.slice(0,-1),sample[0].slice(0,-1)])[0].classification,1);
 for(const value of [1,2,3]) assert.equal(parseTargetSheet([heads,[1,'Demo','A','Người A','TVV',100,value]])[0].classification,value);
});
test('each classification has independent money, gift and percentage rewards at the same completion',()=>{
 const p=program();p.rows=[1,2,3].map(n=>({...p.rows[0],code:`A${n}`,classification:n as 1|2|3}));
 p.tiers=[{id:'a',classification:1,minPercent:100,type:'money',amount:123,text:''},{id:'b',classification:2,minPercent:100,type:'gift',amount:0,text:'Quà nhóm 2'},{id:'c',classification:3,minPercent:100,type:'percent_ip',amount:10,text:''}];
 const saved=decodeRegisteredProgram(JSON.stringify(p))!;
 const rows=computeRegisteredResults([1,2,3].map(n=>contract(String(n),`A${n}`,10_000_000)),cfg(),saved,[],[],null,{'A1':true,'A2':true,'A3':true});
 assert.equal(rows[0].bonus,123);assert.equal(rows[1].bonus,0);assert.equal(rows[1].tier?.text,'Quà nhóm 2');assert.equal(rows[2].bonus,1_000_000);
 const exp=registeredExportRows(rows,p);assert.ok(!exp[0].includes('Phân loại'));assert.equal(exp[0].length,10);
});
test('missing classification rewards fail validation instead of borrowing another group tier',()=>{
 const p=program();p.rows=[{...p.rows[0],classification:2}];
 assert.throws(()=>decodeRegisteredProgram(p),/phân loại/);
 assert.equal(computeRegisteredResults([contract('x','001',99_000_000)],cfg(),p)[0].tier,null);
});
test('classification 2 can have a different threshold without changing classification 1',()=>{
 const p=program();p.rows=[{...p.rows[0],code:'A',classification:1},{...p.rows[0],code:'B',classification:2}];
 p.tiers=[{id:'a',classification:1,minPercent:100,type:'money',amount:100,text:''},{id:'b',classification:2,minPercent:120,type:'money',amount:999,text:''}];
 const rows=computeRegisteredResults([contract('a','A',10_000_000),contract('b','B',10_000_000)],cfg(),p,[],[],null,{'A':true,'B':true});
 assert.equal(rows[0].bonus,100);assert.equal(rows[1].tier,null);
});
test('legacy saved registration data without classification remains group 1',()=>{
 const p=program();delete p.rows[0].classification;delete p.rows[1].classification;
 assert.equal(decodeRegisteredProgram(p)!.rows[0].classification,1);
});

test('approval is required even after achieving 100%, including gifts and percentage rewards',()=>{
 const p=program();
 const contracts=[contract('a','001',12_000_000)];
 const unapproved=computeRegisteredResults(contracts,cfg(),p)[0];
 assert.equal(unapproved.actual,12_000_000);
 assert.equal(unapproved.achievedTarget,true);
 assert.equal(unapproved.approved,false);
 assert.equal(unapproved.bonus,0);
 assert.equal(unapproved.tier,null);
 assert.equal(registeredExportRows([unapproved],p)[1][9],'Chưa đạt SV/nâng hạng');
 const paid=computeRegisteredResults(contracts,cfg(),p,[],[],null,{'001':true})[0];
 assert.equal(paid.bonus,200_000);
 assert.equal(paid.approved,true);
 assert.equal(registeredExportRows([paid],p)[1][5],'✓');
 const below=computeRegisteredResults([contract('b','001',9_999_999)],cfg(),p,[],[],null,{'001':true})[0];
 assert.equal(below.bonus,0);
 assert.equal(registeredExportRows([below],p)[1][9],'Chưa đạt');
 for (const type of ['gift','percent_ip','percent_afyp'] as const) {
   p.tiers=[{id:type,minPercent:100,type,amount:10,text:'Quà thử nghiệm'}];
   const r=computeRegisteredResults(contracts,cfg(),p)[0];
   assert.equal(r.tier,null);
   assert.equal(r.bonus,0);
   assert.equal(registeredExportRows([r],p)[1][9],'Chưa đạt SV/nâng hạng');
 }
});

test('app ignores source STT and renumbers imports, legacy settings and filtered Excel exports',()=>{
  const customHeads=['STT','Nhóm','Mã số','Họ tên','Mục tiêu đăng ký'];
  const imported=parseTargetSheet([customHeads,['98','A','AA','Người A',100],['1','B','BB','Người B',200]]);
  assert.deepEqual(imported.map(r=>r.stt),['1','2']);
  const restored=decodeRegisteredProgram({...program(),rows:imported.map((r,i)=>({...r,stt:String(i*90+42)}))})!;
  assert.deepEqual(restored.rows.map(r=>r.stt),['1','2']);
  const configured={...program(),rows:restored.rows};
  const evaluated=computeRegisteredResults([],cfg(),configured);
  assert.deepEqual(registeredExportRows(evaluated.slice(1),configured).slice(1).map(r=>r[0]),[1]);
});

test('opt-in shortfall display keeps reward and SV eligibility logic intact',()=>{
 const p=program();
 const below=computeRegisteredResults([],cfg(),p)[0];
 const example={...below,target:200_000_000,actual:150_000_000};
 assert.equal(registeredExportRows([example],p,true)[1][9],'-50.000.000');
 assert.equal(registeredExportRows([example],p)[1][9],'Chưa đạt');
 const met={...example,actual:200_000_000,achievedTarget:true,approved:false};
 assert.equal(registeredExportRows([met],p,true)[1][9],'Chưa đạt SV/nâng hạng');
 assert.equal(registeredExportRows([{...met,approved:true,tier:p.tiers[0],bonus:123}],p,true)[1][9],123);
});
