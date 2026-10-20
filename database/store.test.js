import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'antojitos-db-'));
process.env.ANTOJITOS_DB_PATH = join(directory, 'test.sqlite');
const { db, readState, writeState } = await import('./store.js');

test('guarda el estado sin tocar los pedidos ni el QR', () => {
  const state = {
    _revision: readState()?._revision ?? 0,
    users: [{ id: 'u1', name: 'Miriam', role: 'admin', pin: '1234', avatar: '👩‍🍳' }],
    customers: [{ id: 'c1', name: 'Ana', phone: '', favoriteCremas: ['Ají'], totalOrders: 1, totalSpent: 6 }],
    categories: [{ id: 'comidas', name: 'Comidas', icon: 'Utensils' }],
    cremas: [{ id: 'aji', name: 'Ají', short: 'Ají' }],
    menu: [{ id: 'p1', name: 'Hamburguesa', category: 'comidas', price: 6, available: true }],
    expenses: [{ id: 'e1', date: '2026-10-14', description: 'Hielo', amount: 2, createdAt: '2026-10-14T11:00:00Z' }],
    settings: { businessName: 'Antojitos', yapeQr: '/api/files/yape-qr?v=1' }, greetingTemplate: 'Hola'
  };
  db.prepare(`INSERT INTO order_records (id, date, order_number, data, created_at, updated_at, seq)
    VALUES ('o1', '2026-10-14', 1, '{}', '2026-10-14T12:00:00Z', '2026-10-14T12:00:00Z', 1)`).run();

  writeState(state);
  assert.equal(readState().customers[0].name, 'Ana');
  assert.equal(readState().settings.yapeQr, '/api/files/yape-qr?v=1');
  assert.equal(readState().orders, undefined);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM order_records').get().n, 1);
  assert.throws(() => writeState(state), /Los datos cambiaron/);
  state._revision = readState()._revision;
  state.settings.yapeQr = 'data:image/png;base64,AAAA';
  assert.throws(() => writeState(state), /QR/);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

test.after(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
