// Everything except orders (customers, menu, users, settings...) is stored one record
// per row, so devices only ever save the record they changed.

export const COLLECTIONS = ['users', 'customers', 'categories', 'cremas', 'menu', 'expenses', 'config'];
const MAX_RECORD_BYTES = 100_000;

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const validRecord = (collection, item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (typeof item.id !== 'string' || !/^[\w-]{1,80}$/.test(item.id)) return false;
  if (collection === 'users') {
    return typeof item.name === 'string' && ['admin', 'ayudante'].includes(item.role) && /^\d{4}$/.test(String(item.pin));
  }
  if (collection === 'config') {
    if (item.id === 'greeting') return typeof item.value === 'string';
    // Images are uploaded to /api/files; settings only keep their URL.
    return item.id === 'settings' && item.value && typeof item.value === 'object' &&
      !String(item.value.yapeQr || '').startsWith('data:') && !String(item.value.logo || '').startsWith('data:');
  }
  return true;
};

const toRecord = row => ({ ...JSON.parse(row.data), _seq: row.seq });
const storedData = item => {
  const { _seq, ...rest } = item;
  return JSON.stringify(rest);
};
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

async function importAll(db, collections) {
  if (!collections || typeof collections !== 'object' ||
      !COLLECTIONS.every(name => Array.isArray(collections[name]) && collections[name].every(item => validRecord(name, item)))) {
    return json({ error: 'Respaldo inválido' }, 400);
  }
  const now = new Date().toISOString();
  // Shifting every seq past the current maximum keeps them unique and newer than any cursor.
  const statements = [db.prepare(`UPDATE records SET deleted = 1, data = '{}', updated_at = ?,
    seq = seq + (SELECT MAX(seq) FROM records) WHERE deleted = 0`).bind(now)];
  for (const name of COLLECTIONS) {
    for (const item of collections[name]) {
      statements.push(db.prepare(`INSERT INTO records (collection, id, data, seq, deleted, updated_at)
        VALUES (?, ?, ?, ${NEXT_SEQ}, 0, ?)
        ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, seq = excluded.seq, deleted = 0, updated_at = excluded.updated_at`)
        .bind(name, item.id, storedData(item), now));
    }
  }
  await db.batch(statements);
  return json({ ok: true });
}

export async function handleData(request, db, url) {
  const [collection, rawId, ...rest] = url.pathname.slice('/api/data'.length).split('/').filter(Boolean);
  if (!collection) {
    if (request.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
    const since = Number(url.searchParams.get('since') || 0);
    if (!Number.isSafeInteger(since) || since < 0) return json({ error: 'Cursor inválido' }, 400);
    return changesSince(db, since);
  }
  if (collection === 'import' && !rawId) {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    const { value, error } = await readBody(request, 1_800_000);
    if (error) return error;
    return importAll(db, value?.collections);
  }
  if (!COLLECTIONS.includes(collection) || rest.length) return json({ error: 'No encontrado' }, 404);

  if (!rawId) {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    const { value, error } = await readBody(request, MAX_RECORD_BYTES);
    if (error) return error;
    if (!validRecord(collection, value)) return json({ error: 'Datos inválidos' }, 400);
    // A new record (or one added back after being deleted) is written as sent; a retried
    // create just writes the same content again.
    const row = await db.prepare(`INSERT INTO records (collection, id, data, seq, deleted, updated_at)
      VALUES (?, ?, ?, ${NEXT_SEQ}, 0, ?)
      ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data, seq = excluded.seq, deleted = 0, updated_at = excluded.updated_at
      RETURNING *`).bind(collection, value.id, storedData(value), new Date().toISOString()).first();
    return json({ item: toRecord(row) });
  }

  const id = decodeURIComponent(rawId);
  if (!/^[\w-]{1,80}$/.test(id)) return json({ error: 'No encontrado' }, 404);
  if (request.method === 'DELETE') {
    await db.prepare(`UPDATE records SET deleted = 1, data = '{}', updated_at = ?, seq = ${NEXT_SEQ}
      WHERE collection = ? AND id = ? AND deleted = 0`).bind(new Date().toISOString(), collection, id).run();
    return json({ ok: true });
  }
  if (request.method !== 'PUT') return json({ error: 'Método no permitido' }, 405);
  const { value, error } = await readBody(request, MAX_RECORD_BYTES);
  if (error) return error;
  if (!validRecord(collection, value?.item) || value.item.id !== id || !Number.isSafeInteger(value.baseSeq)) {
    return json({ error: 'Datos inválidos' }, 400);
  }
  const row = await db.prepare(`UPDATE records SET data = ?, updated_at = ?, seq = ${NEXT_SEQ}
    WHERE collection = ? AND id = ? AND seq = ? AND deleted = 0 RETURNING *`)
    .bind(storedData(value.item), new Date().toISOString(), collection, id, value.baseSeq).first();
  if (row) return json({ item: toRecord(row) });
  const current = await db.prepare('SELECT * FROM records WHERE collection = ? AND id = ?').bind(collection, id).first();
  if (!current || current.deleted) return json({ error: 'Se eliminó en otro dispositivo', deleted: true }, 410);
  return json({ error: 'Cambió en otro dispositivo', item: toRecord(current) }, 409);
}
