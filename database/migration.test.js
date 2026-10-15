import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'antojitos-migration-'));
const file = join(directory, 'old.sqlite');
const oldDb = new DatabaseSync(file);
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')
  .replace("'recibido', 'preparando'", "'preparando'")
  .replace(/  status_history TEXT NOT NULL DEFAULT '\[\]',\r?\n/, '');
oldDb.exec(schema);
oldDb.prepare(`INSERT INTO orders
  (id, order_number, customer_name, date, created_at, order_type, total, status)
  VALUES ('old-order', 1, 'Ana', '2026-10-14', '2026-10-14T12:00:00Z', 'llevar', 6, 'preparando')`).run();
oldDb.close();
process.env.ANTOJITOS_DB_PATH = file;
const { db } = await import('./store.js');

test('migra pedidos existentes y permite el estado recibido', () => {
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'old-order'").get().status, 'preparando');
  assert.equal(db.prepare("SELECT status_history FROM orders WHERE id = 'old-order'").get().status_history, '[]');
  db.prepare(`INSERT INTO orders
    (id, order_number, customer_name, date, created_at, order_type, total, status)
    VALUES ('new-order', 2, 'Luis', '2026-10-14', '2026-10-14T13:00:00Z', 'llevar', 6, 'recibido')`).run();
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

test.after(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
