import { jwtVerify, createRemoteJWKSet } from 'jose';
import { handleApi } from './api.js';
import { createBackup } from './backup.js';
import { logChange, pruneAudit } from './audit.js';

const keySets = new Map();
function accessKeys(teamDomain) {
  if (!keySets.has(teamDomain)) keySets.set(teamDomain, createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`)));
  return keySets.get(teamDomain);
}

async function validPassword(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let supplied;
  try { supplied = atob(header.slice(6)); }
  catch { return false; }
  const expected = `${env.ACCESS_USER || 'miriam'}:${env.ACCESS_PASSWORD}`;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected))
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (env.ACCESS_PASSWORD) {
      if (env.ACCESS_PASSWORD.length < 16) return json({ error: 'La contraseña de acceso debe tener al menos 16 caracteres' }, 503);
      if (!(await validPassword(request, env))) return new Response('Acceso restringido', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Antojitos Miriam", charset="UTF-8"', 'Cache-Control': 'no-store' }
      });
    } else {
      if (!env.TEAM_DOMAIN || !env.POLICY_AUD) return json({ error: 'Configura una contraseña de acceso o Cloudflare Access' }, 503);
      if (url.pathname.startsWith('/api/')) {
        try {
          const token = request.headers.get('Cf-Access-Jwt-Assertion');
          if (!token) return json({ error: 'Acceso requerido' }, 403);
          await jwtVerify(token, accessKeys(env.TEAM_DOMAIN), { issuer: env.TEAM_DOMAIN, audience: env.POLICY_AUD });
        } catch {
          return json({ error: 'Acceso no válido' }, 403);
        }
      }
    }
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await handleApi(request, env.DB, url, env.BACKUPS);
    } catch (error) {
      console.error(error);
      return json({ error: 'No se pudo acceder a la base de datos' }, 500);
    }
  },

  // Nightly copy of the database (cron in wrangler.jsonc).
  // A failure is logged (Workers Logs) and noted in the history; Admin › Respaldo warns
  // when the newest copy is too old.
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try {
        const backup = await createBackup(env.DB, env.BACKUPS);
        console.log('Respaldo creado', backup.key);
      } catch (error) {
        console.error('Falló el respaldo nocturno', error);
        await logChange(env.DB, null, 'backup', null, 'error', `Falló el respaldo nocturno: ${error.message}`);
      }
      await pruneAudit(env.DB).catch(error => console.error('No se pudo limpiar el historial', error));
    })());
  }
};
