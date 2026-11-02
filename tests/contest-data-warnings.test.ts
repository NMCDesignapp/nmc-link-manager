import test from 'node:test';
import assert from 'node:assert/strict';
import { findContestDataWarnings } from '../src/lib/contest-data-warnings.ts';

test('không cảnh báo khi dữ liệu hợp lệ', () => {
  assert.deepEqual(findContestDataWarnings([{ contractNumber: 'HD1', agentCode: 'A1', agentName: 'An', maNhom: 'N1', effectiveDate: '2026-11-01', pdt10DT: 3_000_000 }]), []);
});

test('phát hiện thiếu mã, trùng hợp đồng và giá trị âm', () => {
  const warnings = findContestDataWarnings([
    { contractNumber: 'HD1', agentCode: '', agentName: 'An', maNhom: '', effectiveDate: '', pdt10DT: -1 },
    { contractNumber: 'HD1', agentCode: 'A2', agentName: '', maNhom: 'N2', issueDate: '2026-11-02', pdt10DT: 1 },
  ]);
  const codes = new Set(warnings.map(item => item.code));
  for (const code of ['missing-agent-code', 'missing-agent-name', 'missing-group', 'duplicate-contract', 'missing-date', 'negative-value']) assert.ok(codes.has(code), code);
});
