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

function migrateYapeQr() {
  const state = db.prepare('SELECT settings FROM app_state WHERE id = 1').get();
  const settings = parse(state?.settings, {});
  if (!String(settings.yapeQr || '').startsWith('data:image/')) return;
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO app_files (name, data, updated_at) VALUES ('yape-qr', ?, ?)
    ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).run(settings.yapeQr, now);
  settings.yapeQr = `/api/files/yape-qr?v=${Date.now()}`;
  db.prepare('UPDATE app_state SET settings = ?, revision = revision + 1, updated_at = ? WHERE id = 1').run(JSON.stringify(settings), now);
}

migrateLegacyOrders();
migrateYapeQr();

export function readState() {
  const state = db.prepare('SELECT * FROM app_state WHERE id = 1').get();
  if (!state) return null;

  return {
    _revision: state.revision,
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

// A single transaction keeps every snapshot consistent. Orders are saved separately
// through cloudflare/ordersApi.js, so this never touches them.
export function writeState(data) {
  for (const key of ['users', 'customers', 'categories', 'cremas', 'menu', 'expenses']) {
    if (!Array.isArray(data[key])) throw new Error(`Falta la lista ${key}`);
  }
  if (data.users.some(user => !/^\d{4}$/.test(String(user.pin)))) throw new Error('Cada PIN debe tener cuatro dígitos');
  if (!data.settings || typeof data.settings !== 'object') throw new Error('Faltan los ajustes');
  if (typeof data.greetingTemplate !== 'string') throw new Error('Falta el mensaje de saludo');
  if (String(data.settings.yapeQr || '').startsWith('data:')) throw new Error('El QR se guarda aparte');

  db.exec('BEGIN IMMEDIATE');
  try {
    const actualRevision = db.prepare('SELECT revision FROM app_state WHERE id = 1').get()?.revision ?? 0;
    if (!Number.isInteger(data._revision) || data._revision !== actualRevision) {
      const error = new Error('Los datos cambiaron en otro dispositivo. Recarga la página antes de guardar.');
      error.status = 409;
      throw error;
    }
    for (const table of ['products', 'cremas', 'categories', 'customers', 'users', 'expenses']) {
      db.exec(`DELETE FROM ${table}`);
    }

    const insertUser = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)');
    for (const u of data.users) insertUser.run(u.id, u.name, u.role, String(u.pin), u.avatar || '');

    const insertCustomer = db.prepare('INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const c of data.customers) insertCustomer.run(
      c.id, c.name, c.phone || '', c.favoriteDish || '', JSON.stringify(c.favoriteCremas || []),
      c.notes || '', c.totalOrders || 0, c.totalSpent || 0, c.createdAt || null, c.lastVisit || null
    );

    const insertCategory = db.prepare('INSERT INTO categories VALUES (?, ?, ?)');
    for (const c of data.categories) insertCategory.run(c.id, c.name, c.icon || 'Utensils');

    const insertCrema = db.prepare('INSERT INTO cremas VALUES (?, ?, ?)');
    for (const c of data.cremas) insertCrema.run(c.id, c.name, c.short || c.name);

    const categoryIds = new Set(data.categories.map(c => c.id));
    const insertProduct = db.prepare('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of data.menu) insertProduct.run(
      p.id, categoryIds.has(p.category) ? p.category : null, p.name, p.price,
      p.description || '', Number(Boolean(p.available)), Number(Boolean(p.popular)), p.emoji || ''
    );

    const insertExpense = db.prepare('INSERT INTO expenses VALUES (?, ?, ?, ?, ?)');
    for (const e of data.expenses) insertExpense.run(e.id, e.date, e.description, e.amount, e.createdAt);

    db.prepare(`INSERT INTO app_state (id, settings, greeting_template, updated_at, revision)
      VALUES (1, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
      settings = excluded.settings, greeting_template = excluded.greeting_template,
      updated_at = excluded.updated_at, revision = excluded.revision`).run(
      JSON.stringify(data.settings), data.greetingTemplate, new Date().toISOString(), actualRevision + 1
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
