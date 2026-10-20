import { db } from './store.js';
import { d1 } from './d1.js';
import { handleOrders, handleFiles } from '../cloudflare/ordersApi.js';
import { handleData } from '../cloudflare/dataApi.js';

const database = d1(db);

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

// Runs the same handlers as the Cloudflare Worker on top of local SQLite.
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
  const response = await handle(new Request(url, { method: req.method, headers: req.headers, body }), database, url);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function handler(req, res) {
  const url = new URL(req.originalUrl || req.url, 'http://localhost');
  const under = prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`);
  if (under('/api/orders')) return sharedHandler(req, res, url, handleOrders);
  if (under('/api/data')) return sharedHandler(req, res, url, handleData);
  if (url.pathname.startsWith('/api/files/')) return sharedHandler(req, res, url, handleFiles);
  if (url.pathname === '/api/state') return json(res, 410, { error: 'Hay una versión nueva de la aplicación. Recarga la página.' });
  return json(res, 404, { error: 'No encontrado' });
}
