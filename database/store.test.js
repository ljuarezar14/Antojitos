import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'antojitos-db-'));
process.env.ANTOJITOS_DB_PATH = join(directory, 'test.sqlite');
const { db, readState, writeState } = await import('./store.js');

test('guarda pedidos, pagos e historial sin referencias circulares', () => {
  const state = {
    _revision: 0,
    users: [{ id: 'u1', name: 'Miriam', role: 'admin', pin: '1234', avatar: '👩‍🍳' }],
    customers: [{ id: 'c1', name: 'Ana', phone: '', favoriteCremas: ['Ají'], totalOrders: 1, totalSpent: 6 }],
    categories: [{ id: 'comidas', name: 'Comidas', icon: 'Utensils' }],
    cremas: [{ id: 'aji', name: 'Ají', short: 'Ají' }],
    menu: [{ id: 'p1', name: 'Hamburguesa', category: 'comidas', price: 6, available: true }],
    orders: [{
      id: 'o1', orderNumber: 1, customerId: 'c1', customerName: 'Ana', date: '2026-10-14',
      createdAt: '2026-10-14T12:00:00Z', orderType: 'llevar', total: 6, status: 'entregado',
      items: [{ id: 'p1', name: 'Hamburguesa', price: 6, quantity: 1, cremas: ['Ají'] }],
      payment: { method: 'yape', amountPaid: 6, change: 0, paidAt: '2026-10-14T12:01:00Z' }
    }, {
      id: 'o2', orderNumber: 2, customerId: 'c1', customerName: 'Ana', date: '2026-10-14',
      createdAt: '2026-10-14T13:00:00Z', orderType: 'llevar', total: 10, status: 'entregado',
      items: [{ id: 'p1', name: 'Hamburguesa', price: 10, quantity: 1 }], payment: null,
      debt: { createdAt: '2026-10-14T13:00:00Z' },
      debtPayments: [{ id: 'abono-1', amount: 4, method: 'efectivo', paidAt: '2026-10-15T13:00:00Z' }]
    }, {
      id: 'o3', orderNumber: 3, customerId: 'c1', customerName: 'Lorena', date: '2026-10-14',
      createdAt: '2026-10-14T14:00:00Z', orderType: 'mesa', total: 12, status: 'recibido',
      statusHistory: [{ status: 'recibido', at: '2026-10-14T14:00:00Z' }],
      openAccount: true,
      items: [
        { id: 'p1', name: 'Hamburguesa', price: 6, quantity: 1 },
        { id: 'p1', name: 'Hamburguesa', price: 6, quantity: 1 }
      ]
    }],
    expenses: [{ id: 'e1', date: '2026-10-14', description: 'Hielo', amount: 2, createdAt: '2026-10-14T11:00:00Z' }],
    settings: { businessName: 'Antojitos' }, greetingTemplate: 'Hola'
  };

  writeState(state);
  assert.equal(readState().orders.find(order => order.id === 'o1').payment.method, 'yape');
  assert.deepEqual(readState().orders.find(order => order.id === 'o1').items[0].cremas, ['Ají']);
  assert.equal(readState().orders.find(order => order.id === 'o2').debtPayments[0].amount, 4);
  assert.equal(readState().orders.find(order => order.id === 'o2').debt.createdAt, '2026-10-14T13:00:00Z');
  assert.equal(readState().orders.find(order => order.id === 'o3').openAccount, true);
  assert.deepEqual(readState().orders.find(order => order.id === 'o3').statusHistory, [{ status: 'recibido', at: '2026-10-14T14:00:00Z' }]);
  assert.equal(readState().orders.find(order => order.id === 'o3').items.length, 2);

  state.customers = [];
  state.menu = [];
  state._revision = readState()._revision;
  writeState(state);
  assert.equal(readState().orders.find(order => order.id === 'o1').customerId, null);
  assert.equal(readState().orders.find(order => order.id === 'o1').items[0].name, 'Hamburguesa');
  assert.equal(readState().orders.find(order => order.id === 'o1').items[0].price, 6);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.throws(() => writeState(state), /Los datos cambiaron/);
  assert.equal(readState()._revision, 2);
});

test.after(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
