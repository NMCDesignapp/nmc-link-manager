import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as calc from '../src/lib/contest-calculator.ts';
import * as top from '../src/lib/contest-combined-top-ranking.ts';
import type { Contract, StaffMember, TVVStructMember } from '../src/lib/contest-calculator.ts';
const contract = (id: string, date: string, ip = 12) => ({ id, contractNumber: id, effectiveDate: date, issueDate: '2026-10-10', agentCode: 'TVV', agentName: 'Demo', nhom: 'Demo Group', maNhom: 'G', pdt10DT: ip, afyp: ip * 2, tinhLuot3tr: ip, maDaiLyTD: 'TN' } as Contract);
const rows = [contract('p1', '2026-09-10'), contract('p2', '2026-09-20'), contract('last', '2026-09-25T23:59:59.999Z'), contract('late', '2026-09-26')];
const tiers = [{ id: 'one', minFYP: 1, maxFYP: 25, bonusType: 'money', bonusAmount: 100, bonusPercent: 10 }];
const config = (extra = {}) => calc.parseContestConfig({ targetType: 'nhom', conditionType: 'total_ip', startDate: '2026-09-01', endDate: '2026-09-30', usePhase2: true, phase2StartDate: '2026-09-16', phase2EndDate: '2026-09-25', bonusTiers: JSON.stringify(tiers), bonusTiers2: JSON.stringify(tiers), ...extra });
const leader = { id:'L', agentCode:'TN', agentName:'Demo Leader', maNhom:'G', nhom:'Demo Group' } as StaffMember;
const structure = [{ agentCode:'TVV', agentName:'Demo', maBanNhom:'G', ngayBatDau:'2026-09-01' }] as TVVStructMember[];
function callback(name: string, file = '../src/app/thi-dua-chau/page.tsx') {
 const source = ts.createSourceFile('page.tsx', fs.readFileSync(new URL(file, import.meta.url),'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let found: ts.Node | undefined;
 function walk(n:ts.Node) { if(ts.isVariableDeclaration(n) && n.name.getText(source) === name && n.initializer) found=ts.isCallExpression(n.initializer) ? n.initializer.arguments[0] : n.initializer; ts.forEachChild(n,walk); }
 walk(source); assert.ok(found, name);
 return ts.transpileModule(`const fn=${found.getText(source)};`, { compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS} }).outputText + '\nreturn fn;';
}
function livePhase(input: Contract[], cfg = config()) {
 const groups=calc.computeGroupedData(input,cfg,[],[],[leader],structure);
 const scope = { ...calc, ...cfg, phaseConfig:cfg, displayContracts:input, groupedData:groups, nydData:[], tvvStructList:structure, displayContractsByAgent:new Map([['TVV',input]]), structureStartDateByCode:calc.buildStructureStartDateMap(structure) };
 return new Function(...Object.keys(scope),callback('phase2Results'))(...Object.values(scope))();
}
test('GĐ2 end is inclusive, stays inside overall end, and is ignored when phase switch is off',()=>{
 assert.deepEqual(calc.filterContractsByContest(rows,config()).map(c=>c.id),['p1','p2','last']);
 assert.deepEqual(calc.filterContractsByContest(rows,config({endDate:'2026-09-20'})).map(c=>c.id),['p1','p2']);
 assert.equal(calc.filterContractsByContest(rows,config({usePhase2:false})).length,4);
});
for(const targetType of ['nhom','tvv'] as const) for(const conditionType of ['total_ip','total_afyp','activity_round','activity_round_standard'] as const) {
 test(`${targetType}/${conditionType}: live phase footer equals saved details and summary; overall capped tier cannot hide valid phases`,()=>{
  const activity=conditionType.startsWith('activity');
  const tier={...tiers[0], minFYP:activity?1:1,maxFYP:activity?1:30,bonusType:activity?'money_per_round':'money',bonusAmount:100};
  const cfg=config({targetType,conditionType, luotHDThreshold:3,luotHDCTThreshold:12,bonusTiers:JSON.stringify([tier]),bonusTiers2:JSON.stringify([tier])});
  const input=rows.slice(0,2); const group=calc.computeGroupedData(input,cfg,[],[],[leader],structure);
  const total=calc.computeTVVTotalRows(input,cfg,[],[],structure);
  const stats=calc.computeContestStats(input,group,total,[],cfg,[],structure);
  const phase=calc.calculateEntityPhaseOutcome(input,cfg,structure);
  assert.equal(phase.phase1Bonus,100);assert.equal(phase.phase2Bonus,100);
  assert.equal(stats.totalBonus,200); assert.equal(stats.achievedCount,1); assert.equal(livePhase(input,cfg).totalBonus,200);
 });
 test(`${targetType}/${conditionType}: failed supplementary total blocks all phase payouts`,()=>{
  const cfg=config({targetType,conditionType,useSecondaryCondition:true,secondaryTotalIPMin:100,luotHDThreshold:3,luotHDCTThreshold:12});
  const input=rows.slice(0,2),group=calc.computeGroupedData(input,cfg,[],[],[leader],structure),total=calc.computeTVVTotalRows(input,cfg,[],[],structure);
  assert.equal(livePhase(input,cfg).totalBonus,0);assert.equal(calc.computeContestStats(input,group,total,[],cfg,[],structure).totalBonus,0);
 });
}
test('per-contract GĐ2-only tier determines achievement, visibility and footer',()=>{
 const cfg=config({targetType:'tvv',conditionType:'per_contract_ip',bonusTiers:JSON.stringify([{...tiers[0],minFYP:100}])});
 const input=[rows[1]], details=calc.computeTVVPerContractRows(input,cfg,structure);
 assert.ok(details[0].effectiveTier);assert.equal(details[0].phaseInfo.phase2Bonus,100);
 assert.equal(calc.computeContestStats(input,[],[],details,cfg,[],structure).totalBonus,100);
 assert.equal(livePhase(input,cfg).totalBonus,100);
});
test('saved group selection uses DS TN even when staff list is empty',()=>{
 const cfg=config({participants:'["Demo Group"]'});
 assert.equal(calc.filterDisplayContracts(rows,cfg,[],[],structure,[leader]).length,4);
});
test('explicit TVV selection cannot create participant from contract file outside structure',()=>{
 const cfg=config({targetType:'tvv',participants:'["UNKNOWN"]'});
 assert.equal(calc.filterDisplayContracts([{...rows[0],agentCode:'UNKNOWN'}],cfg,[],[],structure).length,0);
});

test('saved group selector accepts displayed names, legacy codes, multiple groups and all',()=>{
 assert.equal(calc.matchesContestGroupFilter(['Demo Group'],'Demo Group','G'),true);
 assert.equal(calc.matchesContestGroupFilter(['G'],'Demo Group','G'),true);
 assert.equal(calc.matchesContestGroupFilter(['Other','Demo Group'],'Demo Group','G'),true);
 assert.equal(calc.matchesContestGroupFilter([],'Demo Group','G'),true);
 assert.equal(calc.matchesContestGroupFilter(['Other'],'Demo Group','G'),false);
});
test('aggregate TVV IP+AFYP threshold is evaluated after summing, never as a per-contract filter',()=>{
 const cfg=config({conditionType:'pass_count_ip_afyp',useSecondaryCondition:true,secondaryIPMin:20,secondaryAFYPMin:40});
 assert.equal(calc.filterContractsByContest(rows.slice(0,2),cfg).length,2);
});
test('TVV money per round summary matches row amount without phases',()=>{
 const cfg=config({targetType:'tvv',conditionType:'activity_round',usePhase2:false,luotHDThreshold:3,bonusTiers:JSON.stringify([{...tiers[0],bonusType:'money_per_round'}])});
 const input=rows.slice(0,2),details=calc.computeTVVTotalRows(input,cfg,[],[],structure);
 assert.equal(details[0].value,2);
 assert.equal(calc.computeContestStats(input,[],details,[],cfg,[],structure).totalBonus,200);
});

for(const targetType of ['nhom','tvv','nyd'] as const) test(`${targetType}: actual Excel detail reward callback equals phase result total`,()=>{
 const cfg=config({targetType}); const input=rows.slice(0,2);
 const scope={...calc,...cfg, phaseConfig:cfg, tvvStructList:structure, groupedData:[{maNhom:'G',contracts:input}], nydData:[{nydCode:'TN',contracts:input}], displayContracts:input, formatCurrency:(x:number)=>String(x)};
 const fn=new Function(...Object.keys(scope),callback('getBonusForGroup'))(...Object.values(scope));
 assert.equal(fn(targetType==='nhom'?'G':targetType==='nyd'?'TN':'TVV'),'200');
});
for(const targetType of ['tvv','nhom','nyd'] as const) for(const bonusType of ['money','gift','percent','percent_total_ip','percent_fyc','money_per_round','money_per_tvv'] as const) for(const usePhase2 of [false,true]) test(`${targetType}/${bonusType}/phase=${usePhase2}: independent reward expectation`,()=>{
 const countReward=bonusType==='money_per_round'||bonusType==='money_per_tvv';
 const tier={...tiers[0],maxFYP:null,bonusType,bonusText:'Demo Gift'};
 const cfg=config({targetType,usePhase2,conditionType:countReward?'activity_round':'total_afyp',luotHDThreshold:3,bonusTiers:JSON.stringify([tier]),bonusTiers2:JSON.stringify([tier])});
 const input=rows.slice(0,2);
 const recruiters=[{...leader,startDate:null,position:'TTN'}];
 const group=calc.computeGroupedData(input,cfg,[],recruiters,[leader],structure);
 const total=calc.computeTVVTotalRows(input,cfg,[],recruiters,structure);
 const nyd=calc.computeNYDResultRows(calc.computeNYDData(input,cfg,recruiters,[],structure),cfg,structure);
 const stats=calc.computeContestStats(input,group,total,[],cfg,nyd,structure);
 const expected=bonusType==='percent'||bonusType==='percent_total_ip'?2.4:bonusType==='percent_fyc'?0.6:countReward?200:usePhase2?200:100;
 assert.ok(Math.abs(stats.totalBonus-expected)<0.000001,`${stats.totalBonus} vs ${expected}`);
 assert.equal(stats.achievedCount,1);
});
test('effective and issue ranges intersect inclusively; missing issue date cannot pass issuance bounds',()=>{
 const cfg=config({usePhase2:false,startDate:'2026-09-10',endDate:'2026-09-20',issueDate:'2026-10-10',issueEndDate:'2026-10-10'});
 const input=[rows[0],{...rows[1],issueDate:'2026-10-10T23:59:59.999Z'}, {...rows[0],id:'missing',issueDate:''},{...rows[0],id:'next',issueDate:'2026-10-11'}, {...rows[0],id:'before',effectiveDate:'2026-09-09'}];
 assert.deepEqual(calc.filterContractsByContest(input,cfg).map(c=>c.id),['p1','p2']);
});
test('each supplementary switch independently blocks an otherwise qualifying reward at the boundary',()=>{
 const input=rows.slice(0,2);
 for(const [field,at,above] of [['secondaryTotalIPMin',24,25],['secondaryTotalAFYPMin',48,49],['secondaryContractCountMin',2,3],['secondaryLuotHDMin',2,3],['secondaryLuotHDCMin',2,3]] as const){
  const cfg=config({useSecondaryCondition:true,luotHDThreshold:3,luotHDCTThreshold:12,[field]:at});
  assert.equal(calc.evaluateSecondaryConditions(input,cfg,structure).passed,true,field);
  assert.equal(calc.evaluateSecondaryConditions(input,{...cfg,[field]:above},structure).passed,false,field);
  assert.equal(calc.evaluateSecondaryConditions(input,{...cfg,[field]:above,useSecondaryCondition:false},structure).passed,true,field);
 }
});

for(const targetType of ['tvv','nhom','nyd'] as const) test(`${targetType}: actual live and saved TOP callbacks accept phase-only achievers identically`,()=>{
 const cfg=config({targetType,useTopRanking:true,topN:1,topRewardAmounts:'[777]',bonusTiers:JSON.stringify([{...tiers[0],maxFYP:15}]),bonusTiers2:JSON.stringify([{...tiers[0],maxFYP:15}])});
 const input=rows.slice(0,2),recruiters=[{...leader,startDate:null,position:'TTN'}];
 const groupedData=calc.computeGroupedData(input,cfg,[],recruiters,[leader],structure);
 const tvvTotalRows=calc.computeTVVTotalRows(input,cfg,[],recruiters,structure);
 const nydData=calc.computeNYDData(input,cfg,recruiters,[],structure),nydResultRows=calc.computeNYDResultRows(nydData,cfg,structure);
 const scope={...calc,...top,...cfg,config:cfg,phaseConfig:cfg,displayContracts:input,perContractDisplayContracts:input,displayContractsByAgent:new Map([['TVV',input]]),tvvStructList:structure,structureStartDates:calc.buildStructureStartDateMap(structure),structureStartDateByCode:calc.buildStructureStartDateMap(structure),groupedData,tvvTotalRows,tvvPerContractRows:[],nydData,nydResultRows,
 calculateBonus:(v:number)=>calc.calculateBonusWithTiers(v,cfg.bonusTiers),getGroupValue:(g:calc.GroupData)=>g.totalFYP,getNYDContestValue:(_ct:unknown,v:number)=>v};
 const live=new Function(...Object.keys(scope),callback('combinedTopRankByKey'))(...Object.values(scope))();
 const saved=new Function(...Object.keys(scope),callback('combinedTopRankByKey','../src/components/saved-contest-inline.tsx'))(...Object.values(scope))();
 assert.deepEqual([...live],[...saved]);assert.equal(live.size,1);assert.equal([...live.values()][0].reward,777);
});
test('actual Main date-search callback delegates same bounds and thresholds as saved contest',()=>{
 const cfg=config();let captured:Contract[]=[];
 const scope={...calc,...cfg,contracts:rows,appData:{carryoverContracts:[]},issueStartDate:'',issueEndDate:'',secondaryIPMin:0,secondaryAFYPMin:0,passCountIPMin:0,passCountAFYPMin:0,setFilteredContracts:(r:Contract[])=>{captured=r;},toast:()=>{}};
 new Function(...Object.keys(scope),callback('handleSearch'))(...Object.values(scope))();
 assert.deepEqual(captured,calc.filterContractsByContest(rows,cfg));
});

test('actual hide-not-achieved TVV filter excludes supplementary failures',()=>{
 const scope={tvvTotalRows:[{agent:{agentCode:'A',nhom:'G'},tier:{}},{agent:{agentCode:'B',nhom:'G'},tier:{}}],hideNotAchieved:true,displayContractsByAgent:new Map([['A',[rows[0]]],['B',[rows[1]]]]),checkSecondaryTotalCondition:(r:Contract[])=>({passed:r[0].id==='p2'})};
 const result=new Function(...Object.keys(scope),callback('filteredTvvTotalRows'))(...Object.values(scope))();
 assert.deepEqual(result.map((r:{agent:{agentCode:string}})=>r.agent.agentCode),['B']);
});
