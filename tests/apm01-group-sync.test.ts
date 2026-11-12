import assert from 'node:assert/strict';
import test from 'node:test';
import { planApm01GroupSync } from '../src/lib/apm01-group-sync.ts';

const row = (maBanNhom: string, tenBanNhom: string, maAD: string) => ({
  'Mã Ban/Nhóm': maBanNhom,
  'Tên Ban/Nhóm': tenBanNhom,
  'Mã AD': maAD,
});

test('thêm nhóm APM01 mới vào đúng AD đã tồn tại', () => {
  const plan = planApm01GroupSync(
    [row('U2611479530', 'An Phát', 'L1905096997')],
    [{ maAD: 'L1905096997' }],
    [],
  );
  assert.deepEqual(plan.create, [{
    maBanNhom: 'U2611479530',
    tenBanNhom: 'An Phát',
    maAD: 'L1905096997',
  }]);
  assert.deepEqual(plan.update, []);
});

test('bổ sung AD khi nhóm cũ đang để trống nhưng không ghi đè mapping khác', () => {
  const source = [row('G1', 'Nhóm Một', 'AD1')];
  const ads = [{ maAD: 'AD1' }];
  const fill = planApm01GroupSync(source, ads, [{ id: '1', maBanNhom: 'G1', tenBanNhom: 'Nhóm Một', maAD: '' }]);
  assert.deepEqual(fill.update, [{ id: '1', maBanNhom: 'G1', tenBanNhom: 'Nhóm Một', maAD: 'AD1' }]);
  const preserve = planApm01GroupSync(
    source,
    [{ maAD: 'AD1' }, { maAD: 'AD2' }],
    [{ id: '1', maBanNhom: 'G1', tenBanNhom: 'Nhóm Một', maAD: 'AD2' }],
  );
  assert.deepEqual(preserve.update, []);
  assert.deepEqual(preserve.conflicts, [{
    maBanNhom: 'G1', tenBanNhom: 'Nhóm Một', maAD: 'AD1', currentMaAD: 'AD2',
  }]);
});

test('dừng an toàn khi APM01 có AD lạ hoặc cùng nhóm ánh xạ mâu thuẫn', () => {
  assert.throws(
    () => planApm01GroupSync([row('G1', 'Nhóm Một', 'UNKNOWN')], [{ maAD: 'AD1' }], []),
    /Mã AD chưa tồn tại/,
  );
  assert.throws(
    () => planApm01GroupSync(
      [row('G1', 'Nhóm Một', 'AD1'), row('G1', 'Nhóm Một', 'AD2')],
      [{ maAD: 'AD1' }, { maAD: 'AD2' }],
      [],
    ),
    /ánh xạ Ban\/Nhóm mâu thuẫn/,
  );
});

test('bỏ qua dòng không có Mã AD thay vì suy đoán', () => {
  const plan = planApm01GroupSync([row('PA', 'Nhóm PA', '')], [], []);
  assert.deepEqual(plan.create, []);
  assert.deepEqual(plan.update, []);
});
