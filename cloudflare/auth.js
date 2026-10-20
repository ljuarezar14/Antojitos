// PINs are checked here and never sent to the browser. A correct PIN opens a session
// kept in an HttpOnly cookie; every other /api route requires one.

const COOKIE = 'am_session';
const SESSION_DAYS = 30;
const MAX_FAILURES = 5;
const LOCK_MINUTES = 5;
const PBKDF2_ITERATIONS = 10_000;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
});

const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const randomHex = size => hex(crypto.getRandomValues(new Uint8Array(size)));
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

export const validPin = pin => /^\d{4}$/.test(String(pin ?? ''));

async function pbkdf2(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS }, key, 256);
  return hex(bits);
}

export async function hashPin(pin) {
  const pinSalt = randomHex(16);
  return { pinSalt, pinHash: await pbkdf2(pin, pinSalt) };
}

// Same-length comparison that does not stop at the first differing character.
const equal = (a, b) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
};

// Fields that only the server may see.
export const publicUser = ({ pin, pinHash, pinSalt, _seq, ...user }) => user;

const loginUser = user => ({ id: user.id, name: user.name, role: user.role, avatar: user.avatar });

async function activeUsers(db) {
  const { results } = await db.prepare("SELECT * FROM records WHERE collection = 'users' AND deleted = 0 ORDER BY seq").all();
  return results.map(row => ({ ...JSON.parse(row.data), _seq: row.seq }));
}

const cookieValue = (request, name) => {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
};

const sessionCookie = (url, token, maxAge) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;

async function startSession(db, url, user) {
  const token = randomHex(32);
  const now = new Date();
  await db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now.toISOString()).run();
  await db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), user.id, now.toISOString(), new Date(now.getTime() + SESSION_DAYS * 86_400_000).toISOString()).run();
  return json({ user: loginUser(user) }, 200, { 'Set-Cookie': sessionCookie(url, token, SESSION_DAYS * 86_400) });
}

// The signed-in user, read fresh so a changed role or a deleted user takes effect at once.
export async function currentUser(request, db) {
  const token = cookieValue(request, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const session = await db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first();
  if (!session || session.expires_at < new Date().toISOString()) return null;
  const row = await db.prepare("SELECT data FROM records WHERE collection = 'users' AND id = ? AND deleted = 0").bind(session.user_id).first();
  return row ? loginUser(JSON.parse(row.data)) : null;
}

async function checkPin(db, user, pin) {
  if (user.pinHash) return equal(await pbkdf2(pin, user.pinSalt), user.pinHash);
  if (!user.pin || !equal(String(user.pin), String(pin))) return false;
  // PINs saved before this change are stored in plain text; hash them on first use.
  const { pin: _plain, _seq, ...rest } = user;
  await db.prepare(`UPDATE records SET data = ?, seq = (SELECT COALESCE(MAX(seq), 0) + 1 FROM records), updated_at = ?
    WHERE collection = 'users' AND id = ?`)
    .bind(JSON.stringify({ ...rest, ...(await hashPin(pin)) }), new Date().toISOString(), user.id).run();
  return true;
}

async function login(db, url, userId, pin) {
  const user = (await activeUsers(db)).find(item => item.id === userId);
  if (!user || !validPin(pin)) return json({ error: 'PIN incorrecto. Intenta de nuevo.' }, 401);
  const now = new Date();
  const failures = await db.prepare('SELECT failures, locked_until FROM login_failures WHERE user_id = ?').bind(userId).first();
  if (failures?.locked_until && failures.locked_until > now.toISOString()) {
    return json({ error: `Demasiados intentos. Espera ${LOCK_MINUTES} minutos y vuelve a intentar.` }, 429);
  }
  if (!(await checkPin(db, user, pin))) {
    const count = (failures?.failures || 0) + 1;
    const lockedUntil = count >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString() : null;
    await db.prepare(`INSERT INTO login_failures (user_id, failures, locked_until) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`)
      .bind(userId, lockedUntil ? 0 : count, lockedUntil).run();
    return json({ error: lockedUntil ? `Demasiados intentos. Espera ${LOCK_MINUTES} minutos y vuelve a intentar.` : 'PIN incorrecto. Intenta de nuevo.' },
      lockedUntil ? 429 : 401);
  }
  await db.prepare('DELETE FROM login_failures WHERE user_id = ?').bind(userId).run();
  return startSession(db, url, user);
}

async function readJson(request) {
  const body = await request.text();
  if (body.length > 10_000) return null;
  try { return JSON.parse(body); } catch { return null; }
}

export async function handleAuth(request, db, url) {
  if (url.pathname === '/api/setup') {
    if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
    const value = await readJson(request);
    const name = String(value?.name || '').trim();
    if (!name || name.length > 60 || !validPin(value?.pin)) return json({ error: 'Ingresa un nombre y un PIN de 4 números.' }, 400);
    if ((await activeUsers(db)).length) return json({ error: 'La administradora ya fue creada.' }, 409);
    const user = { id: `usr-${crypto.randomUUID()}`, name, role: 'admin', avatar: '👩‍🍳', ...(await hashPin(value.pin)) };
    await db.prepare(`INSERT INTO records (collection, id, data, seq, deleted, updated_at)
      VALUES ('users', ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM records), 0, ?)`)
      .bind(user.id, JSON.stringify(user), new Date().toISOString()).run();
    return startSession(db, url, user);
  }
  // /api/session
  if (request.method === 'GET') {
    const users = await activeUsers(db);
    return json({ user: await currentUser(request, db), users: users.map(loginUser), needsSetup: users.length === 0 });
  }
  if (request.method === 'POST') {
    const value = await readJson(request);
    return login(db, url, String(value?.userId || ''), String(value?.pin || ''));
  }
  if (request.method === 'DELETE') {
    const token = cookieValue(request, COOKIE);
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(url, '', 0) });
  }
  return json({ error: 'Método no permitido' }, 405);
}
