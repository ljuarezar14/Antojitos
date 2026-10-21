// Browser tests of the real app: a fresh local database, the Worker running under
// `wrangler dev`, and Chrome on a phone-sized screen doing what Miriam and a helper do.
// Run with `npm run test:e2e` (builds first). Uses the installed Chrome; set CHROME_PATH
// if it is not in the usual place.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const PORT = 8791;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'clave-de-prueba-e2e-123';
const PIN = '2468';
const HELPER_PIN = '1357';
const CHROME = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome');
const root = new URL('..', import.meta.url);
const state = mkdtempSync(join(tmpdir(), 'antojitos-e2e-'));
const env = { ...process.env, CI: 'true' };
let server;
let browser;

const wrangler = args => spawnSync('npx', ['wrangler', ...args], { cwd: root, env, shell: true, encoding: 'utf8' });

before(async () => {
  const migrate = wrangler(['d1', 'migrations', 'apply', 'antojitos-miriam', '--local', '--persist-to', state]);
  assert.equal(migrate.status, 0, migrate.stderr);
  server = spawn('npx', ['wrangler', 'dev', '--persist-to', state, '--port', PORT, '--ip', '127.0.0.1', '--var', `ACCESS_PASSWORD:${PASSWORD}`],
    { cwd: root, env, shell: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wrangler dev no arrancó')), 120_000);
    const watch = chunk => { if (String(chunk).includes('Ready on')) { clearTimeout(timer); resolve(); } };
    server.stdout.on('data', watch);
    server.stderr.on('data', watch);
  });
  browser = await chromium.launch({ executablePath: CHROME, headless: true });
});

after(async () => {
  await browser?.close();
  if (server) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']);
    else server.kill();
  }
  // Windows takes a moment to release the database file after the server stops.
  try { rmSync(state, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 }); } catch (error) { console.warn(error.message); }
});

async function phone() {
  const context = await browser.newContext({
    httpCredentials: { username: 'miriam', password: PASSWORD },
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true
  });
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.accept());
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return { context, page, errors };
}
const tab = (page, name) => page.getByText(name, { exact: true }).locator('visible=true').first().click();
const api = (page, path, options = {}) => page.evaluate(async ([path, options]) => {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  return { status: response.status, body: await response.json().catch(() => null) };
}, [path, options]);
async function login(page, name, pin) {
  await page.goto(BASE);
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
  await page.getByText('A Preparar').first().waitFor();
}
async function takeOrder(page, dish) {
  await tab(page, 'Pedir');
  await page.getByText(dish, { exact: true }).first().click();
  await page.getByText('A Preparar').first().click();
}
const ordersOnServer = async page => (await api(page, '/api/orders?since=0')).body.orders;
const waitSynced = page => page.waitForFunction(() => {
  const queue = JSON.parse(localStorage.getItem('antojitos_miriam_order_sync') || '{"dirty":[]}');
  return queue.dirty.length === 0 && queue.removed.length === 0;
}, null, { timeout: 15_000 });

let admin;
let dish;

test('la primera vez se crea la administradora y carga la carta', async () => {
  admin = await phone();
  await admin.page.goto(BASE);
  await admin.page.getByPlaceholder('Nombre').fill('Miriam');
  await admin.page.getByPlaceholder('PIN de 4 números').fill(PIN);
  await admin.page.getByRole('button', { name: 'Crear administradora' }).click();
  await admin.page.getByText('A Preparar').first().waitFor();
  await admin.page.waitForTimeout(2000);
  const menu = (await api(admin.page, '/api/data?since=0')).body.records.menu;
  assert.ok(menu.length > 0, 'la carta inicial llegó al servidor');
  dish = menu.find(product => product.available).name;
});

test('un pedido cobrado en efectivo llega al servidor con número y quién lo tomó', async () => {
  const { page } = admin;
  await takeOrder(page, dish);
  await waitSynced(page);
  await tab(page, 'Pedidos');
  await page.getByRole('button', { name: 'Iniciar preparación' }).first().click();
  await page.getByText('¡Ya está Listo!').first().click();
  // The button bounces to draw attention, so it is never "stable" for Playwright.
  await page.getByText(/Cobrar y Entregar/).first().click({ force: true });
  await page.getByText('Confirmar Pago Recibido').click();
  await waitSynced(page);
  const [order] = await ordersOnServer(page);
  assert.equal(order.orderNumber, 1);
  assert.equal(order.status, 'entregado');
  assert.equal(order.payment.method, 'efectivo');
  assert.equal(order.createdBy, 'Miriam');
});

test('un pedido fiado aparece en Deudas y se salda con un abono', async () => {
  const { page } = admin;
  await takeOrder(page, dish);
  await waitSynced(page);
  await tab(page, 'Pedidos');
  await page.getByRole('button', { name: 'Iniciar preparación' }).first().click();
  await page.getByText('¡Ya está Listo!').first().click();
  await page.getByRole('button', { name: 'Entregar fiado' }).first().click();
  await page.getByPlaceholder('Nombre del cliente').fill('Wendy');
  await page.getByPlaceholder('Teléfono (opcional)').fill('987654321');
  await page.getByRole('button', { name: 'Confirmar fiado' }).click();
  await page.getByRole('heading', { name: 'Wendy' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Recordar por WhatsApp' }).count(), 1);
  await page.getByRole('button', { name: 'Registrar pago o abono' }).click();
  await page.getByRole('button', { name: 'Registrar abono', exact: true }).click();
  await waitSynced(page);
  const debt = (await ordersOnServer(page)).find(order => order.debt);
  assert.equal(debt.debtPayments.length, 1);
  assert.ok(debt.payment, 'la deuda quedó saldada');
});

test('una cuenta abierta se deja fiada aunque no esté lista', async () => {
  const { page } = admin;
  await tab(page, 'Pedir');
  await page.getByText(dish, { exact: true }).first().click();
  await page.getByPlaceholder(/Nombre o seña/).fill('Rosa');
  await page.getByRole('button', { name: 'Abrir cuenta para cobrar al retirarse' }).click();
  await page.getByRole('button', { name: 'Dejar fiado' }).click();
  await page.getByRole('heading', { name: 'Rosa' }).waitFor();
  await waitSynced(page);
  const account = (await ordersOnServer(page)).find(order => order.customerName === 'Rosa');
  assert.ok(account.debt, 'la cuenta quedó como deuda');
  assert.equal(account.openAccount, false);
  assert.equal(account.status, 'entregado');
});

test('la caja del día se cierra y el reporte semanal suma los cobros', async () => {
  const { page } = admin;
  await tab(page, 'Caja');
  await page.getByLabel('Efectivo contado').fill('0');
  await page.getByRole('button', { name: 'Cerrar caja' }).click();
  await page.getByText('Caja cerrada').waitFor();
  await page.getByRole('button', { name: 'Semana', exact: true }).click();
  await page.getByText('Calculando reporte').waitFor({ state: 'detached' });
  const total = (await ordersOnServer(page)).reduce((sum, order) => sum + order.total, 0);
  assert.ok(await page.getByText(`S/ ${total.toFixed(2)}`).first().isVisible(), `cobros de la semana: S/ ${total.toFixed(2)}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `la pantalla se sale ${overflow}px del celular`);
});

test('una ayudante toma pedidos pero no puede eliminarlos ni ver el historial', async () => {
  const created = await api(admin.page, '/api/data/users', {
    method: 'POST', body: JSON.stringify({ id: 'usr-e2e-ayudante', name: 'Lucía', role: 'ayudante', pin: HELPER_PIN, avatar: '🧑‍🍳' })
  });
  assert.equal(created.status, 200);
  const helper = await phone();
  await login(helper.page, 'Lucía', HELPER_PIN);
  await takeOrder(helper.page, dish);
  await waitSynced(helper.page);
  const order = (await ordersOnServer(helper.page)).find(item => item.createdBy === 'Lucía');
  assert.ok(order);
  assert.equal((await api(helper.page, `/api/orders/${order.id}`, { method: 'DELETE' })).status, 403);
  assert.equal((await api(helper.page, '/api/audit?from=2020-01-01T00:00:00Z&to=2100-01-01T00:00:00Z')).status, 403);
  assert.equal(await helper.page.getByText('Admin', { exact: true }).locator('visible=true').count(), 0);
  assert.deepEqual(helper.errors, []);
  await helper.context.close();
});

test('la administradora quita permisos a una ayudante y ella deja de ver esos botones', async () => {
  const { page, errors } = admin;
  // Lucía was created through the API, so reload to see her without waiting for the next poll.
  await page.reload();
  await page.getByText('A Preparar').first().waitFor();
  await page.getByTitle('Administrar usuarios y crear nuevos').click();
  await page.locator('div.rounded-2xl', { hasText: 'Lucía' }).getByTitle('Editar usuario o cambiar PIN').click();
  await page.getByLabel('Cobrar pedidos y recibir abonos').uncheck();
  await page.getByLabel('Ver la caja y los reportes').uncheck();
  await page.getByText('Guardar Cambios').click();
  await page.getByText('4 de 7 permisos').waitFor();
  await page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first().click();
  await waitSynced(page);

  const helper = await phone();
  await login(helper.page, 'Lucía', HELPER_PIN);
  await helper.page.getByText(dish, { exact: true }).first().click();
  assert.equal(await helper.page.getByText('Cobrar Ahora').count(), 0);
  assert.equal(await helper.page.getByText('Caja', { exact: true }).locator('visible=true').count(), 0);
  await tab(helper.page, 'Pedidos');
  assert.equal(await helper.page.getByText(/^Cobrar/).locator('visible=true').count(), 0);
  const order = (await ordersOnServer(helper.page)).find(item => item.createdBy === 'Lucía');
  const paid = await api(helper.page, `/api/orders/${order.id}`, {
    method: 'PUT', body: JSON.stringify({ order: { ...order, payment: { method: 'efectivo', amountPaid: order.total } }, baseSeq: order._seq })
  });
  assert.equal(paid.status, 403);
  assert.deepEqual(helper.errors, []);
  assert.deepEqual(errors, []);
  await helper.context.close();
});

test('sin señal el pedido queda con número provisional y se envía al volver', async () => {
  const { page, context } = admin;
  const before = (await ordersOnServer(page)).length;
  await context.setOffline(true);
  await takeOrder(page, dish);
  await tab(page, 'Pedidos');
  await page.getByText('N.º provisional').first().waitFor();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitSynced(page);
  await page.getByText('N.º provisional').waitFor({ state: 'detached' });
  assert.equal((await ordersOnServer(page)).length, before + 1);
});

test('el historial registra quién hizo cada cosa', async () => {
  const { page, errors } = admin;
  await tab(page, 'Admin');
  await page.getByText('Historial', { exact: true }).first().click();
  await page.getByText('Cargando historial').waitFor({ state: 'detached' });
  const text = await page.locator('main').textContent();
  for (const expected of ['Lucía', 'cobrado', 'fiado a Wendy', 'Cierre de caja']) assert.ok(text.includes(expected), expected);
  assert.deepEqual(errors, []);
});

test('un casero repite su último pedido y un plato se marca agotado desde Pedir', async () => {
  const { page, errors } = admin;
  const menu = (await api(page, '/api/data?since=0')).body.records.menu.filter(product => product.available);
  const [first, second] = menu;
  assert.equal((await api(page, '/api/data/customers', {
    method: 'POST', body: JSON.stringify({ id: 'cli-e2e-rosa', name: 'Rosa', phone: '', favoriteCremas: ['Todas'] })
  })).status, 200);
  const today = await page.evaluate(() => new Date().toLocaleDateString('en-CA'));
  assert.equal((await api(page, '/api/orders', {
    method: 'POST', body: JSON.stringify({
      id: 'PED-e2e-rosa', date: today, createdAt: new Date().toISOString(), status: 'entregado', total: first.price * 2 + second.price,
      customerId: 'cli-e2e-rosa', customerName: 'Rosa', items: [
        { id: first.id, name: first.name, price: first.price, quantity: 2, cremas: ['Ají'] },
        { id: second.id, name: second.name, price: second.price, quantity: 1, cremas: ['Todas'] }
      ], payment: { method: 'yape', paidAt: new Date().toISOString() }
    })
  })).status, 200);
  await page.waitForTimeout(6000); // next poll brings both

  // Sold out from the order screen: the other dish of Rosa's order cannot be repeated.
  await tab(page, 'Pedir');
  const card = page.locator('div.group').filter({ has: page.getByText(second.name, { exact: true }) }).first();
  await card.getByRole('button', { name: 'Marcar agotado' }).click();
  await card.getByRole('button', { name: 'Volver a activar' }).waitFor();

  await tab(page, 'Caseros');
  await page.getByTitle('Tomar pedido a este casero').first().click();
  await page.getByText('Repetir su último pedido').click();
  await page.getByText(`No se agregó (agotado o fuera de la carta): ${second.name}.`).waitFor();
  await page.getByText('A Preparar').first().click();
  await waitSynced(page);
  const repeated = (await ordersOnServer(page)).filter(order => order.customerId === 'cli-e2e-rosa' && order.id !== 'PED-e2e-rosa');
  assert.equal(repeated.length, 1);
  assert.deepEqual(repeated[0].items.map(item => [item.name, item.cremas]), [[first.name, ['Ají']], [first.name, ['Ají']]]);

  await tab(page, 'Pedir');
  await card.getByRole('button', { name: 'Volver a activar' }).click();
  await page.waitForTimeout(1500);
  assert.ok((await api(page, '/api/data?since=0')).body.records.menu.find(product => product.id === second.id).available);
  assert.deepEqual(errors, []);
});
