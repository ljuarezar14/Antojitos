import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { d1 } from '../database/d1.js';
import { folderStore } from '../database/kv.js';
import { handleApi } from './api.js';
import { hashPin } from './auth.js';

const migrate = () => {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('./migrations/', import.meta.url)).sort()) {
    sqlite.exec(readFileSync(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
  }
  return sqlite;
};
const sqlite = migrate();
const db = d1(sqlite);
const directory = mkdtempSync(join(tmpdir(), 'antojitos-backups-'));
const store = folderStore(directory);

const call = async (target, method, path, { body, cookie } = {}) => {
  const url = new URL(path, 'https://example.com');
  const headers = cookie ? { Cookie: cookie } : {};
  const response = await handleApi(new Request(url, { method, headers, body: body && JSON.stringify(body) }), target, url, store);
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: response.status, body: parsed, cookie: response.headers.get('Set-Cookie')?.split(';')[0], headers: response.headers };
};

let admin;
let helper;
test.before(async () => {
  admin = (await call(db, 'POST', '/api/setup', { body: { name: 'Miriam', pin: '2468' } })).cookie;
  const { body: session } = await call(db, 'GET', '/api/session');
  sqlite.prepare(`INSERT INTO records (collection, id, data, seq, updated_at) VALUES ('users', 'h1', ?, 100, 'x')`)
    .run(JSON.stringify({ id: 'h1', name: 'Lucía', role: 'ayudante', ...(await hashPin('1357')) }));
  helper = (await call(db, 'POST', '/api/session', { body: { userId: 'h1', pin: '1357' } })).cookie;
  assert.ok(session.users.length);
  await call(db, 'POST', '/api/data/customers', { body: { id: 'c1', name: 'Lorena' }, cookie: admin });
  await call(db, 'POST', '/api/files/yape-qr', { cookie: admin });
  const url = new URL('https://example.com/api/files/yape-qr');
  await handleApi(new Request(url, { method: 'PUT', headers: { Cookie: admin }, body: 'data:image/png;base64,iVBORw0KGgo=' }), db, url, store);
  for (const [id, date, extra] of [
    ['old-paid', '2026-05-01', { customerId: 'c1', payment: { method: 'yape', amountPaid: 6, paidAt: '2026-05-01T20:00:00Z' } }],
    ['old-debt', '2026-05-02', { customerId: 'c1', debt: { createdAt: '2026-05-02T20:00:00Z' }, debtPayments: [{ amount: 2, method: 'efectivo', paidAt: '2026-06-10T15:00:00Z' }] }],
    ['old-plain', '2026-05-03', { payment: { method: 'efectivo', amountPaid: 4, paidAt: '2026-05-03T20:00:00Z' } }],
    ['recent', '2026-10-19', { customerId: 'c1', payment: { method: 'yape', amountPaid: 8, paidAt: '2026-10-19T20:00:00Z' } }]
  ]) {
    await call(db, 'POST', '/api/orders', { body: { id, date, status: 'entregado', total: extra.payment?.amountPaid || 10, items: [], ...extra }, cookie: admin });
  }
});

test('el celular recibe los días recientes y las deudas, no todo el historial', async () => {
  const { body } = await call(db, 'GET', '/api/orders?since=0&from=2026-08-21', { cookie: admin });
  assert.deepEqual(body.orders.map(o => o.id).sort(), ['old-debt', 'recent']);
  assert.equal(body.cursor, Number(sqlite.prepare('SELECT MAX(seq) AS s FROM order_records').get().s));
});

test('un día antiguo se pide aparte, incluidos los abonos de ese día', async () => {
  const day = await call(db, 'GET', '/api/orders?around=2026-05-03', { cookie: admin });
  assert.deepEqual(day.body.orders.map(o => o.id).sort(), ['old-debt', 'old-plain']);
  const payment = await call(db, 'GET', '/api/orders?around=2026-06-10', { cookie: admin });
  assert.deepEqual(payment.body.orders.map(o => o.id), ['old-debt']);
});

test('el servidor suma el historial de cada casero', async () => {
  const { body } = await call(db, 'GET', '/api/orders/customer-stats?before=2026-08-21', { cookie: admin });
  const lorena = body.stats.filter(stat => stat.customerId === 'c1');
  assert.equal(lorena.reduce((sum, stat) => sum + stat.totalOrders, 0), 2);
  assert.equal(lorena.reduce((sum, stat) => sum + stat.totalSpent, 0), 16);
  assert.equal(lorena[0].lastVisit, '2026-05-02');
});

test('respaldo guardado, listado y descargado completo', async () => {
  assert.equal((await call(db, 'POST', '/api/backups', { cookie: helper })).status, 403);
  const created = await call(db, 'POST', '/api/backups', { cookie: admin });
  assert.equal(created.status, 200);
  assert.equal(created.body.orders, 4);
  const list = await call(db, 'GET', '/api/backups', { cookie: admin });
  assert.equal(list.body.backups[0].key, created.body.key);
  const download = await call(db, 'GET', `/api/backups/${encodeURIComponent(created.body.key)}`, { cookie: admin });
  assert.match(download.headers.get('Content-Disposition'), /attachment/);
  const backup = download.body;
  assert.equal(backup.version, 2);
  assert.equal(JSON.parse(backup.data.antojitos_miriam_orders).length, 4);
  assert.equal(backup.files['yape-qr'], 'data:image/png;base64,iVBORw0KGgo=');
  const users = JSON.parse(backup.data.antojitos_miriam_users_list);
  assert.ok(users.every(user => /^[0-9a-f]{64}$/.test(user.pinHash)));
  assert.equal((await call(db, 'GET', '/api/backups/now', { cookie: admin })).body.version, 2);
});

test('un respaldo automático restaura todo en una base vacía, PIN incluidos', async () => {
  const { body: backup } = await call(db, 'GET', '/api/backups/now', { cookie: admin });
  const fresh = d1(migrate());
  const read = key => JSON.parse(backup.data[`antojitos_miriam_${key}`]);
  // An empty database has no session to import with: start with a throwaway admin.
  const temp = (await call(fresh, 'POST', '/api/setup', { body: { name: 'Temporal', pin: '0000' } })).cookie;
  const collections = {
    users: read('users_list'), customers: read('customers'), categories: read('categories'), cremas: read('cremas'),
    menu: read('menu'), expenses: read('expenses'),
    config: [{ id: 'settings', value: read('settings') }, { id: 'greeting', value: backup.data.antojitos_miriam_greeting }]
  };
  assert.equal((await call(fresh, 'POST', '/api/data/import', { body: { collections }, cookie: temp })).status, 200);
  assert.equal((await call(fresh, 'POST', '/api/orders/import', { body: { orders: read('orders') } })).status, 401);
  const restoredAdmin = read('users_list').find(user => user.role === 'admin');
  const login = await call(fresh, 'POST', '/api/session', { body: { userId: restoredAdmin.id, pin: '2468' } });
  assert.equal(login.status, 200);
  assert.equal((await call(fresh, 'POST', '/api/orders/import', { body: { orders: read('orders') }, cookie: login.cookie })).status, 200);
  assert.equal((await call(fresh, 'GET', '/api/orders?since=0', { cookie: login.cookie })).body.orders.length, 4);
});

test.after(() => rmSync(directory, { recursive: true, force: true }));
