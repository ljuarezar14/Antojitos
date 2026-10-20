import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { d1 } from '../database/d1.js';
import { handleOrders, handleFiles } from './ordersApi.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(readFileSync(new URL('./migrations/0001_state.sql', import.meta.url), 'utf8'));
sqlite.prepare('UPDATE app_state SET data = ? WHERE id = 1').run(JSON.stringify({
  users: [], settings: { yapeQr: 'data:image/png;base64,iVBORw0KGgo=' },
  orders: [
    { id: 'PED-b', orderNumber: 2, date: '2026-10-17', createdAt: '2026-10-17T20:00:00Z', status: 'listo', total: 6, items: [] },
    { id: 'PED-a', orderNumber: 1, date: '2026-10-17', createdAt: '2026-10-17T19:00:00Z', status: 'entregado', total: 5, items: [] }
  ]
}));
sqlite.exec(readFileSync(new URL('./migrations/0002_orders_files.sql', import.meta.url), 'utf8'));
const db = d1(sqlite);

const call = async (handler, method, path, body) => {
  const url = new URL(path, 'https://example.com');
  const payload = typeof body === 'string' ? body : body && JSON.stringify(body);
  const response = await handler(new Request(url, { method, body: payload }), db, url, { role: 'admin' });
  const type = response.headers.get('Content-Type') || '';
  return {
    status: response.status,
    body: type.startsWith('application/json') ? await response.json() : new Uint8Array(await response.arrayBuffer())
  };
};
const order = (id, extra = {}) => ({
  id, date: '2026-10-18', createdAt: '2026-10-18T20:00:00Z', status: 'recibido', total: 6, items: [], ...extra
});

test('la migración mueve pedidos y QR fuera del estado', async () => {
  const state = JSON.parse(sqlite.prepare('SELECT data FROM app_state').get().data);
  assert.equal(state.orders, undefined);
  assert.match(state.settings.yapeQr, /^\/api\/files\/yape-qr\?v=\d+$/);
  const { body } = await call(handleOrders, 'GET', '/api/orders?since=0');
  assert.deepEqual(body.orders.map(o => [o.id, o.orderNumber]).sort(), [['PED-a', 1], ['PED-b', 2]]);
  const qr = await call(handleFiles, 'GET', '/api/files/yape-qr');
  assert.equal(qr.status, 200);
  assert.deepEqual([...qr.body.slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
});

test('el servidor numera los pedidos y no repite números', async () => {
  const results = await Promise.all(['x1', 'x2', 'x3'].map(id =>
    call(handleOrders, 'POST', '/api/orders', order(id, { orderNumber: 1 }))));
  assert.deepEqual(results.map(r => r.body.order.orderNumber).sort(), [1, 2, 3]);
  const retry = await call(handleOrders, 'POST', '/api/orders', order('x1'));
  assert.equal(retry.body.order.orderNumber, results[0].body.order.orderNumber);
  assert.equal((await call(handleOrders, 'GET', '/api/orders?since=0')).body.orders.length, 5);
});

test('una edición basada en una versión vieja se rechaza sin pisar la otra', async () => {
  const { body: created } = await call(handleOrders, 'POST', '/api/orders', order('c1'));
  const base = created.order._seq;
  const first = await call(handleOrders, 'PUT', '/api/orders/c1', { order: { ...created.order, status: 'listo' }, baseSeq: base });
  assert.equal(first.status, 200);
  const stale = await call(handleOrders, 'PUT', '/api/orders/c1', { order: { ...created.order, status: 'cancelado' }, baseSeq: base });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.order.status, 'listo');
});

test('los cambios y eliminaciones llegan a los demás dispositivos', async () => {
  const { body: before } = await call(handleOrders, 'GET', '/api/orders?since=0');
  await call(handleOrders, 'DELETE', '/api/orders/x2');
  const { body: created } = await call(handleOrders, 'POST', '/api/orders', order('n1'));
  const { body: changes } = await call(handleOrders, 'GET', `/api/orders?since=${before.cursor}`);
  assert.deepEqual(changes.deleted, ['x2']);
  assert.deepEqual(changes.orders.map(o => o.id), ['n1']);
  assert.equal(changes.cursor, created.order._seq);
  const edit = await call(handleOrders, 'PUT', '/api/orders/x2', { order: order('x2'), baseSeq: 1 });
  assert.equal(edit.status, 410);
});

test('el respaldo reemplaza los pedidos conservando sus números', async () => {
  const restored = [order('r1', { orderNumber: 7 }), order('r2', { orderNumber: 1 })];
  assert.equal((await call(handleOrders, 'POST', '/api/orders/import', { orders: restored })).status, 200);
  const { body } = await call(handleOrders, 'GET', '/api/orders?since=0');
  assert.deepEqual(body.orders.map(o => [o.id, o.orderNumber]).sort(), [['r1', 7], ['r2', 1]]);
});

test('rechaza pedidos e imágenes inválidos', async () => {
  assert.equal((await call(handleOrders, 'POST', '/api/orders', { id: 'bad' })).status, 400);
  assert.equal((await call(handleFiles, 'PUT', '/api/files/yape-qr', 'data:text/html;base64,PGI+')).status, 400);
  assert.equal((await call(handleFiles, 'GET', '/api/files/otro')).status, 404);
});

test('una ayudante no puede cambiar el QR ni restaurar pedidos', async () => {
  const helper = { role: 'ayudante' };
  const url = new URL('https://example.com/api/files/yape-qr');
  assert.equal((await handleFiles(new Request(url, { method: 'PUT', body: 'data:image/png;base64,AA==' }), db, url, helper)).status, 403);
  assert.equal((await handleFiles(new Request(url), db, url, helper)).status, 200);
  const importUrl = new URL('https://example.com/api/orders/import');
  assert.equal((await handleOrders(new Request(importUrl, { method: 'POST', body: '{"orders":[]}' }), db, importUrl, helper)).status, 403);
});
