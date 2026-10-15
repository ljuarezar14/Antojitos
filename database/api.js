import { readState, writeState } from './store.js';

export function databaseApi() {
  return {
    name: 'antojitos-database-api',
    configureServer(server) { server.middlewares.use('/api/state', handler); }
  };
}

export async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
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
