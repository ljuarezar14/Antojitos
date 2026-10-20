import { db, readState, writeState } from './store.js';
import { d1 } from './d1.js';
import { handleOrders, handleFiles } from '../cloudflare/ordersApi.js';

const database = d1(db);

export function databaseApi() {
  return {
    name: 'antojitos-database-api',
    configureServer(server) { server.middlewares.use('/api', handler); }
  };
}

// Runs the same order/file handlers as the Cloudflare Worker on top of local SQLite.
async function sharedHandler(req, res, url, handle) {
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 5_000_000) throw new Error('Datos demasiado grandes');
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }
  const response = await handle(new Request(url, { method: req.method, headers: req.headers, body }), database, url);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function handler(req, res) {
  const url = new URL(req.originalUrl || req.url, 'http://localhost');
  if (url.pathname === '/api/orders' || url.pathname.startsWith('/api/orders/')) return sharedHandler(req, res, url, handleOrders);
  if (url.pathname.startsWith('/api/files/')) return sharedHandler(req, res, url, handleFiles);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (url.pathname !== '/api/state') {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'No encontrado' }));
    return;
  }
  if (req.method === 'GET') {
    res.end(JSON.stringify(readState()));
    return;
  }
  if (req.method !== 'PUT') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Método no permitido' }));
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 5_000_000) throw new Error('Respaldo demasiado grande');
    }
    writeState(JSON.parse(body));
    res.end(JSON.stringify({ ok: true, revision: readState()._revision }));
  } catch (error) {
    res.statusCode = error.status || 400;
    res.end(JSON.stringify({ error: error.message }));
  }
}
