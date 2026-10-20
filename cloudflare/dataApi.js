// Everything except orders (customers, menu, users, settings...) is stored one record
// per row, so devices only ever save the record they changed.

import { hashPin, publicUser, validPin } from './auth.js';
import { describeRecord, logChange } from './audit.js';
import { can, validPermissions } from '../src/domain/permissions.js';

export const COLLECTIONS = ['users', 'customers', 'categories', 'cremas', 'menu', 'expenses', 'config', 'closings'];
const MAX_RECORD_BYTES = 100_000;
// Users, settings and categories are for the admin only; the rest of what a helper
// may change depends on the permissions the admin gave her.
const ADMIN_ONLY = new Set(['users', 'config', 'categories']);
const NEEDS_PERMISSION = { expenses: 'gastos', menu: 'carta', cremas: 'carta' };
const FORBIDDEN = 'Solo la administradora puede cambiar esto.';
const NOT_ALLOWED = 'No tienes permiso para hacer esto. Pídeselo a la administradora.';
// Closing the day's cash register and changing a closed one are separate permissions.
const CLOSED = 'La caja de ese día ya está cerrada. No tienes permiso para cambiar el cierre.';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const validRecord = (collection, item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (typeof item.id !== 'string' || !/^[\w-]{1,80}$/.test(item.id)) return false;
  if (collection === 'users') {
    return typeof item.name === 'string' && ['admin', 'ayudante'].includes(item.role) &&
      (item.pin === undefined || validPin(item.pin)) && validPermissions(item.permissions);
  }
  if (collection === 'config') {
    if (item.id === 'greeting') return typeof item.value === 'string';
    // Images are uploaded to /api/files; settings only keep their URL.
    return item.id === 'settings' && item.value && typeof item.value === 'object' &&
      !String(item.value.yapeQr || '').startsWith('data:') && !String(item.value.logo || '').startsWith('data:');
  }
  if (collection === 'closings') {
    return DATE.test(item.date || '') && item.id === `cierre-${item.date}` &&
      Number.isFinite(item.countedCash) && Number.isFinite(item.expectedCash);
  }
  return true;
};

const toRecord = row => {
  const item = { ...JSON.parse(row.data), _seq: row.seq };
  return row.collection === 'users' ? { ...publicUser(item), _seq: row.seq } : item;
};
const storedData = item => {
  const { _seq, ...rest } = item;
  return JSON.stringify(rest);
};
// A user's PIN is stored only as a hash. Without a new PIN the current one is kept.
// keepHash: restoring an automatic backup, which carries the hashes themselves.
async function withPinHash(item, current, keepHash = false) {
  const { pin, pinHash, pinSalt, _seq, ...user } = item;
  if (pin !== undefined) return { ...user, ...(await hashPin(pin)) };
  if (keepHash && /^[0-9a-f]{64}$/.test(pinHash || '') && /^[0-9a-f]{32}$/.test(pinSalt || '')) return { ...user, pinHash, pinSalt };
  if (current?.pinHash) return { ...user, pinHash: current.pinHash, pinSalt: current.pinSalt };
  if (current?.pin) return { ...user, ...(await hashPin(current.pin)) };
  return null;
}

async function adminCount(db, exceptId) {
  const { results } = await db.prepare("SELECT id, data FROM records WHERE collection = 'users' AND deleted = 0").all();
  return results.filter(row => row.id !== exceptId && JSON.parse(row.data).role === 'admin').length;
}

const NEXT_SEQ = '(SELECT COALESCE(MAX(seq), 0) + 1 FROM records)';

async function readBody(request, limit) {
  const body = await request.text();
  if (new TextEncoder().encode(body).length > limit) return { error: json({ error: 'Datos demasiado grandes' }, 413) };
  try { return { value: JSON.parse(body) }; }
  catch { return { error: json({ error: 'JSON inválido' }, 400) }; }
}

async function changesSince(db, since) {
  const { results } = await db.prepare('SELECT * FROM records WHERE seq > ? ORDER BY seq').bind(since).all();
  const records = Object.fromEntries(COLLECTIONS.map(name => [name, []]));
  const deleted = Object.fromEntries(COLLECTIONS.map(name => [name, []]));
  for (const row of results) {
    if (!records[row.collection]) continue;
    if (!row.deleted) records[row.collection].push(toRecord(row));
    else if (since) deleted[row.collection].push(row.id);
  }
  return json({ cursor: results.reduce((max, row) => Math.max(max, row.seq), since), records, deleted });
}

// A restore arrives in several requests so a large backup fits D1's limits: the first
// (`reset`, carrying the users) clears the current records, the rest only add. Collections
// missing from a request (or from an older backup) are simply empty.
async function importAll(db, collections, reset, actor) {
  if (!collections || typeof collections !== 'object' ||
      !Object.entries(collections).every(([name, list]) =>
        COLLECTIONS.includes(name) && Array.isArray(list) && list.every(item => validRecord(name, item)))) {
    return json({ error: 'Respaldo inválido' }, 400);
  }
  // Backups made by this version carry no PINs; users that still exist keep theirs.
  const { results: existing } = await db.prepare("SELECT id, data FROM records WHERE collection = 'users' AND deleted = 0").all();
  const currentUsers = new Map(existing.map(row => [row.id, JSON.parse(row.data)]));
  const users = [];
  for (const user of collections.users || []) {
    const hashed = await withPinHash(user, currentUsers.get(user.id), true);
    if (!hashed) return json({ error: `Falta el PIN de ${user.name} en el respaldo` }, 400);
    users.push(hashed);
  }
  if (reset && !users.some(user => user.role === 'admin')) return json({ error: 'El respaldo no tiene administradora' }, 400);
  collections = { ...collections, users };
  const now = new Date().toISOString();
  const statements = [];
  if (reset) {
    // Shifting every seq past the current maximum keeps them unique and newer than any cursor.
    statements.push(db.prepare(`UPDATE records SET deleted = 1, data = '{}', updated_at = ?,
      seq = seq + (SELECT MAX(seq) FROM records) WHERE deleted = 0`).bind(now));
  }
  const rows = COLLECTIONS.flatMap(name => (collections[name] || []).map(item => ({ collection: name, id: item.id, data: storedData(item) })));
  if (rows.length) {
    statements.push(db.prepare(`INSERT INTO records (collection, id, data, seq, deleted, updated_at)
      SELECT json_extract(value, '$.collection'), json_extract(value, '$.id'), json_extract(value, '$.data'),
        (SELECT COALESCE(MAX(seq), 0) FROM records) + key + 1, 0, ?
      FROM json_each(?) WHERE true
      ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, seq = excluded.seq, deleted = 0, updated_at = excluded.updated_at`)
      .bind(now, JSON.stringify(rows)));
  }
  if (statements.length) await db.batch(statements);
  if (reset) await logChange(db, actor, 'backup', null, 'restaurar', 'Datos restaurados desde un respaldo');
  return json({ ok: true });
}

export async function handleData(request, db, url, user) {
  const isAdmin = user.role === 'admin';
  const [collection, rawId, ...rest] = url.pathname.slice('/api/data'.length).split('/').filter(Boolean);
  if (!collection) {
    if (request.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
    const since = Number(url.searchParams.get('since') || 0);
    if (!Number.isSafeInteger(since) || since < 0) return json({ error: 'Cursor inválido' }, 400);
    return changesSince(db, since);
  }
  if (collection === 'import' && !rawId) {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    if (!isAdmin) return json({ error: FORBIDDEN }, 403);
    const { value, error } = await readBody(request, 1_800_000);
    if (error) return error;
    return importAll(db, value?.collections, value?.reset === true, user);
  }
  if (!COLLECTIONS.includes(collection) || rest.length) return json({ error: 'No encontrado' }, 404);
  if (ADMIN_ONLY.has(collection) && !isAdmin) return json({ error: FORBIDDEN }, 403);
  if (NEEDS_PERMISSION[collection] && !can(user, NEEDS_PERMISSION[collection])) return json({ error: NOT_ALLOWED }, 403);
  const mayChangeClosing = can(user, 'cambiarCierre');

  if (!rawId) {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    const { value, error } = await readBody(request, MAX_RECORD_BYTES);
    if (error) return error;
    if (!validRecord(collection, value)) return json({ error: 'Datos inválidos' }, 400);
    let item = value;
    const existing = await db.prepare('SELECT data FROM records WHERE collection = ? AND id = ? AND deleted = 0').bind(collection, value.id).first();
    const before = existing && JSON.parse(existing.data);
    if (collection === 'closings' && before && !mayChangeClosing) return json({ error: CLOSED }, 403);
    if (collection === 'closings' && !before && !can(user, 'cerrarCaja')) return json({ error: NOT_ALLOWED }, 403);
    if (collection === 'users') {
      item = await withPinHash(value, before);
      if (!item) return json({ error: 'El PIN debe tener 4 números' }, 400);
    }
    // A new record (or one added back after being deleted) is written as sent; a retried
    // create just writes the same content again.
    const row = await db.prepare(`INSERT INTO records (collection, id, data, seq, deleted, updated_at)
      VALUES (?, ?, ?, ${NEXT_SEQ}, 0, ?)
      ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, seq = excluded.seq, deleted = 0, updated_at = excluded.updated_at
      RETURNING *`).bind(collection, item.id, storedData(item), new Date().toISOString()).first();
    // A retried create that changes nothing is not logged twice.
    if (!before || storedData(before) !== storedData(item)) {
      await logChange(db, user, collection, item.id, before ? 'editar' : 'crear', describeRecord(collection, item, before));
    }
    return json({ item: toRecord(row) });
  }

  const id = decodeURIComponent(rawId);
  if (!/^[\w-]{1,80}$/.test(id)) return json({ error: 'No encontrado' }, 404);
  if (collection === 'closings' && !mayChangeClosing) return json({ error: CLOSED }, 403);
  if (request.method === 'DELETE') {
    if (collection === 'users' && !(await adminCount(db, id))) return json({ error: 'Debe quedar al menos una administradora.' }, 400);
    const existing = await db.prepare('SELECT data FROM records WHERE collection = ? AND id = ? AND deleted = 0').bind(collection, id).first();
    if (!existing) return json({ ok: true });
    await db.prepare(`UPDATE records SET deleted = 1, data = '{}', updated_at = ?, seq = ${NEXT_SEQ}
      WHERE collection = ? AND id = ? AND deleted = 0`).bind(new Date().toISOString(), collection, id).run();
    await logChange(db, user, collection, id, 'eliminar', describeRecord(collection, JSON.parse(existing.data)));
    return json({ ok: true });
  }
  if (request.method !== 'PUT') return json({ error: 'Método no permitido' }, 405);
  const { value, error } = await readBody(request, MAX_RECORD_BYTES);
  if (error) return error;
  if (!validRecord(collection, value?.item) || value.item.id !== id || !Number.isSafeInteger(value.baseSeq)) {
    return json({ error: 'Datos inválidos' }, 400);
  }
  let item = value.item;
  const existing = await db.prepare('SELECT data FROM records WHERE collection = ? AND id = ? AND deleted = 0').bind(collection, id).first();
  const before = existing && JSON.parse(existing.data);
  if (collection === 'users') {
    item = await withPinHash(value.item, before);
    if (!item) return json({ error: 'El PIN debe tener 4 números' }, 400);
    if (item.role !== 'admin' && !(await adminCount(db, id))) return json({ error: 'Debe quedar al menos una administradora.' }, 400);
  }
  const row = await db.prepare(`UPDATE records SET data = ?, updated_at = ?, seq = ${NEXT_SEQ}
    WHERE collection = ? AND id = ? AND seq = ? AND deleted = 0 RETURNING *`)
    .bind(storedData(item), new Date().toISOString(), collection, id, value.baseSeq).first();
  if (row) {
    const pinChanged = collection === 'users' && value.item.pin !== undefined;
    await logChange(db, user, collection, id, 'editar', describeRecord(collection, item, before) + (pinChanged ? ', PIN cambiado' : ''));
    return json({ item: toRecord(row) });
  }
  const current = await db.prepare('SELECT * FROM records WHERE collection = ? AND id = ?').bind(collection, id).first();
  if (!current || current.deleted) return json({ error: 'Se eliminó en otro dispositivo', deleted: true }, 410);
  return json({ error: 'Cambió en otro dispositivo', item: toRecord(current) }, 409);
}
