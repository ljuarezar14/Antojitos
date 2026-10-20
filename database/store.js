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
