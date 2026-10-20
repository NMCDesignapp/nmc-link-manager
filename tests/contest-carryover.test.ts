import test from 'node:test';
import assert from 'node:assert/strict';
import { filterContractsByContest, parseContestConfig, computeContestStats, computeTVVTotalRows } from '../src/lib/contest-calculator.ts';
import type { Contract } from '../src/lib/contest-calculator.ts';
import { bangkokMonth } from '../src/lib/carryover-contracts.ts';
const row = (id: string, extra = {}): Contract => ({ id, contractNumber: id, agentCode: 'A', agentName: 'Demo', maNhom: 'G', nhom: 'Demo group', effectiveDate: '2026-09-20', issueDate: '2026-10-10', pdt10DT: 6, afyp: 12, ...extra } as Contract);
const base = row('ordinary');
const carry = row('carry', { carryoverMonth: '2026-10' });
const config = (extra = {}) => parseContestConfig({ startDate: '2026-09-01', endDate: '2026-10-31', conditionType: 'total_ip', targetType: 'tvv', ...extra });
test('HĐ tồn excluded without issue-date condition; original revenue array unchanged', () => {
  const revenue = [base]; const before = JSON.stringify(revenue);
  assert.deepEqual(filterContractsByContest([...revenue, carry], config()).map(c => c.id), ['ordinary']);
  assert.equal(JSON.stringify(revenue), before);
});
test('either issue bound enables carryover, both bounds and effective dates still apply', () => {
  assert.equal(filterContractsByContest([carry], config({ issueDate: '2026-10-01' })).length, 1);
  assert.equal(filterContractsByContest([carry], config({ issueEndDate: '2026-10-31' })).length, 1);
  assert.equal(filterContractsByContest([carry], config({ issueDate: '2026-10-11' })).length, 0);
  assert.equal(filterContractsByContest([carry], config({ issueEndDate: '2026-10-09' })).length, 0);
  assert.equal(filterContractsByContest([carry], config({ issueDate: '2026-10-01', startDate: '2026-10-01' })).length, 0);
  assert.equal(filterContractsByContest([row('no-issue', { carryoverMonth: '2026-10', issueDate: null })], config({ issueEndDate: '2026-10-31' })).length, 0);
});
test('overlapping contract numbers count once; issued carryover fills historical missing date', () => {
  const pending = row('same', { issueDate: '' });
  const issued = row('same', { id: 'carry:same', carryoverMonth: '2026-10' });
  assert.deepEqual(filterContractsByContest([pending, issued], config({ issueDate: '2026-10-01' })).map(c => c.id), ['carry:same']);
  assert.deepEqual(filterContractsByContest([{ ...pending, issueDate: null } as unknown as Contract, issued], config({ issueEndDate: '2026-10-31' })).map(c => c.id), ['carry:same']);
  assert.deepEqual(filterContractsByContest([base, { ...carry, contractNumber: base.contractNumber }], config({ issueDate: '2026-10-01' })).map(c => c.id), ['ordinary']);
  assert.equal(filterContractsByContest([{ ...base, contractNumber: '', nguonDuLieu: 'NMC_DOANHSO:2026-09|SO_HD_GOC:carry' }, carry], config({ issueDate: '2026-10-01' })).length, 1);
  assert.equal(filterContractsByContest([carry, { ...carry, id: 'second-snapshot' }], config({ issueDate: '2026-10-01' })).length, 1);
});
test('distinct blank-number rows stay separate and secondary IP/AFYP thresholds apply', () => {
  const rows = [row('x', { contractNumber: '', carryoverMonth: '2026-10' }), row('y', { contractNumber: '', carryoverMonth: '2026-10' })];
  assert.equal(filterContractsByContest(rows, config({ issueDate: '2026-10-01' })).length, 2);
  assert.equal(filterContractsByContest(rows, config({ issueDate: '2026-10-01', useSecondaryCondition: true, secondaryIPMin: 7 })).length, 0);
});
test('reward stats change only for issue-conditioned programs', () => {
  const raw = { startDate: '2026-09-01', endDate: '2026-10-31', conditionType: 'total_ip', targetType: 'tvv', bonusTiers: JSON.stringify([{ id: 't', minFYP: 10, maxFYP: null, bonusType: 'money', bonusAmount: 100 }]) };
  const calculate = (rawConfig: any) => {
    const c = parseContestConfig(rawConfig);
    const rows = filterContractsByContest([base, carry], c);
    return computeContestStats(rows, [], computeTVVTotalRows(rows, c, [], []), [], c);
  };
  const noIssue = calculate(raw);
  const issued = calculate({ ...raw, issueDate: '2026-10-01' });
  assert.equal(noIssue.totalBonus, 0); assert.equal(issued.totalBonus, 100);
});
test('Bangkok calendar changes current sheet at local midnight including year boundary', () => {
  assert.equal(bangkokMonth(new Date('2026-10-31T17:00:00Z')), '2026-11');
  assert.equal(bangkokMonth(new Date('2026-12-31T17:00:00Z')), '2027-01');
});
