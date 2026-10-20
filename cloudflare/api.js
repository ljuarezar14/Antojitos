// Routes every /api request. Shared by the Cloudflare Worker and the local Node server,
// which both pass a D1-style database and, for backups, a KV-style store.
import { handleAuth, currentUser } from './auth.js';
import { handleOrders, handleFiles } from './ordersApi.js';
import { handleData } from './dataApi.js';
import { handleBackups } from './backup.js';
import { handleAudit } from './audit.js';

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export async function handleApi(request, db, url, backups) {
  const path = url.pathname;
  const under = prefix => path === prefix || path.startsWith(`${prefix}/`);
  if (path === '/api/session' || path === '/api/setup') return handleAuth(request, db, url);
  const user = await currentUser(request, db);
  if (!user) return json({ error: 'Tu sesión terminó. Ingresa tu PIN de nuevo.', login: true }, 401);
  if (under('/api/orders')) return handleOrders(request, db, url, user);
  if (under('/api/data')) return handleData(request, db, url, user);
  if (path.startsWith('/api/files/')) return handleFiles(request, db, url, user);
  if (under('/api/backups')) return handleBackups(request, db, url, user, backups);
  if (path === '/api/audit') return handleAudit(request, db, url, user);
  return json({ error: 'No encontrado' }, 404);
}
