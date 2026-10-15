import { jwtVerify, createRemoteJWKSet } from 'jose';

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

const validState = data =>
  data && Number.isInteger(data._revision) && data._revision >= 0 &&
  ['users', 'customers', 'categories', 'cremas', 'menu', 'orders', 'expenses'].every(key => Array.isArray(data[key])) &&
  data.users.every(user => user && /^\d{4}$/.test(String(user.pin))) &&
  data.settings && typeof data.settings === 'object' &&
  typeof data.greetingTemplate === 'string';

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
      if (url.pathname === '/api/state') {
        try {
          const token = request.headers.get('Cf-Access-Jwt-Assertion');
          if (!token) return json({ error: 'Acceso requerido' }, 403);
          await jwtVerify(token, accessKeys(env.TEAM_DOMAIN), { issuer: env.TEAM_DOMAIN, audience: env.POLICY_AUD });
        } catch {
          return json({ error: 'Acceso no válido' }, 403);
        }
      }
    }
    if (url.pathname !== '/api/state') return env.ASSETS.fetch(request);
    try {
      if (request.method === 'GET') {
        const row = await env.DB.prepare('SELECT data, revision FROM app_state WHERE id = 1').first();
        if (!row || row.data === 'null') return json(null);
        return json({ ...JSON.parse(row.data), _revision: row.revision });
      }
      if (request.method !== 'PUT') return json({ error: 'Método no permitido' }, 405);
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 1_800_000) return json({ error: 'Los datos superan el límite de D1. Exporta un respaldo y contacta al administrador.' }, 413);
      let data;
      try { data = JSON.parse(body); }
      catch { return json({ error: 'JSON inválido' }, 400); }
      if (!validState(data)) return json({ error: 'Datos inválidos' }, 400);
      const revision = data._revision;
      delete data._revision;
      const result = await env.DB.prepare('UPDATE app_state SET data = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ?')
        .bind(JSON.stringify(data), new Date().toISOString(), revision).run();
      if (result.meta.changes !== 1) return json({ error: 'Los datos cambiaron en otro dispositivo. Recarga la página antes de guardar.' }, 409);
      return json({ ok: true, revision: revision + 1 });
    } catch (error) {
      console.error(error);
      return json({ error: 'No se pudo acceder a la base de datos' }, 500);
    }
  }
};
