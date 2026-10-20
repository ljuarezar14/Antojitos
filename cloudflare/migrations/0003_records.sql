-- Customers, menu, users, settings... move out of the single app_state row into one row
-- per record. app_state is left untouched as a copy of the data before this change.
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

-- One statement per collection: the MAX(seq) subquery is read once per statement, and
-- adding the array position keeps every seq unique.
INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'users', json_extract(i.value, '$.id'), i.value,
       (SELECT COALESCE(MAX(seq), 0) FROM records) + i.key + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state, json_each(app_state.data, '$.users') AS i
WHERE app_state.id = 1 AND app_state.data <> 'null' AND json_extract(i.value, '$.id') IS NOT NULL;

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'customers', json_extract(i.value, '$.id'), i.value,
       (SELECT COALESCE(MAX(seq), 0) FROM records) + i.key + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state, json_each(app_state.data, '$.customers') AS i
WHERE app_state.id = 1 AND app_state.data <> 'null' AND json_extract(i.value, '$.id') IS NOT NULL;

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'categories', json_extract(i.value, '$.id'), i.value,
       (SELECT COALESCE(MAX(seq), 0) FROM records) + i.key + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state, json_each(app_state.data, '$.categories') AS i
WHERE app_state.id = 1 AND app_state.data <> 'null' AND json_extract(i.value, '$.id') IS NOT NULL;

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'cremas', json_extract(i.value, '$.id'), i.value,
       (SELECT COALESCE(MAX(seq), 0) FROM records) + i.key + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state, json_each(app_state.data, '$.cremas') AS i
WHERE app_state.id = 1 AND app_state.data <> 'null' AND json_extract(i.value, '$.id') IS NOT NULL;

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'menu', json_extract(i.value, '$.id'), i.value,
       (SELECT COALESCE(MAX(seq), 0) FROM records) + i.key + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state, json_each(app_state.data, '$.menu') AS i
WHERE app_state.id = 1 AND app_state.data <> 'null' AND json_extract(i.value, '$.id') IS NOT NULL;

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'expenses', json_extract(i.value, '$.id'), i.value,
       (SELECT COALESCE(MAX(seq), 0) FROM records) + i.key + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state, json_each(app_state.data, '$.expenses') AS i
WHERE app_state.id = 1 AND app_state.data <> 'null' AND json_extract(i.value, '$.id') IS NOT NULL;

-- A logo uploaded as an image moves to app_files, like the Yape QR did.
INSERT OR REPLACE INTO app_files (name, data, updated_at)
SELECT 'logo', json_extract(data, '$.settings.logo'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state
WHERE id = 1 AND data <> 'null' AND json_extract(data, '$.settings.logo') LIKE 'data:image/%';

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'config', 'settings',
       json_object('id', 'settings', 'value', json(CASE
         WHEN json_extract(data, '$.settings.logo') LIKE 'data:image/%'
           THEN json_set(json_extract(data, '$.settings'), '$.logo', '/api/files/logo?v=' || CAST(strftime('%s', 'now') AS TEXT))
         ELSE json_extract(data, '$.settings')
       END)),
       (SELECT COALESCE(MAX(seq), 0) FROM records) + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state
WHERE id = 1 AND data <> 'null' AND json_type(data, '$.settings') = 'object';

INSERT OR IGNORE INTO records (collection, id, data, seq, updated_at)
SELECT 'config', 'greeting', json_object('id', 'greeting', 'value', json_extract(data, '$.greetingTemplate')),
       (SELECT COALESCE(MAX(seq), 0) FROM records) + 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM app_state
WHERE id = 1 AND data <> 'null' AND json_type(data, '$.greetingTemplate') = 'text';
