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

export function readState() {
  const state = db.prepare('SELECT * FROM app_state WHERE id = 1').get();
  if (!state) return null;

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
    orders: rows('SELECT * FROM orders ORDER BY created_at DESC').map(o => {
      const p = payments.get(o.id);
      return {
        id: o.id, orderNumber: o.order_number, customerId: o.customer_id,
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
    }),
    expenses: rows('SELECT * FROM expenses ORDER BY created_at DESC').map(e => ({
      id: e.id, date: e.date, description: e.description, amount: e.amount, createdAt: e.created_at
    })),
    settings: parse(state.settings, {}),
    greetingTemplate: state.greeting_template
  };
}

// A single transaction keeps every snapshot consistent. The relationship graph runs
// from customers/categories/products -> orders -> items/payments, never back upward.
export function writeState(data) {
  for (const key of ['users', 'customers', 'categories', 'cremas', 'menu', 'orders', 'expenses']) {
    if (!Array.isArray(data[key])) throw new Error(`Falta la lista ${key}`);
  }
  if (data.users.some(user => !/^\d{4}$/.test(String(user.pin)))) throw new Error('Cada PIN debe tener cuatro dígitos');
  if (!data.settings || typeof data.settings !== 'object') throw new Error('Faltan los ajustes');
  if (typeof data.greetingTemplate !== 'string') throw new Error('Falta el mensaje de saludo');

  db.exec('BEGIN IMMEDIATE');
  try {
    const actualRevision = db.prepare('SELECT revision FROM app_state WHERE id = 1').get()?.revision ?? 0;
    if (!Number.isInteger(data._revision) || data._revision !== actualRevision) {
      const error = new Error('Los datos cambiaron en otro dispositivo. Recarga la página antes de guardar.');
      error.status = 409;
      throw error;
    }
    for (const table of ['payments', 'order_items', 'orders', 'products', 'cremas', 'categories', 'customers', 'users', 'expenses']) {
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

    const customerIds = new Set(data.customers.map(c => c.id));
    const productIds = new Set(data.menu.map(p => p.id));
    const insertOrder = db.prepare(`INSERT INTO orders
      (id, order_number, customer_id, customer_name, customer_phone, date, created_at,
       updated_at, order_type, special_instructions, cremas, total, status, status_history, debt_created_at, debt_payments, open_account)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, notes, cremas, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertPayment = db.prepare('INSERT INTO payments VALUES (?, ?, ?, ?, ?)');
    for (const o of data.orders) {
      insertOrder.run(
        o.id, o.orderNumber, customerIds.has(o.customerId) ? o.customerId : null,
        o.customerName || 'Cliente al paso', o.customerPhone || '', o.date, o.createdAt,
        o.updatedAt || null, o.orderType || 'llevar', o.specialInstructions || '',
        JSON.stringify(o.cremas || []), o.total, o.status, JSON.stringify(o.statusHistory || []),
        o.debt?.createdAt || null, JSON.stringify(o.debtPayments || []), Number(Boolean(o.openAccount))
      );
      for (const [position, item] of (o.items || []).entries()) insertItem.run(
        o.id, productIds.has(item.id) ? item.id : null, item.name, item.price,
        item.quantity || 1, item.notes || '', JSON.stringify(item.cremas || []), position
      );
      if (o.payment) insertPayment.run(
        o.id, o.payment.method, o.payment.amountPaid, o.payment.change || 0, o.payment.paidAt
      );
    }

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
