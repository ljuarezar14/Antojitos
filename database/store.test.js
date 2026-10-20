import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// A local database from before per-record saving: data in the normalized tables.
const directory = mkdtempSync(join(tmpdir(), 'antojitos-db-'));
const file = join(directory, 'old.sqlite');
const oldDb = new DatabaseSync(file);
oldDb.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8').split('CREATE TABLE IF NOT EXISTS order_records')[0]);
oldDb.exec(`
  INSERT INTO users VALUES ('u1', 'Miriam', 'admin', '1234', '👩‍🍳');
  INSERT INTO customers (id, name, favorite_cremas, total_orders, total_spent) VALUES ('c1', 'Ana', '["Ají"]', 1, 6);
  INSERT INTO categories VALUES ('comidas', 'Comidas', 'Utensils');
  INSERT INTO cremas VALUES ('aji', 'Ají', 'Ají');
  INSERT INTO products (id, category_id, name, price) VALUES ('p1', 'comidas', 'Hamburguesa', 6);
  INSERT INTO expenses VALUES ('e1', '2026-10-14', 'Hielo', 2, '2026-10-14T11:00:00Z');
  INSERT INTO app_state VALUES (1, '{"businessName":"Antojitos","logo":"data:image/png;base64,AAAA"}', 'Hola', '2026-10-14T11:00:00Z', 3);
`);
oldDb.close();
process.env.ANTOJITOS_DB_PATH = file;
const { db } = await import('./store.js');

test('copia usuarios, caseros, carta, gastos y ajustes a records', () => {
  const records = Object.groupBy(db.prepare('SELECT * FROM records').all(), row => row.collection);
  const data = name => records[name].map(row => JSON.parse(row.data));
  assert.equal(data('users')[0].pin, '1234');
  assert.deepEqual(data('customers')[0].favoriteCremas, ['Ají']);
  assert.equal(data('menu')[0].category, 'comidas');
  assert.equal(data('expenses')[0].description, 'Hielo');
  assert.equal(data('categories')[0].name, 'Comidas');
  assert.equal(data('cremas')[0].short, 'Ají');
  const settings = data('config').find(item => item.id === 'settings').value;
  assert.equal(settings.businessName, 'Antojitos');
  assert.match(settings.logo, /^\/api\/files\/logo\?v=\d+$/);
  assert.equal(data('config').find(item => item.id === 'greeting').value, 'Hola');
  assert.equal(db.prepare("SELECT data FROM app_files WHERE name = 'logo'").get().data, 'data:image/png;base64,AAAA');
  const seqs = db.prepare('SELECT seq FROM records').all().map(row => row.seq);
  assert.equal(new Set(seqs).size, seqs.length);
});

test.after(() => {
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
