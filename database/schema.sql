PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'ayudante')),
  pin TEXT NOT NULL CHECK (pin GLOB '[0-9][0-9][0-9][0-9]'),
  avatar TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  favorite_dish TEXT NOT NULL DEFAULT '',
  favorite_cremas TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  total_orders INTEGER NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  total_spent REAL NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TEXT,
  last_visit TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cremas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  description TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  popular INTEGER NOT NULL DEFAULT 0 CHECK (popular IN (0, 1)),
  emoji TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER NOT NULL CHECK (order_number > 0),
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  order_type TEXT NOT NULL CHECK (order_type IN ('llevar', 'mesa')),
  special_instructions TEXT NOT NULL DEFAULT '',
  cremas TEXT NOT NULL DEFAULT '[]',
  total REAL NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL CHECK (status IN ('recibido', 'preparando', 'listo', 'entregado', 'cancelado')),
  status_history TEXT NOT NULL DEFAULT '[]',
  debt_created_at TEXT,
  debt_payments TEXT NOT NULL DEFAULT '[]',
  open_account INTEGER NOT NULL DEFAULT 0 CHECK (open_account IN (0, 1)),
  UNIQUE (date, order_number)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  unit_price REAL NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT NOT NULL DEFAULT '',
  cremas TEXT NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  order_id TEXT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('efectivo', 'yape', 'plin', 'tarjeta', 'otro')),
  amount_paid REAL NOT NULL CHECK (amount_paid >= 0),
  change_amount REAL NOT NULL DEFAULT 0 CHECK (change_amount >= 0),
  paid_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount >= 0),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  settings TEXT NOT NULL,
  greeting_template TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS order_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  order_number INTEGER NOT NULL CHECK (order_number > 0),
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  seq INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_records_number ON order_records(date, order_number) WHERE deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_records_seq ON order_records(seq);

CREATE TABLE IF NOT EXISTS app_files (
  name TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
