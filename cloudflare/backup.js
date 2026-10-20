// Full copies of the database kept in Workers KV, apart from D1: one every night (see
// `scheduled` in worker.js) plus any the admin makes from Admin › Respaldo. Each one is
// gzip-compressed JSON in the same format as the backup downloaded from the app, plus the
// images and the hashed PINs, so it restores everything even if D1 is lost.

const PREFIX = 'backup/';
const KEEP_DAYS = 90;
const FORBIDDEN = 'Solo la administradora puede ver los respaldos.';
const KEY = /^backup\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const STORAGE_KEYS = {
  users: 'antojitos_miriam_users_list', customers: 'antojitos_miriam_customers', menu: 'antojitos_miriam_menu',
  cremas: 'antojitos_miriam_cremas', categories: 'antojitos_miriam_categories', expenses: 'antojitos_miriam_expenses'
};

export async function buildBackup(db) {
  const { results: records } = await db.prepare('SELECT collection, data FROM records WHERE deleted = 0 ORDER BY seq').all();
  const { results: orders } = await db.prepare('SELECT order_number, data FROM order_records WHERE deleted = 0 ORDER BY seq').all();
  const { results: files } = await db.prepare('SELECT name, data FROM app_files').all();
  const byCollection = name => records.filter(row => row.collection === name).map(row => JSON.parse(row.data));
  const config = byCollection('config');
  const data = Object.fromEntries(Object.entries(STORAGE_KEYS).map(([name, key]) => [key, JSON.stringify(byCollection(name))]));
  data.antojitos_miriam_orders = JSON.stringify(orders.map(row => ({ ...JSON.parse(row.data), orderNumber: row.order_number })));
  data.antojitos_miriam_settings = JSON.stringify(config.find(item => item.id === 'settings')?.value || {});
  data.antojitos_miriam_greeting = config.find(item => item.id === 'greeting')?.value || '';
  return {
    app: 'antojitos-miriam',
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
    files: Object.fromEntries(files.map(row => [row.name, row.data]))
  };
}

const gzip = async text => new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
const gunzip = async bytes => new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();

export async function createBackup(db, store) {
  const backup = await buildBackup(db);
  const compressed = await gzip(JSON.stringify(backup));
  const key = PREFIX + backup.exportedAt;
  const metadata = {
    createdAt: backup.exportedAt,
    bytes: compressed.byteLength,
    orders: JSON.parse(backup.data.antojitos_miriam_orders).length,
    customers: JSON.parse(backup.data.antojitos_miriam_customers).length
  };
  await store.put(key, compressed, { expirationTtl: KEEP_DAYS * 86_400, metadata });
  return { key, ...metadata };
}

export async function handleBackups(request, db, url, user, store) {
  if (user.role !== 'admin') return json({ error: FORBIDDEN }, 403);
  // Download a full copy right now, without keeping it.
  if (url.pathname === '/api/backups/now' && request.method === 'GET') {
    const backup = await buildBackup(db);
    return new Response(JSON.stringify(backup), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="respaldo-antojitos-${backup.exportedAt.slice(0, 10)}.json"`,
        'Cache-Control': 'no-store'
      }
    });
  }
  if (!store) return json({ error: 'Los respaldos automáticos no están configurados en este servidor.' }, 503);
  const key = decodeURIComponent(url.pathname.slice('/api/backups/'.length));
  if (url.pathname === '/api/backups') {
    if (request.method === 'POST') return json(await createBackup(db, store));
    if (request.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
    const backups = [];
    let cursor;
    do {
      const page = await store.list({ prefix: PREFIX, cursor });
      backups.push(...page.keys.map(item => ({ key: item.name, ...item.metadata })));
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    return json({ backups: backups.sort((a, b) => b.key.localeCompare(a.key)) });
  }
  if (request.method !== 'GET' || !KEY.test(key)) return json({ error: 'No encontrado' }, 404);
  const compressed = await store.get(key, 'arrayBuffer');
  if (!compressed) return json({ error: 'Ese respaldo ya no existe' }, 404);
  return new Response(await gunzip(compressed), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="respaldo-antojitos-${key.slice(PREFIX.length, PREFIX.length + 10)}.json"`,
      'Cache-Control': 'no-store'
    }
  });
}
