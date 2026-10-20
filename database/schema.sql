-- Local SQLite used by the Node server and `npm run dev`; the same tables as the Cloudflare
-- D1 database (cloudflare/migrations), so both run the API in cloudflare/.
PRAGMA foreign_keys = ON;

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

CREATE TABLE IF NOT EXISTS records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  seq INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_records_seq ON records(seq);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Wrong PINs per user, to lock the login for a few minutes after repeated failures.
CREATE TABLE IF NOT EXISTS login_failures (
  user_id TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT
);

-- Who did what (see cloudflare/audit.js).
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at);
