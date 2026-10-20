// A record of who changed what (orders, charges, expenses, prices, cash closings...), so a
// difference in the cash register can be traced. The server writes it with the signed-in
// user, so a device cannot fake it. Admin › Historial shows it.

import { PERMISSIONS, can } from '../src/domain/permissions.js';

const KEEP_DAYS = 180;
const MAX_ENTRIES = 1000;

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

const money = value => `S/ ${(Number(value) || 0).toFixed(2)}`;

// A failed log entry must not undo or repeat the change it describes.
export async function logChange(db, user, entity, entityId, action, detail = '') {
  try {
    await db.prepare(`INSERT INTO audit_log (at, user_id, user_name, entity, entity_id, action, detail)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(new Date().toISOString(), user?.id ?? null, user?.name ?? null, entity, entityId ?? null, action, detail.slice(0, 500)).run();
  } catch (error) {
    console.error('No se pudo registrar en el historial', error);
  }
}

const orderName = order => `Pedido #${order.orderNumber ?? '?'}${order.customerName ? ` (${order.customerName})` : ''}`;

export const describeNewOrder = order => `${orderName(order)} por ${money(order.total)}`;
export const describeDeletedOrder = order => `${orderName(order)} de ${order.date}, ${money(order.total)}, estado ${order.status}${order.payment ? `, cobrado en ${order.payment.method}` : ''}`;

export function describeOrderChange(before, after) {
  const parts = [];
  if (before.status !== after.status) parts.push(after.status === 'cancelado' ? 'lo canceló' : `estado ${before.status} → ${after.status}`);
  if (!before.debt && after.debt) parts.push(`fiado a ${after.customerName} por ${money(after.total)}`);
  else if (!before.payment && after.payment && !after.debt) parts.push(`cobrado ${money(after.total)} en ${after.payment.method}`);
  else if (before.payment && !after.payment && !after.debt) parts.push('se quitó el cobro');
  else if (before.payment && after.payment && before.payment.method !== after.payment.method) {
    parts.push(`cobro cambiado de ${before.payment.method} a ${after.payment.method}`);
  }
  const known = new Set((before.debtPayments || []).map(payment => payment.id));
  for (const payment of after.debtPayments || []) {
    if (!known.has(payment.id)) parts.push(`abono ${money(payment.amount)} en ${payment.method}`);
  }
  if (Number(before.total) !== Number(after.total)) parts.push(`total ${money(before.total)} → ${money(after.total)}`);
  const count = order => (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  if (count(before) !== count(after)) parts.push(`productos ${count(before)} → ${count(after)}`);
  return `${orderName(after)}: ${parts.join('; ') || 'editado'}`;
}

export function describeRecord(collection, item, before) {
  switch (collection) {
    case 'users': {
      const changed = PERMISSIONS.filter(({ key }) => before && can(before, key) !== can(item, key))
        .map(({ key, label }) => `${can(item, key) ? 'puede' : 'ya no puede'}: ${label.toLowerCase()}`);
      return `Usuario ${item.name} (${item.role})${changed.length ? ` · ${changed.join('; ')}` : ''}`;
    }
    case 'customers': return `Casero ${item.name}`;
    case 'categories': return `Categoría ${item.name}`;
    case 'cremas': return `Crema ${item.name}`;
    case 'menu': {
      const price = before && Number(before.price) !== Number(item.price) ? `, precio ${money(before.price)} → ${money(item.price)}` : '';
      return `Producto ${item.name}${price}${before && before.available !== item.available ? (item.available ? ', disponible' : ', agotado') : ''}`;
    }
    case 'expenses': return `Gasto "${item.description}" ${money(item.amount)} del ${item.date}`;
    case 'closings': return `Cierre de caja del ${item.date}: contado ${money(item.countedCash)}, esperado ${money(item.expectedCash)}`;
    case 'config': return item.id === 'settings' ? 'Configuración del negocio' : 'Mensaje de saludo';
    default: return item.id;
  }
}

export const pruneAudit = db =>
  db.prepare('DELETE FROM audit_log WHERE at < ?').bind(new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()).run();

// GET /api/audit?from=ISO&to=ISO: the entries between two instants, newest first.
export async function handleAudit(request, db, url, user) {
  if (user.role !== 'admin') return json({ error: 'Solo la administradora puede ver el historial.' }, 403);
  if (request.method !== 'GET') return json({ error: 'Método no permitido' }, 405);
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';
  const instant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
  if (!instant.test(from) || !instant.test(to)) return json({ error: 'Fechas inválidas' }, 400);
  const { results } = await db.prepare(`SELECT id, at, user_name AS userName, entity, entity_id AS entityId, action, detail
    FROM audit_log WHERE at >= ? AND at < ? ORDER BY id DESC LIMIT ${MAX_ENTRIES}`).bind(from, to).all();
  return json({ entries: results });
}
