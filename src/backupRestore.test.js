import test from 'node:test';
import assert from 'node:assert/strict';
import { inParts } from './backupRestore.js';

test('un respaldo grande se parte en envíos de tamaño limitado', () => {
  const orders = Array.from({ length: 5000 }, (_, i) => ({ id: `PED-${i}`, note: 'x'.repeat(300) }));
  const parts = inParts(orders);
  assert.ok(parts.length > 1);
  assert.equal(parts.flat().length, 5000);
  assert.ok(parts.every(part => JSON.stringify(part).length < 600_000));
  assert.deepEqual(inParts([]), [[]]);
});
