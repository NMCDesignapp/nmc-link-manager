import test from 'node:test';
import assert from 'node:assert/strict';
import { registeredFypBaseline } from '../src/lib/contest-registered-fyp.ts';
import { computeRegisteredResults, registeredExportRows } from '../src/lib/contest-registered-results.ts';
import { parseTargetSheet, defaultRegisteredProgram } from '../src/lib/contest-registered-targets.ts';
import { parseContestConfig, type Contract } from '../src/lib/contest-calculator.ts';
const c=(id:string,ip:number,extra={})=>({id,contractNumber:id,agentCode:'A',pdt10DT:ip,afyp:ip*2,effectiveDate:'2026-10-05',issueDate:'2026-10-10',maNhom:'G',...extra}) as Contract;
const p=()=>({...defaultRegisteredProgram(),rows:parseTargetSheet([['Nhóm','Mã số','Họ tên','Mục tiêu đăng ký'],['Demo','A','Tên mẫu',100]])});
const cfg=()=>parseContestConfig({startDate:'2026-10-01',endDate:'2026-10-31'});
test('four-column imports generate STT and omit position; old seven-column files still work',()=>{
 const rows=p().rows;assert.equal(rows[0].stt,'1');assert.equal(rows[0].classification,1);assert.equal(rows[0].position,'');
 const old=parseTargetSheet([['STT','Nhóm','Mã số','Họ tên TVV','Chức vụ','Mục tiêu đăng ký','Phân loại'],[8,'Demo','B','Tên B','TVV',100,3]]);assert.equal(old[0].classification,3);
});
test('baseline subtracts ordinary October IP from personal Sao Viet by normalized code',()=>{
 const r=registeredFypBaseline([c('1',20),c('2',10),c('3',999,{carryoverMonth:'2026-10'}),c('4',999,{nguonDuLieu:'NMC_DOANHSO:2026-09'})],[{agentCode:' a ',fyp:120}]);assert.equal(r.get('A'),90);
});
test('October source month wins over effective/issue dates, otherwise issue date wins',()=>{
 const rows=[c('1',20,{nguonDuLieu:'NMC_TAMTHU:2026-10',effectiveDate:'2026-09-01',issueDate:'2026-09-02'}),c('2',10,{issueDate:'2026-11-01'}),c('3',5,{effectiveDate:'2026-09-30',issueDate:'2026-10-01'}),c('4',7,{issueDate:''})];
 assert.equal(registeredFypBaseline(rows,[{agentCode:'A',fyp:100}]).get('A'),68);
});
test('baseline is independent of contest threshold/date filtering and does not affect reward',()=>{
 const program={...p(),minIP:15};
 const r=computeRegisteredResults([c('1',20),c('2',10)],cfg(),program,[],[],[{agentCode:'A',fyp:120}])[0];assert.equal(r.cumulativeFyp,90);assert.equal(r.actual,20);assert.equal(r.percent,20);
});
test('missing/ambiguous Sao Viet codes are unknown, never a fabricated zero; negatives remain exact',()=>{
 assert.equal(computeRegisteredResults([],cfg(),p())[0].cumulativeFyp,null);
 assert.equal(registeredFypBaseline([],[{agentCode:'A',fyp:10},{agentCode:' a ',fyp:20}]).get('A'),null);
 assert.equal(registeredFypBaseline([c('1',20)],[{agentCode:'A',fyp:10}]).get('A'),-10);
 assert.equal(registeredFypBaseline([],[{agentCode:'A',fyp:0}]).get('A'),0);
});
test('group cumulative FYP uses displayed TN personal code while contest actual remains group total',()=>{
 const program={...p(),scope:'nhom' as const,rows:[{...p().rows[0],code:'G'}]};
 const rows=[c('1',30,{agentCode:'TN'}),c('2',70)];
 const r=computeRegisteredResults(rows,cfg(),program,[],[{agentCode:'TN',agentName:'TN mẫu',maNhom:'G',position:'Trưởng nhóm'}],[{agentCode:'TN',fyp:500}])[0];assert.equal(r.actual,100);assert.equal(r.cumulativeFyp,470);
});
test('nine result/export columns match app order and exclude position, classification, internal group code',()=>{
 const r=computeRegisteredResults([c('1',20)],cfg(),p(),[],[],[{agentCode:'A',fyp:120}]);const rows=registeredExportRows(r,p());
 assert.equal(rows[0].length,9);assert.equal(rows[1][4],100);assert.equal(rows[1][5],100);assert.equal(rows[1][6],20);assert.match(String(rows[0][4]),/01\/12\/25 - 30\/11\/26/);assert.ok(!rows[0].join(' ').includes('CHỨC VỤ'));
});
