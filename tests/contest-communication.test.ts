import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContestCommunication, closingNotice, successfulSyncTime } from '../src/lib/contest-communication.ts';
import { parseContestConfig } from '../src/lib/contest-calculator.ts';

const now = new Date('2026-10-28T08:00:00+07:00');
const settings = { 'nmc-sync-source': 'data-hub', 'nmc-data-hub-last-sync-at': '2026-10-27T02:00:00Z', 'nmc-data-hub-last-seen-at': '2026-10-28T00:59:00Z' };
const tier = { id: 'test', minFYP: 3000000, maxFYP: null, bonusType: 'percent', bonusPercent: 5, bonusAmount: 0, bonusText: '' };
const config = () => parseContestConfig({title:'Bứt phá',startDate:'2026-10-01',endDate:'2026-10-29',conditionType:'per_contract_afyp',targetType:'tvv',bonusTiers:JSON.stringify([tier])});

test('countdown uses Bangkok calendar, including midnight/year boundary', () => {
  assert.match(closingNotice('2026-10-29',now).text,/HÔM NAY VÀ NGÀY MAI/);
  assert.match(closingNotice('2026-10-28',now).text,/HÔM NAY LÀ NGÀY CUỐI/);
  assert.match(closingNotice('2026-10-30',now).text,/2 NGÀY/);
  assert.match(closingNotice('2026-10-27',now).text,/đã kết thúc/);
  assert.match(closingNotice('2027-01-01',new Date('2026-12-31T17:01:00Z')).text,/HÔM NAY LÀ NGÀY CUỐI/);
});
test('only acknowledged sync, never heartbeat/export time; missing, invalid and future are explicit', () => {
  assert.equal(successfulSyncTime(settings,now),'2026-10-27T02:00:00.000Z');
  for (const value of ['', 'invalid', '2027-01-01']) assert.equal(successfulSyncTime({...settings,'nmc-data-hub-last-sync-at':value},now),null);
  assert.equal(successfulSyncTime({...settings,'nmc-sync-source':'google'},now),null);
  assert.match(buildContestCommunication(config(),{},now).text,/Chưa xác định/);
});
test('AFYP qualification does not turn percentage reward into AFYP reward', () => {
  const result = buildContestCommunication(config(),settings,now);
  assert.match(result.text,/AFYP\/HĐ/);
  assert.match(result.text,/5% × IP/);
  assert.match(result.text,/27\/10\/2026/);
  assert.match(result.text,/HÔM NAY VÀ NGÀY MAI/);
  assert.equal(result.lines.find(x=>x.tone==='urgent')?.emphasis,true);
});
test('rank rewards follow array order, not monetary thresholds', () => {
  const c = {...config(),conditionType:'top_n_ip' as const,topN:2,topNValueType:'afyp' as const,bonusTiers:[{...tier,bonusType:'money' as const,bonusAmount:1000000,minFYP:50000000},{...tier,bonusType:'money' as const,bonusAmount:500000,minFYP:0}]};
  const text = buildContestCommunication(c,settings,now).text;
  assert.match(text,/Hạng 1: 1.000.000 đ/);
  assert.match(text,/Hạng 2: 500.000 đ/);
  assert.match(text,/TOP AFYP/);
});
test('two phases and each percentage base remain distinct', () => {
  const c = config();
  c.usePhase2 = true; c.phase2StartDate='2026-10-15'; c.phase2EndDate='2026-10-29';
  c.bonusTiers2=[{...c.bonusTiers[0],bonusType:'percent_total_ip',bonusPercent:10}];
  const text = buildContestCommunication(c,settings,now).text;
  assert.match(text,/Giai đoạn 1/); assert.match(text,/Giai đoạn 2/);
  assert.match(text,/10% × tổng IP/);
});
