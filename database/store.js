import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(process.env.ANTOJITOS_DB_PATH || resolve(here, 'antojitos.sqlite'));
mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec(readFileSync(resolve(here, 'schema.sql'), 'utf8'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA busy_timeout = 5000');
if (!db.prepare('PRAGMA table_info(app_state)').all().some(column => column.name === 'revision')) {
  db.exec('ALTER TABLE app_state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
}
const orderColumns = new Set(db.prepare('PRAGMA table_info(orders)').all().map(column => column.name));
if (!orderColumns.has('debt_created_at')) db.exec('ALTER TABLE orders ADD COLUMN debt_created_at TEXT');
if (!orderColumns.has('debt_payments')) db.exec("ALTER TABLE orders ADD COLUMN debt_payments TEXT NOT NULL DEFAULT '[]'");
if (!orderColumns.has('open_account')) db.exec('ALTER TABLE orders ADD COLUMN open_account INTEGER NOT NULL DEFAULT 0');
const orderDefinition = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'").get()?.sql || '';
if (!orderDefinition.includes("'recibido'")) {
  db.exec(readFileSync(resolve(here, 'migrateOrderStatus.sql'), 'utf8'));
}

const rows = (sql) => db.prepare(sql).all();
const parse = (value, fallback = []) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

// Orders used to be stored in normalized tables rewritten on every save. They now live
// one row per order in order_records; this copies the old ones over a single time.
function migrateLegacyOrders() {
  if (db.prepare('SELECT 1 FROM order_records LIMIT 1').get()) return;
  const payments = new Map(rows('SELECT * FROM payments').map(p => [p.order_id, p]));
  const items = new Map();
  for (const item of rows('SELECT * FROM order_items ORDER BY position, id')) {
    const list = items.get(item.order_id) || [];
    list.push({
      id: item.product_id,
      name: item.product_name,
      price: item.unit_price,
      quantity: item.quantity,
      notes: item.notes,
      cremas: parse(item.cremas)
    });
    items.set(item.order_id, list);
  }
  const insert = db.prepare(`INSERT INTO order_records (id, date, order_number, data, created_at, updated_at, seq)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    rows('SELECT * FROM orders ORDER BY created_at').forEach((o, index) => {
      const p = payments.get(o.id);
      const order = {
        id: o.id, customerId: o.customer_id,
        customerName: o.customer_name, customerPhone: o.customer_phone,
        date: o.date, createdAt: o.created_at, updatedAt: o.updated_at,
        orderType: o.order_type, specialInstructions: o.special_instructions,
        cremas: parse(o.cremas), total: o.total, status: o.status,
        statusHistory: parse(o.status_history),
        items: items.get(o.id) || [],
        payment: p ? { method: p.method, amountPaid: p.amount_paid, change: p.change_amount, paidAt: p.paid_at } : null,
        debt: o.debt_created_at ? { createdAt: o.debt_created_at } : null,
        debtPayments: parse(o.debt_payments),
        openAccount: Boolean(o.open_account)
      };
      insert.run(o.id, o.date, o.order_number, JSON.stringify(order), o.created_at, now, index + 1);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// Images uploaded into the settings move to app_files and are served from /api/files.
function migrateImages() {
  const state = db.prepare('SELECT settings FROM app_state WHERE id = 1').get();
  const settings = parse(state?.settings, {});
  const images = [['yapeQr', 'yape-qr'], ['logo', 'logo']].filter(([key]) => String(settings[key] || '').startsWith('data:image/'));
  if (!images.length) return;
  const now = new Date().toISOString();
  for (const [key, name] of images) {
    db.prepare(`INSERT INTO app_files (name, data, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).run(name, settings[key], now);
    settings[key] = `/api/files/${name}?v=${Date.now()}`;
  }
  db.prepare('UPDATE app_state SET settings = ?, revision = revision + 1, updated_at = ? WHERE id = 1').run(JSON.stringify(settings), now);
}

function legacyState() {
  const state = db.prepare('SELECT * FROM app_state WHERE id = 1').get();
  if (!state) return null;

  return {
    users: rows('SELECT * FROM users').map(u => ({ id: u.id, name: u.name, role: u.role, pin: u.pin, avatar: u.avatar })),
    customers: rows('SELECT * FROM customers').map(c => ({
      id: c.id, name: c.name, phone: c.phone, favoriteDish: c.favorite_dish,
      favoriteCremas: parse(c.favorite_cremas), notes: c.notes, totalOrders: c.total_orders,
      totalSpent: c.total_spent, createdAt: c.created_at, lastVisit: c.last_visit
    })),
    categories: rows('SELECT * FROM categories').map(c => ({ id: c.id, name: c.name, icon: c.icon })),
    cremas: rows('SELECT * FROM cremas').map(c => ({ id: c.id, name: c.name, short: c.short })),
    menu: rows('SELECT * FROM products').map(p => ({
      id: p.id, category: p.category_id, name: p.name, price: p.price,
      description: p.description, available: Boolean(p.available), popular: Boolean(p.popular), emoji: p.emoji
    })),
    expenses: rows('SELECT * FROM expenses ORDER BY created_at DESC').map(e => ({
      id: e.id, date: e.date, description: e.description, amount: e.amount, createdAt: e.created_at
    })),
    settings: parse(state.settings, {}),
    greetingTemplate: state.greeting_template
  };
}

// The rest of the data used to be rewritten as a whole on every save. It now lives one
// record per row in `records`, like the Cloudflare D1 database; this copies it a single time.
function migrateLegacyState() {
  if (db.prepare('SELECT 1 FROM records LIMIT 1').get()) return;
  const state = legacyState();
  if (!state) return;
  const now = new Date().toISOString();
  const insert = db.prepare('INSERT INTO records (collection, id, data, seq, updated_at) VALUES (?, ?, ?, ?, ?)');
  let seq = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const collection of ['users', 'customers', 'categories', 'cremas', 'menu', 'expenses']) {
      for (const item of state[collection]) insert.run(collection, item.id, JSON.stringify(item), ++seq, now);
    }
    insert.run('config', 'settings', JSON.stringify({ id: 'settings', value: state.settings }), ++seq, now);
    insert.run('config', 'greeting', JSON.stringify({ id: 'greeting', value: state.greetingTemplate }), ++seq, now);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

migrateLegacyOrders();
migrateImages();
migrateLegacyState();
