import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateRevenueTVVmAFYP, isRevenueTVVmContract } from '../src/lib/revenue-tvvm.ts';

test('tính hợp đồng có ngày hiệu lực từ ngày bắt đầu đến đúng 12 tháng', () => {
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2025-10-06', effectiveDate: '2025-10-06' }), true);
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2025-10-06', effectiveDate: '2026-10-06' }), true);
});

test('không tính hợp đồng trước ngày bắt đầu hoặc quá 12 tháng', () => {
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2025-10-06', effectiveDate: '2025-10-05' }), false);
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2025-10-06', effectiveDate: '2026-10-07' }), false);
});

test('không tính dòng thiếu hoặc sai ngày', () => {
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: null, effectiveDate: '2026-01-01' }), false);
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2025-01-01', effectiveDate: null }), false);
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: 'khong-hop-le', effectiveDate: '2026-01-01' }), false);
});

test('cộng AFYP TVVm theo từng dòng hợp đồng đủ điều kiện', () => {
  const total = calculateRevenueTVVmAFYP([
    { ngayBatDauLamViec: '2025-01-15', effectiveDate: '2025-04-01', afyp: 10_000_000 },
    { ngayBatDauLamViec: '2024-01-15', effectiveDate: '2025-04-01', afyp: 20_000_000 },
    { ngayBatDauLamViec: '2025-03-01', effectiveDate: '2026-03-01', afyp: 30_000_000 },
  ]);

  assert.equal(total, 40_000_000);
});

test('mốc 12 tháng của ngày cuối tháng được chặn theo ngày cuối tháng đích', () => {
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2024-02-29', effectiveDate: '2025-02-28' }), true);
  assert.equal(isRevenueTVVmContract({ ngayBatDauLamViec: '2024-02-29', effectiveDate: '2025-03-01' }), false);
});
