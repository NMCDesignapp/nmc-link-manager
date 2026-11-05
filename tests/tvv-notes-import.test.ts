import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTVVNotesImport } from '../src/lib/tvv-notes-import.ts';

test('Nhập hai cột theo mã, không xóa dấu TVV không nằm trong file', () => {
  const current = { D001: 'x', D002: 'cũ', D003: 'giữ lại' };
  const { notes, summary } = prepareTVVNotesImport(
    [{ code: ' d001 ', note: 'x' }, { code: 'D002', note: 'mới' }],
    ['D001', 'D002', 'D003'], current,
  );
  assert.deepEqual(notes, { D001: 'x', D002: 'mới', D003: 'giữ lại' });
  assert.equal(summary.matched, 2);
  assert.equal(summary.changed, 1);
  assert.equal(summary.unchanged, 1);
});

test('Ô ghi chú trống chỉ xóa dấu đúng mã, các mã khác giữ nguyên', () => {
  const { notes, summary } = prepareTVVNotesImport(
    [{ code: 'D001', note: '' }, { code: 'D999', note: 'x' }],
    ['D001', 'D002'],
    { D001: 'x', D002: 'x' },
  );
  assert.deepEqual(notes, { D002: 'x' });
  assert.equal(summary.cleared, 1);
  assert.equal(summary.unmatched, 1);
  assert.deepEqual(summary.unmatchedCodes, ['D999']);
});

test('Từ chối mã trùng và dòng không hợp lệ, không trả về snapshot có thể ghi', () => {
  assert.throws(
    () => prepareTVVNotesImport(
      [{ code: 'd001', note: 'x' }, { code: 'D001', note: 'abc' }],
      ['D001'], {},
    ), /trùng/,
  );
  assert.throws(
    () => prepareTVVNotesImport([{ code: '', note: 'x' }], ['D001'], {}),
    /không hợp lệ/,
  );
  assert.throws(
    () => prepareTVVNotesImport([{ code: 'D001' }], ['D001'], {}),
    /thiếu/,
  );
});
