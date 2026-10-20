import test from 'node:test';
import assert from 'node:assert/strict';
import { lastOrderOf, repeatLines } from './orders.js';

const menu = [
  { id: 'p1', name: 'Salchipollo', price: 7, available: true },
  { id: 'p2', name: 'Aguadito', price: 3, available: false }
];

test('el último pedido del casero, sin contar cancelados', () => {
  const orders = [
    { id: 'a', customerId: 'c1', createdAt: '2026-10-10T20:00:00Z', status: 'entregado', items: [{ id: 'p1' }] },
    { id: 'b', customerId: 'c1', createdAt: '2026-10-12T20:00:00Z', status: 'cancelado', items: [{ id: 'p1' }] },
    { id: 'c', customerName: 'Rosa ', createdAt: '2026-10-11T20:00:00Z', status: 'entregado', items: [{ id: 'p1' }] },
    { id: 'd', customerId: 'c2', createdAt: '2026-10-13T20:00:00Z', status: 'entregado', items: [{ id: 'p1' }] }
  ];
  assert.equal(lastOrderOf(orders, { id: 'c1', name: 'Rosa' }).id, 'c'); // también cuenta lo pedido con su nombre
  assert.equal(lastOrderOf(orders, { id: 'c1', name: 'Rosita' }).id, 'a');
  assert.equal(lastOrderOf(orders, { id: 'c9', name: 'rosa' }).id, 'c');
  assert.equal(lastOrderOf(orders, { id: 'c8', name: 'Nadie' }), null);
});

test('repetir un pedido usa el precio de hoy, conserva las cremas y avisa lo agotado', () => {
  let n = 0;
  const order = { items: [
    { id: 'p1', name: 'Salchipollo', price: 6, quantity: 2, cremas: ['Ají'] },
    { id: 'p2', name: 'Aguadito', price: 3, quantity: 1 }
  ] };
  const { lines, missing } = repeatLines(order, menu, () => `l${n++}`);
  assert.deepEqual(lines.map(line => [line.lineId, line.name, line.price, line.cremas]), [['l0', 'Salchipollo', 7, ['Ají']], ['l1', 'Salchipollo', 7, ['Ají']]]);
  assert.deepEqual(missing, ['Aguadito']);
});
