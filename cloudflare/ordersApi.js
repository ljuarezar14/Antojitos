// Orders and uploaded files live in their own rows, so two devices never overwrite
// each other's work. `db` is a D1 database (or the local adapter with the same API).

const STATUSES = ['recibido', 'preparando', 'listo', 'entregado', 'cancelado'];
const MAX_ORDER_BYTES = 100_000;
const MAX_FILE_BYTES = 1_500_000;
const FILES = new Set(['yape-qr', 'logo']);
const FORBIDDEN = 'Solo la administradora puede cambiar esto.';

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const validOrder = order =>
  order && typeof order === 'object' && !Array.isArray(order) &&
  typeof order.id === 'string' && /^[\w-]{1,80}$/.test(order.id) &&
  typeof order.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(order.date) &&
  Array.isArray(order.items) && Number.isFinite(order.total) && order.total >= 0 &&
  STATUSES.includes(order.status);

const toOrder = row => ({ ...JSON.parse(row.data), orderNumber: row.order_number, _seq: row.seq });

async function readBody(request, limit) {
  const body = await request.text();
  if (new TextEncoder().encode(body).length > limit) return { error: json({ error: 'Datos demasiado grandes' }, 413) };
  try { return { value: JSON.parse(body) }; }
  catch { return { error: json({ error: 'JSON inválido' }, 400) }; }
}

// Strip fields the server owns before storing the order.
const storedData = order => {
  const { _seq, orderNumber, ...rest } = order;
  return JSON.stringify(rest);
};

const NEXT_SEQ = '(SELECT COALESCE(MAX(seq), 0) + 1 FROM order_records)';

async function createOrder(db, order) {
  const now = new Date().toISOString();
  // A single statement is atomic, so the day's next number can never be handed out twice.
  await db.prepare(`INSERT INTO order_records (id, date, order_number, data, created_at, updated_at, seq, deleted)
    VALUES (?, ?, (SELECT COALESCE(MAX(order_number), 0) + 1 FROM order_records WHERE date = ?), ?, ?, ?, ${NEXT_SEQ}, 0)
    ON CONFLICT(id) DO NOTHING`)
    .bind(order.id, order.date, order.date, storedData(order), order.createdAt || now, now).run();
  // A retried create returns the row that already exists instead of making a second one.
  const row = await db.prepare('SELECT * FROM order_records WHERE id = ?').bind(order.id).first();
  if (row.deleted) return json({ error: 'El pedido fue eliminado en otro dispositivo', deleted: true }, 410);
  return json({ order: toOrder(row) });
}

async function updateOrder(db, id, order, baseSeq) {
  const row = await db.prepare(`UPDATE order_records SET data = ?, updated_at = ?, seq = ${NEXT_SEQ}
    WHERE id = ? AND seq = ? AND deleted = 0 RETURNING *`)
    .bind(storedData(order), new Date().toISOString(), id, baseSeq).first();
  if (row) return json({ order: toOrder(row) });
  const current = await db.prepare('SELECT * FROM order_records WHERE id = ?').bind(id).first();
  if (!current || current.deleted) return json({ error: 'El pedido fue eliminado en otro dispositivo', deleted: true }, 410);
  return json({ error: 'El pedido cambió en otro dispositivo', order: toOrder(current) }, 409);
}

async function importOrders(db, orders) {
  if (!Array.isArray(orders) || !orders.every(order => validOrder(order) && Number.isInteger(order.orderNumber) && order.orderNumber > 0)) {
    return json({ error: 'Pedidos inválidos en el respaldo' }, 400);
  }
  const now = new Date().toISOString();
  const statements = [
    // Shifting every seq past the current maximum keeps them unique and newer than any cursor.
    db.prepare(`UPDATE order_records SET deleted = 1, data = '{}', updated_at = ?,
      seq = seq + (SELECT MAX(seq) FROM order_records) WHERE deleted = 0`).bind(now)
  ];
  for (const order of orders) {
    statements.push(db.prepare(`INSERT INTO order_records (id, date, order_number, data, created_at, updated_at, seq, deleted)
      VALUES (?, ?, ?, ?, ?, ?, ${NEXT_SEQ}, 0)
      ON CONFLICT(id) DO UPDATE SET date = excluded.date, order_number = excluded.order_number, data = excluded.data,
        updated_at = excluded.updated_at, seq = excluded.seq, deleted = 0`)
      .bind(order.id, order.date, order.orderNumber, storedData(order), order.createdAt || now, now));
  }
  await db.batch(statements);
  return json({ ok: true });
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const shiftDate = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// What a device needs day to day: orders since `from`, plus every debt, open account and
// order still in progress whatever its date. Older days are fetched with ordersAround.
async function recentOrders(db, from) {
  if (!DATE.test(from)) return json({ error: 'Fecha inválida' }, 400);
  // Read the cursor first: anything written meanwhile is simply sent again on the next poll.
  const { cursor } = await db.prepare('SELECT COALESCE(MAX(seq), 0) AS cursor FROM order_records').first();
  const { results } = await db.prepare(`SELECT * FROM order_records WHERE deleted = 0 AND (
      date >= ?
      OR json_extract(data, '$.debt') IS NOT NULL
      OR json_extract(data, '$.openAccount') = 1
      OR json_extract(data, '$.status') IN ('recibido', 'preparando', 'listo')
    ) ORDER BY seq`).bind(from).all();
  return json({ cursor, orders: results.map(toOrder), deleted: [] });
}

// Orders that matter for one day's screens and report. Payments are stored in UTC, so the
// day before and after are included and the browser keeps what falls on its local date.
async function ordersAround(db, date) {
  if (!DATE.test(date)) return json({ error: 'Fecha inválida' }, 400);
  const first = shiftDate(date, -1);
  const last = shiftDate(date, 1);
  const { results } = await db.prepare(`SELECT * FROM order_records WHERE deleted = 0 AND (
      date BETWEEN ? AND ?
      OR substr(json_extract(data, '$.payment.paidAt'), 1, 10) BETWEEN ? AND ?
      OR EXISTS (SELECT 1 FROM json_each(data, '$.debtPayments') AS p
                 WHERE substr(json_extract(p.value, '$.paidAt'), 1, 10) BETWEEN ? AND ?)
    ) ORDER BY seq`).bind(first, last, first, last, first, last).all();
  return json({ orders: results.map(toOrder) });
}

// Visits and spending per customer for orders older than `before`; the browser adds the
// orders it holds itself, so the totals cover the whole history.
async function customerStats(db, before) {
  if (!DATE.test(before || '')) return json({ error: 'Fecha inválida' }, 400);
  const { results } = await db.prepare(`SELECT
      json_extract(data, '$.customerId') AS customerId,
      lower(json_extract(data, '$.customerName')) AS customerName,
      COUNT(*) AS totalOrders,
      ROUND(SUM(json_extract(data, '$.total')), 2) AS totalSpent,
      MAX(date) AS lastVisit
    FROM order_records
    WHERE deleted = 0 AND date < ?
      AND json_extract(data, '$.status') <> 'cancelado'
      AND (json_extract(data, '$.payment') IS NOT NULL OR json_extract(data, '$.debt') IS NOT NULL)
    GROUP BY 1, 2`).bind(before).all();
  return json({ before, stats: results });
}

export async function handleOrders(request, db, url, user) {
  const id = decodeURIComponent(url.pathname.slice('/api/orders/'.length));
  if (url.pathname === '/api/orders') {
    if (request.method === 'GET') {
      const around = url.searchParams.get('around');
      if (around) return ordersAround(db, around);
      // `since` lets each device download only what changed after its last poll.
      const since = Number(url.searchParams.get('since') || 0);
      if (!Number.isSafeInteger(since) || since < 0) return json({ error: 'Cursor inválido' }, 400);
      const from = url.searchParams.get('from');
      if (!since && from) return recentOrders(db, from);
      const { results } = await db.prepare('SELECT * FROM order_records WHERE seq > ? ORDER BY seq').bind(since).all();
      return json({
        cursor: results.reduce((max, row) => Math.max(max, row.seq), since),
        orders: results.filter(row => !row.deleted).map(toOrder),
        deleted: since ? results.filter(row => row.deleted).map(row => row.id) : []
      });
    }
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    const { value, error } = await readBody(request, MAX_ORDER_BYTES);
    if (error) return error;
    if (!validOrder(value)) return json({ error: 'Pedido inválido' }, 400);
    return createOrder(db, value);
  }
  if (url.pathname === '/api/orders/customer-stats') {
    if (request.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
    return customerStats(db, url.searchParams.get('before'));
  }
  if (url.pathname === '/api/orders/import') {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    if (user.role !== 'admin') return json({ error: FORBIDDEN }, 403);
    const { value, error } = await readBody(request, 1_800_000);
    if (error) return error;
    return importOrders(db, value?.orders);
  }
  if (!/^[\w-]{1,80}$/.test(id)) return json({ error: 'Pedido no encontrado' }, 404);
  if (request.method === 'DELETE') {
    await db.prepare(`UPDATE order_records SET deleted = 1, data = '{}', updated_at = ?, seq = ${NEXT_SEQ} WHERE id = ? AND deleted = 0`)
      .bind(new Date().toISOString(), id).run();
    return json({ ok: true });
  }
  if (request.method !== 'PUT') return json({ error: 'Método no permitido' }, 405);
  const { value, error } = await readBody(request, MAX_ORDER_BYTES);
  if (error) return error;
  if (!validOrder(value?.order) || value.order.id !== id || !Number.isSafeInteger(value.baseSeq)) {
    return json({ error: 'Pedido inválido' }, 400);
  }
  return updateOrder(db, id, value.order, value.baseSeq);
}

export async function handleFiles(request, db, url, user) {
  const name = url.pathname.slice('/api/files/'.length);
  if (!FILES.has(name)) return json({ error: 'Archivo no encontrado' }, 404);
  if (request.method === 'GET') {
    const row = await db.prepare('SELECT data FROM app_files WHERE name = ?').bind(name).first();
    const match = row && /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(row.data);
    if (!match) return json({ error: 'Archivo no encontrado' }, 404);
    const bytes = Uint8Array.from(atob(match[2]), char => char.charCodeAt(0));
    // The page links to ?v=<version>, so a changed image always gets a new URL.
    return new Response(bytes, {
      headers: { 'Content-Type': match[1], 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' }
    });
  }
  if (user.role !== 'admin') return json({ error: FORBIDDEN }, 403);
  if (request.method === 'DELETE') {
    await db.prepare('DELETE FROM app_files WHERE name = ?').bind(name).run();
    return json({ ok: true });
  }
  if (request.method !== 'PUT') return json({ error: 'Método no permitido' }, 405);
  const body = await request.text();
  if (body.length > MAX_FILE_BYTES) return json({ error: 'La imagen pesa demasiado' }, 413);
  if (!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(body)) return json({ error: 'Imagen inválida' }, 400);
  await db.prepare(`INSERT INTO app_files (name, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
    .bind(name, body, new Date().toISOString()).run();
  return json({ ok: true });
}
