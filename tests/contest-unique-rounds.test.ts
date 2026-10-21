import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as calc from '../src/lib/contest-calculator.ts';
import { expandActivityExportDetails } from '../src/lib/contest-export-details.ts';
import type { Contract, TVVStructMember, RecruiterMember } from '../src/lib/contest-calculator.ts';
const row=(id:string,code:string,value=12,date='2026-09-10')=>({id,contractNumber:id,agentCode:code,agentName:code,maDaiLyTD:'NTD',nhom:'G',maNhom:'G',effectiveDate:date,issueDate:'2026-10-05',pdt10DT:value,afyp:value*2,tinhLuot3tr:value} as Contract);
const input=[row('normal','A',22),row('carryover',' a ',34,'2026-09-27'),row('other','B',13,'2026-09-30')];
const config=(extra={})=>calc.parseContestConfig({conditionType:'total_ip',targetType:'nyd',participants:'["NTD"]',startDate:'2026-09-01',endDate:'2026-09-30',issueDate:'2026-09-01',issueEndDate:'2026-10-10',useSecondaryCondition:true,secondaryLuotHDCMin:3,luotHDThreshold:3,luotHDCTThreshold:12,bonusTiers:JSON.stringify([{id:'gift',minFYP:50,maxFYP:null,bonusType:'gift',bonusText:'Demo',bonusAmount:0}]),...extra});
const starts=new Map([['A','2026-08-18'],['B','2026-09-18']]);
const structure=[...starts].map(([agentCode,ngayBatDau])=>({agentCode,ngayBatDau,maBanNhom:'G'} as TVVStructMember));
for(const mode of ['activity_round','activity_round_standard','activity_round_tvvm','activity_round_standard_tvvm','activity_round_tvv90'] as const) test(`${mode}: multiple HĐ and source/month aliases count a TVV once`,()=>{
 assert.equal(calc.calculateLuot(input,12,mode,3,12,starts),2);
 assert.equal(calc.filterQualifyingActivityContracts(input,12,mode,3,12,starts).length,2);
});
test('primary IP stays complete but supplementary rounds require three distinct agents',()=>{
 const cfg=config();const data=calc.computeNYDData(input,cfg,[{agentCode:'NTD',agentName:'Demo',nhom:'G'} as RecruiterMember],[],structure);
 const result=calc.computeNYDResultRows(data,cfg,structure)[0];
 assert.equal(result.value,69);assert.equal(result.secondaryCheck.luotHDC,2);assert.equal(result.effectiveTier,null);
 const third=row('third','C',12);const next=calc.computeNYDResultRows(calc.computeNYDData([...input,third],cfg,[{agentCode:'NTD',agentName:'Demo',nhom:'G'} as RecruiterMember],[],structure),cfg,structure)[0];
 assert.equal(next.secondaryCheck.luotHDC,3);assert.ok(next.effectiveTier);
});
test('lower row cannot block a later qualifying row; blanks never invent a TVV',()=>{
 const rows=[row('low','A',2),row('good','A',12),row('blank',' ',100)];
 assert.equal(calc.calculateLuot(rows,12,'activity_round_standard'),1);
 assert.deepEqual(calc.filterQualifyingActivityContracts(rows,12,'activity_round_standard').map(c=>c.id),['good']);
});
test('earliest qualifying HĐ deterministically owns the one round across the entire two-phase program',()=>{
 const cfg=config({conditionType:'activity_round_standard',targetType:'tvv',useSecondaryCondition:false,usePhase2:true,phase2StartDate:'2026-09-16',bonusTiers:'[{"id":"a","minFYP":1,"maxFYP":null,"bonusType":"money_per_round","bonusAmount":100}]',bonusTiers2:'[{"id":"b","minFYP":1,"maxFYP":null,"bonusType":"money_per_round","bonusAmount":200}]'});
 const rows=[input[1],input[0]];const phase=calc.calculateEntityPhaseOutcome(rows,cfg,structure);
 assert.equal(phase.phase1Bonus,100);assert.equal(phase.phase2Bonus,0);
 const details=calc.computeTVVTotalRows([input[0],{...input[1],agentCode:'A'}],cfg,[],[],structure);
 assert.equal(details[0].phaseInfo.phase1Bonus,100);assert.equal(details[0].phaseInfo.phase2Bonus,0);
});
test('a TVV first qualifying in GĐ2 counts there, and another program starts a new period',()=>{
 const rows=[row('low','A',2),row('good','A',12,'2026-09-20')];
 assert.equal(calc.calculateLuot(rows.slice(0,1),12,'activity_round_standard',undefined,undefined,undefined,rows),0);
 assert.equal(calc.calculateLuot(rows.slice(1),12,'activity_round_standard',undefined,undefined,undefined,rows),1);
 assert.equal(calc.calculateLuot([rows[1]],12,'activity_round_standard'),1);
});
test('details keep all valid HĐ/IP but show one subtotal round per TVV',()=>{
 const rows=input.map(c=>({...c,agentCode:c.agentCode.trim().toUpperCase()}));
 const details=expandActivityExportDetails(rows,calc.filterQualifyingActivityContracts(rows,12,'activity_round_standard'));
 assert.equal(details.length,3);assert.equal(details.reduce((s,c)=>s+Number(c.rounds),0),2);
 assert.equal(details.filter(c=>c.contract.agentCode==='A').reduce((s,c)=>s+Number(c.totalIP),0),56);
});
test('actual Main calculation delegates to the shared unique-TVV calculator',()=>{
 const text=fs.readFileSync(new URL('../src/app/thi-dua-chau/page.tsx',import.meta.url),'utf8');const ast=ts.createSourceFile('page.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn='';
 function walk(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==='calculateLuot')fn=n.getText(ast);ts.forEachChild(n,walk);}walk(ast);
 const code=ts.transpileModule(fn+'; return calculateLuot;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 assert.equal(new Function('calculateContestLuot',code)(calc.calculateLuot)(input,12,'activity_round_standard'),2);
});
