import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';

test('la API de D1 falla cerrada sin Cloudflare Access configurado', async () => {
  const request = new Request('https://example.com/api/state');
  const response = await worker.fetch(request, { ASSETS: { fetch: () => { throw new Error('unexpected'); } } }, {});
  assert.equal(response.status, 503);
});

test('la API de D1 rechaza una petición sin token de Access', async () => {
  const request = new Request('https://example.com/api/state');
  const response = await worker.fetch(request, {
    TEAM_DOMAIN: 'https://example.cloudflareaccess.com', POLICY_AUD: 'test',
    DB: { prepare: () => { throw new Error('Database must not be accessed'); } }
  }, {});
  assert.equal(response.status, 403);
});

test('la contraseña protege también los archivos estáticos', async () => {
  const env = {
    ACCESS_PASSWORD: 'una-clave-larga-para-pruebas',
    ASSETS: { fetch: () => new Response('Aplicación') }
  };
  const url = 'https://example.com/';
  assert.equal((await worker.fetch(new Request(url), env, {})).status, 401);
  const credentials = btoa('miriam:una-clave-larga-para-pruebas');
  const response = await worker.fetch(new Request(url, { headers: { Authorization: `Basic ${credentials}` } }), env, {});
  assert.equal(response.status, 200);
});

test('D1 guarda, recupera y rechaza una revisión antigua', async () => {
  const row = { data: 'null', revision: 0 };
  const env = {
    ACCESS_PASSWORD: 'una-clave-larga-para-pruebas',
    DB: {
      prepare(sql) {
        if (sql.startsWith('SELECT')) return { first: async () => row };
        return {
          bind(data, _updatedAt, revision) {
            return {
              run: async () => {
                if (row.revision !== revision) return { meta: { changes: 0 } };
                row.data = data;
                row.revision++;
                return { meta: { changes: 1 } };
              }
            };
          }
        };
      }
    }
  };
  const headers = { Authorization: `Basic ${btoa('miriam:una-clave-larga-para-pruebas')}` };
  const url = 'https://example.com/api/state';
  const initial = await worker.fetch(new Request(url, { headers }), env, {});
  assert.equal(await initial.json(), null);
  const state = {
    _revision: 0, users: [], customers: [], categories: [], cremas: [],
    menu: [], orders: [], expenses: [], settings: {}, greetingTemplate: ''
  };
  const save = () => worker.fetch(new Request(url, {
    method: 'PUT', headers, body: JSON.stringify(state)
  }), env, {});
  assert.deepEqual(await (await save()).json(), { ok: true, revision: 1 });
  assert.deepEqual(await (await worker.fetch(new Request(url, { headers }), env, {})).json(), { ...state, _revision: 1 });
  assert.equal((await save()).status, 409);
});
