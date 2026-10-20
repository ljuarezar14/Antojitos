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

test('las páginas antiguas que piden el estado completo reciben aviso de recargar', async () => {
  const env = { ACCESS_PASSWORD: 'una-clave-larga-para-pruebas', DB: { prepare: () => { throw new Error('Database must not be accessed'); } } };
  const headers = { Authorization: `Basic ${btoa('miriam:una-clave-larga-para-pruebas')}` };
  const response = await worker.fetch(new Request('https://example.com/api/state', { method: 'PUT', headers, body: '{}' }), env, {});
  assert.equal(response.status, 410);
  assert.match((await response.json()).error, /Recarga/);
});
