import { db } from './store.js';
import { d1 } from './d1.js';
import { fileURLToPath } from 'node:url';
import { folderStore } from './kv.js';
import { handleApi } from '../cloudflare/api.js';

const database = d1(db);
const backups = folderStore(process.env.ANTOJITOS_BACKUPS_PATH || fileURLToPath(new URL('./backups/', import.meta.url)));

export function databaseApi() {
  return {
    name: 'antojitos-database-api',
    configureServer(server) { server.middlewares.use('/api', handler); }
  };
}

const json = (res, status, value) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
};

// Runs the same API as the Cloudflare Worker on top of local SQLite.
async function sharedHandler(req, res, url, handle) {
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 5_000_000) return json(res, 413, { error: 'Datos demasiado grandes' });
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  const response = await handle(new Request(url, { method: req.method, headers: req.headers, body }), database, url, backups);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function handler(req, res) {
  const url = new URL(req.originalUrl || req.url, `http://${req.headers.host || 'localhost'}`);
  return sharedHandler(req, res, url, handleApi);
}
