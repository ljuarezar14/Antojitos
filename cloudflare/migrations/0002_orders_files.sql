-- One row per order: devices no longer overwrite the whole state to save a single order.
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

-- Images are served from their own row instead of travelling with every save.
CREATE TABLE IF NOT EXISTS app_files (
  name TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO order_records (id, date, order_number, data, created_at, updated_at, seq)
SELECT json_extract(o.value, '$.id'),
       json_extract(o.value, '$.date'),
       json_extract(o.value, '$.orderNumber'),
       json_remove(o.value, '$.orderNumber'),
       COALESCE(json_extract(o.value, '$.createdAt'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
       o.key + 1
FROM app_state, json_each(app_state.data, '$.orders') AS o
WHERE app_state.id = 1 AND app_state.data <> 'null';

INSERT OR REPLACE INTO app_files (name, data, updated_at)
SELECT 'yape-qr', json_extract(data, '$.settings.yapeQr'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state
WHERE id = 1 AND data <> 'null' AND json_extract(data, '$.settings.yapeQr') LIKE 'data:image/%';

-- The revision bump makes any device still running the old version reload before saving.
UPDATE app_state
SET data = CASE
      WHEN json_extract(data, '$.settings.yapeQr') LIKE 'data:image/%'
        THEN json_set(json_remove(data, '$.orders'), '$.settings.yapeQr', '/api/files/yape-qr?v=' || CAST(strftime('%s', 'now') AS TEXT))
      ELSE json_remove(data, '$.orders')
    END,
    revision = revision + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 1 AND data <> 'null';
