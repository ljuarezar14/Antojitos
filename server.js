import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler as stateHandler } from './database/api.js';

const root = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const username = process.env.ANTOJITOS_ACCESS_USER || 'miriam';
const password = process.env.ANTOJITOS_ACCESS_PASSWORD || '';
if (password.length < 16) {
  throw new Error('Configura ANTOJITOS_ACCESS_PASSWORD con al menos 16 caracteres antes de iniciar producción.');
}

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.woff2': 'font/woff2'
};
const digest = value => createHash('sha256').update(value).digest();
const expected = digest(`${username}:${password}`);

function authorized(req) {
  const match = /^Basic (.+)$/i.exec(req.headers.authorization || '');
  if (!match) return false;
  try {
    const credentials = Buffer.from(match[1], 'base64').toString('utf8');
    return timingSafeEqual(digest(credentials), expected);
  } catch { return false; }
}

async function serveFile(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const candidate = resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    res.writeHead(403).end(); return;
  }
  let target = candidate;
  try {
    if (!(await stat(target)).isFile()) target = resolve(root, 'index.html');
  } catch { target = resolve(root, 'index.html'); }
  try {
    const content = await readFile(target);
    res.setHeader('Content-Type', mime[extname(target)] || 'application/octet-stream');
    res.setHeader('Cache-Control', target.endsWith('index.html') ? 'no-store' : 'public, max-age=3600');
    res.writeHead(200).end(req.method === 'HEAD' ? undefined : content);
  } catch { res.writeHead(404).end('Ejecuta npm run build antes de iniciar el servidor.'); }
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Antojitos con Miriam", charset="UTF-8"', 'Cache-Control': 'no-store' }).end('Acceso restringido');
    return;
  }
  try {
    if (new URL(req.url, 'http://localhost').pathname === '/api/state') await stateHandler(req, res);
    else await serveFile(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Error interno del servidor' }));
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, process.env.HOST || '127.0.0.1', () => {
  console.log(`Antojitos escuchando en ${process.env.HOST || '127.0.0.1'}:${port}`);
});
