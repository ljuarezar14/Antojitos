import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { d1 } from '../database/d1.js';
import { handleApi } from './api.js';

const sqlite = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('./migrations/', import.meta.url)).sort()) {
  sqlite.exec(readFileSync(new URL(`./migrations/${file}`, import.meta.url), 'utf8'));
}
const db = d1(sqlite);

const call = async (method, path, { body, cookie } = {}) => {
  const url = new URL(path, 'https://example.com');
  const headers = cookie ? { Cookie: cookie } : {};
  const response = await handleApi(new Request(url, { method, headers, body: body && JSON.stringify(body) }), db, url);
  const setCookie = response.headers.get('Set-Cookie');
  return { status: response.status, body: await response.json(), cookie: setCookie?.split(';')[0] };
};

let adminCookie;
let admin;

test('sin usuarios se configura la administradora y queda con sesión', async () => {
  assert.equal((await call('GET', '/api/session')).body.needsSetup, true);
  const created = await call('POST', '/api/setup', { body: { name: 'Miriam', pin: '2468' } });
  assert.equal(created.status, 200);
  assert.match(created.cookie, /^am_session=[0-9a-f]{64}$/);
  adminCookie = created.cookie;
  admin = created.body.user;
  assert.equal(admin.pin, undefined);
  assert.equal((await call('POST', '/api/setup', { body: { name: 'Otra', pin: '1111' } })).status, 409);
});

test('sin sesión no se leen datos', async () => {
  assert.equal((await call('GET', '/api/data?since=0')).status, 401);
  assert.equal((await call('GET', '/api/orders?since=0')).status, 401);
  assert.equal((await call('GET', '/api/files/yape-qr')).status, 401);
  assert.equal((await call('GET', '/api/data?since=0', { cookie: 'am_session=' + '0'.repeat(64) })).status, 401);
  assert.equal((await call('GET', '/api/data?since=0', { cookie: adminCookie })).status, 200);
});

test('la pantalla de ingreso recibe nombres pero no PIN', async () => {
  const { body } = await call('GET', '/api/session');
  assert.deepEqual(Object.keys(body.users[0]).sort(), ['avatar', 'id', 'name', 'role']);
  assert.equal((await call('GET', '/api/session', { cookie: adminCookie })).body.user.id, admin.id);
});

test('PIN incorrecto se rechaza y cinco fallos bloquean unos minutos', async () => {
  for (let i = 0; i < 4; i++) assert.equal((await call('POST', '/api/session', { body: { userId: admin.id, pin: '0000' } })).status, 401);
  assert.equal((await call('POST', '/api/session', { body: { userId: admin.id, pin: '0000' } })).status, 429);
  assert.equal((await call('POST', '/api/session', { body: { userId: admin.id, pin: '2468' } })).status, 429);
  sqlite.exec('DELETE FROM login_failures');
  assert.equal((await call('POST', '/api/session', { body: { userId: admin.id, pin: '2468' } })).status, 200);
});

test('un PIN guardado antes de este cambio funciona y se cifra al ingresar', async () => {
  sqlite.prepare(`INSERT INTO records (collection, id, data, seq, updated_at)
    VALUES ('users', 'old', '{"id":"old","name":"Lucía","role":"ayudante","pin":"1357"}', 999, 'x')`).run();
  const login = await call('POST', '/api/session', { body: { userId: 'old', pin: '1357' } });
  assert.equal(login.status, 200);
  const stored = JSON.parse(sqlite.prepare("SELECT data FROM records WHERE id = 'old'").get().data);
  assert.equal(stored.pin, undefined);
  assert.match(stored.pinHash, /^[0-9a-f]{64}$/);
  assert.equal((await call('POST', '/api/session', { body: { userId: 'old', pin: '1357' } })).status, 200);

  // Same API, helper session: orders yes, settings no.
  const helperCookie = login.cookie;
  const order = { id: 'o1', date: '2026-10-20', status: 'recibido', total: 5, items: [] };
  assert.equal((await call('POST', '/api/orders', { body: order, cookie: helperCookie })).status, 200);
  assert.equal((await call('POST', '/api/data/config', { body: { id: 'greeting', value: 'x' }, cookie: helperCookie })).status, 403);

  // A removed user loses access at once.
  await call('DELETE', '/api/data/users/old', { cookie: adminCookie });
  assert.equal((await call('GET', '/api/orders?since=0', { cookie: helperCookie })).status, 401);
});

test('cerrar sesión invalida la cookie', async () => {
  const out = await call('DELETE', '/api/session', { cookie: adminCookie });
  assert.equal(out.cookie, 'am_session=');
  assert.equal((await call('GET', '/api/data?since=0', { cookie: adminCookie })).status, 401);
});
