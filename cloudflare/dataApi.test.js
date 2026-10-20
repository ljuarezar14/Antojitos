import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { d1 } from '../database/d1.js';
import { handleData } from './dataApi.js';

// The production path: state saved as one row, then migrations 0002 and 0003.
const sqlite = new DatabaseSync(':memory:');
const migration = name => readFileSync(new URL(`./migrations/${name}`, import.meta.url), 'utf8');
sqlite.exec(migration('0001_state.sql'));
sqlite.prepare('UPDATE app_state SET data = ? WHERE id = 1').run(JSON.stringify({
  users: [{ id: 'u1', name: 'Miriam', role: 'admin', pin: '1234' }, { id: 'u2', name: 'Lucía', role: 'ayudante', pin: '5678' }],
  customers: [{ id: 'c1', name: 'Lorena', totalOrders: 3 }],
  categories: [{ id: 'comidas', name: 'Comidas' }],
  cremas: [{ id: 'aji', name: 'Ají' }, { id: 'mayo', name: 'Mayonesa' }],
  menu: [{ id: 'p1', name: 'Hamburguesa', price: 6 }],
  expenses: [],
  settings: { businessName: 'Antojitos', logo: 'data:image/png;base64,iVBORw0KGgo=' },
  greetingTemplate: 'Hola {nombre}',
  orders: []
}));
sqlite.exec(migration('0002_orders_files.sql'));
sqlite.exec(migration('0003_records.sql'));
const db = d1(sqlite);

const call = async (method, path, body, user = { role: 'admin' }) => {
  const url = new URL(path, 'https://example.com');
  const response = await handleData(new Request(url, { method, body: body && JSON.stringify(body) }), db, url, user);
  return { status: response.status, body: await response.json() };
};

test('la migración reparte el estado en registros', async () => {
  const { body } = await call('GET', '/api/data?since=0');
  assert.deepEqual(body.records.users.map(user => user.name), ['Miriam', 'Lucía']);
  assert.equal(body.records.cremas.length, 2);
  assert.equal(body.records.customers[0].name, 'Lorena');
  const settings = body.records.config.find(item => item.id === 'settings').value;
  assert.equal(settings.businessName, 'Antojitos');
  assert.match(settings.logo, /^\/api\/files\/logo\?v=\d+$/);
  assert.equal(body.records.config.find(item => item.id === 'greeting').value, 'Hola {nombre}');
  assert.equal(sqlite.prepare("SELECT data FROM app_files WHERE name = 'logo'").get().data, 'data:image/png;base64,iVBORw0KGgo=');
  const seqs = sqlite.prepare('SELECT seq FROM records').all().map(row => row.seq);
  assert.equal(new Set(seqs).size, seqs.length);
});

test('dos dispositivos editan registros distintos sin pisarse', async () => {
  const { body } = await call('GET', '/api/data?since=0');
  const [miriam, lucia] = body.records.users;
  const a = await call('PUT', `/api/data/users/${miriam.id}`, { item: { ...miriam, pin: '1111' }, baseSeq: miriam._seq });
  const b = await call('PUT', `/api/data/users/${lucia.id}`, { item: { ...lucia, pin: '2222' }, baseSeq: lucia._seq });
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  const stale = await call('PUT', `/api/data/users/${miriam.id}`, { item: { ...miriam, pin: '3333' }, baseSeq: miriam._seq });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.item.pin, undefined);
  const stored = JSON.parse(sqlite.prepare("SELECT data FROM records WHERE collection = 'users' AND id = ?").get(miriam.id).data);
  assert.equal(stored.pin, undefined);
  assert.match(stored.pinHash, /^[0-9a-f]{64}$/);
});

test('altas, bajas y cambios llegan con el cursor', async () => {
  const { body: before } = await call('GET', '/api/data?since=0');
  await call('POST', '/api/data/expenses', { id: 'EXP-1', description: 'Hielo', amount: 2, date: '2026-10-20' });
  await call('DELETE', '/api/data/cremas/mayo');
  const { body } = await call('GET', `/api/data?since=${before.cursor}`);
  assert.deepEqual(body.records.expenses.map(item => item.id), ['EXP-1']);
  assert.deepEqual(body.deleted.cremas, ['mayo']);
  // Restoring the default menu adds a deleted record back.
  const again = await call('POST', '/api/data/cremas', { id: 'mayo', name: 'Mayonesa' });
  assert.equal(again.status, 200);
  const edit = await call('PUT', '/api/data/expenses/EXP-1', { item: { id: 'EXP-1' }, baseSeq: 0 });
  assert.equal(edit.status, 409);
});

test('valida PIN, imágenes en ajustes y colecciones', async () => {
  assert.equal((await call('POST', '/api/data/users', { id: 'u3', name: 'X', role: 'admin', pin: '12' })).status, 400);
  assert.equal((await call('POST', '/api/data/config', { id: 'settings', value: { yapeQr: 'data:image/png;base64,AA' } })).status, 400);
  assert.equal((await call('POST', '/api/data/config', { id: 'otro', value: 1 })).status, 400);
  assert.equal((await call('POST', '/api/data/pedidos', { id: 'x' })).status, 404);
});

test('el respaldo reemplaza todos los registros', async () => {
  const collections = {
    users: [{ id: 'u9', name: 'Miriam', role: 'admin', pin: '9999' }],
    customers: [], categories: [], cremas: [], menu: [], expenses: [],
    config: [{ id: 'settings', value: { businessName: 'Restaurado' } }, { id: 'greeting', value: 'Hola' }]
  };
  assert.equal((await call('POST', '/api/data/import', { collections })).status, 200);
  const { body } = await call('GET', '/api/data?since=0');
  assert.deepEqual(body.records.users.map(user => user.id), ['u9']);
  assert.equal(body.records.cremas.length, 0);
  assert.equal(body.records.config.find(item => item.id === 'settings').value.businessName, 'Restaurado');
});

test('los PIN nunca se envían al navegador', async () => {
  const { body } = await call('GET', '/api/data?since=0');
  for (const user of body.records.users) {
    assert.equal(user.pin, undefined);
    assert.equal(user.pinHash, undefined);
    assert.equal(user.pinSalt, undefined);
  }
});

test('una ayudante toma pedidos y cuida la carta, pero no cambia usuarios ni ajustes', async () => {
  const helper = { role: 'ayudante' };
  assert.equal((await call('POST', '/api/data/customers', { id: 'c9', name: 'Nuevo' }, helper)).status, 200);
  assert.equal((await call('POST', '/api/data/menu', { id: 'p9', name: 'Chicha', price: 1 }, helper)).status, 200);
  assert.equal((await call('POST', '/api/data/users', { id: 'u7', name: 'X', role: 'admin', pin: '1234' }, helper)).status, 403);
  assert.equal((await call('POST', '/api/data/config', { id: 'greeting', value: 'x' }, helper)).status, 403);
  assert.equal((await call('POST', '/api/data/import', { collections: {} }, helper)).status, 403);
});

test('siempre queda una administradora', async () => {
  const { body } = await call('GET', '/api/data?since=0');
  const admin = body.records.users.find(user => user.role === 'admin');
  assert.equal((await call('DELETE', `/api/data/users/${admin.id}`)).status, 400);
  const demote = await call('PUT', `/api/data/users/${admin.id}`, { item: { ...admin, role: 'ayudante' }, baseSeq: admin._seq });
  assert.equal(demote.status, 400);
});
