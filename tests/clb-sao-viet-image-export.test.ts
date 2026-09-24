import assert from 'node:assert/strict';
import test from 'node:test';

import { createStoredZip } from '../src/lib/clb-sao-viet-image-export.ts';

test('CLB image ZIP streams blobs and writes valid stored-entry metadata', async () => {
  const progress: Array<[number, number]> = [];
  const archive = await createStoredZip(
    [{ name: 'poster.png', blob: new Blob([new TextEncoder().encode('hello')]) }],
    (completed, total) => progress.push([completed, total]),
  );

  const bytes = new Uint8Array(await archive.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const nameLength = view.getUint16(26, true);
  const fileName = new TextDecoder().decode(bytes.subarray(30, 30 + nameLength));

  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(14, true), 0x3610a686);
  assert.equal(view.getUint32(18, true), 5);
  assert.equal(view.getUint32(22, true), 5);
  assert.equal(fileName, 'poster.png');
  assert.equal(view.getUint32(bytes.byteLength - 22, true), 0x06054b50);
  assert.deepEqual(progress, [[1, 1]]);
});
