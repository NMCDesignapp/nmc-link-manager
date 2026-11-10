import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveHistoricalRevenueMetadata } from '../src/lib/revenue-metadata.ts';

test('KPI04 chỉ kế thừa metadata còn thiếu theo đúng Số hợp đồng', () => {
  const incoming = [
    { contractNumber: 'A', position: '', ad: '', maDaiLyTD: '', tinhLuot3tr: 90, pdt10DT: 90 },
    { contractNumber: 'B', position: 'Mới', ad: 'AD mới', maDaiLyTD: 'TD-MOI', tinhLuot3tr: 30, pdt10DT: 30 },
  ];
  const previous = [
    { contractNumber: 'A', position: 'Tư vấn tài chính', ad: 'AD Uy', maDaiLyTD: 'TD-CU' },
    { contractNumber: 'B', position: 'Cũ', ad: 'AD cũ', maDaiLyTD: 'TD-CU' },
  ];
  assert.equal(preserveHistoricalRevenueMetadata(incoming, previous), 2);
  assert.equal(incoming[0].position, 'Tư vấn tài chính');
  assert.equal(incoming[0].ad, 'AD Uy');
  assert.equal(incoming[0].maDaiLyTD, 'TD-CU');
  assert.equal(incoming[0].tinhLuot3tr, 90);
  assert.equal(incoming[0].pdt10DT, 90);
  assert.equal(incoming[1].position, 'Cũ');
  assert.equal(incoming[1].ad, 'AD cũ');
  assert.equal(incoming[1].maDaiLyTD, 'TD-CU');
});

test('Không ghép metadata khi Số hợp đồng không khớp', () => {
  const incoming = [{ contractNumber: 'A', position: '' }];
  assert.equal(preserveHistoricalRevenueMetadata(incoming, [{ contractNumber: 'B', position: 'Cũ' }]), 0);
  assert.equal(incoming[0].position, '');
});
