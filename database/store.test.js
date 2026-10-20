import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = mkdtempSync(join(tmpdir(), 'antojitos-db-'));
process.env.ANTOJITOS_DB_PATH = join(directory, 'nueva.sqlite');
const { db } = await import('./store.js');
const { d1 } = await import('./d1.js');
const { handleApi } = await import('../cloudflare/api.js');

test('una base local nueva tiene las mismas tablas que D1 y responde la API', async () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name);
  for (const name of ['order_records', 'records', 'app_files', 'sessions', 'login_failures', 'audit_log']) assert.ok(tables.includes(name), name);
  const url = new URL('http://localhost/api/session');
  const body = await (await handleApi(new Request(url), d1(db), url)).json();
  assert.equal(body.needsSetup, true);
  db.close();
  rmSync(directory, { recursive: true, force: true });
});
