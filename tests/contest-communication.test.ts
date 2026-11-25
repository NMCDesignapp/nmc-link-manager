import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContestCommunication, closingNotice, contestProgramUrl, successfulSyncTime } from '../src/lib/contest-communication.ts';
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
test('communication keeps the progress essentials and omits contest mechanics', () => {
  const detailUrl = contestProgramUrl('https://nc-link.onrender.com', 'contest 42');
  const result = buildContestCommunication(config(),settings,now,undefined,detailUrl);
  assert.match(result.text,/27\/10\/2026/);
  assert.match(result.text,/HÔM NAY VÀ NGÀY MAI/);
  assert.match(result.text,/CẬP NHẬT TIẾN ĐỘ THI ĐUA/);
  assert.doesNotMatch(result.text,/NỘI DUNG VÀ CƠ CHẾ THƯỞNG/);
  assert.doesNotMatch(result.text,/5% × IP|AFYP\/HĐ|Xét thưởng theo/);
  assert.doesNotMatch(result.text,/Cảm ơn Anh\/Chị/);
  assert.equal(result.lines.at(-1)?.text, '🔗 Xem chi tiết chương trình thi đua');
  assert.ok(result.text.includes(`🔗 Xem chi tiết chương trình thi đua: ${detailUrl}`));
  assert.equal(result.text, result.lines.map(line => line.url ? `${line.text}: ${line.url}` : line.text).join('\\n\\n'));
  assert.equal(detailUrl, 'https://nc-link.onrender.com/thi-dua-chau?embed=1&contest=contest+42&autocalc=1&actions=1');
  assert.equal(result.lines.find(x=>x.tone==='urgent')?.emphasis,true);
  assert.equal(result.text, result.lines.map(line => line.text).join('\n'));
});
test('TOP configuration is not included in the communication copy', () => {
  const c = {...config(),conditionType:'top_n_ip' as const,topN:2,topNValueType:'afyp' as const,bonusTiers:[{...tier,bonusType:'money' as const,bonusAmount:1000000,minFYP:50000000},{...tier,bonusType:'money' as const,bonusAmount:500000,minFYP:0}]};
  const text = buildContestCommunication(c,settings,now).text;
  assert.doesNotMatch(text,/Hạng 1|Hạng 2|TOP AFYP|1.000.000 đ/);
});
test('two-phase mechanics are not included in the communication copy', () => {
  const c = config();
  c.usePhase2 = true; c.phase2StartDate='2026-10-15'; c.phase2EndDate='2026-10-29';
  c.bonusTiers2=[{...c.bonusTiers[0],bonusType:'percent_total_ip',bonusPercent:10}];
  const text = buildContestCommunication(c,settings,now).text;
  assert.doesNotMatch(text,/Giai đoạn 1|Giai đoạn 2|10% × tổng IP/);
});
