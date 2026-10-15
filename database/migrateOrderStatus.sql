PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;

CREATE TABLE orders_new (
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

INSERT INTO orders_new
  (id, order_number, customer_id, customer_name, customer_phone, date, created_at,
   updated_at, order_type, special_instructions, cremas, total, status,
   debt_created_at, debt_payments, open_account)
SELECT id, order_number, customer_id, customer_name, customer_phone, date, created_at,
       updated_at, order_type, special_instructions, cremas, total, status,
       debt_created_at, debt_payments, open_account
FROM orders;

DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;
PRAGMA foreign_keys = ON;
