import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceipt, receiptLines, toAscii, wrap } from './escpos.js';

const order = {
  orderNumber: 7, _seq: 3, customerName: 'Señora Ñusta', orderType: 'llevar', createdAt: '2026-10-20T20:00:00Z',
  items: [{ name: 'Salchipollo con papas nativas y doble porción', price: 6, quantity: 2, cremas: ['Ají', 'Tártara'] }],
  total: 12, payment: { method: 'yape', change: 0 }
};

test('el texto de la impresora queda en ASCII sin perder palabras', () => {
  assert.equal(toAscii('¡Ñandú tártara! 🍔'), 'Nandu tartara! ');
  assert.deepEqual(wrap('uno dos tres cuatro', 9), ['uno dos', 'tres', 'cuatro']);
});

test('cada línea del ticket cabe en el ancho del papel', () => {
  for (const width of [32, 48]) {
    const { body, status, footer } = receiptLines(order, { thankYouMessage: '¡Gracias casero! ✨' }, width);
    for (const line of [...body, ...status, ...footer]) assert.ok(line.length <= width, `"${line}" (${line.length} > ${width})`);
  }
  const { body } = receiptLines(order, {}, 32);
  assert.ok(body.some(line => line.endsWith('S/ 12.00')));
  assert.ok(body.some(line => line.includes('Cremas: Aji, Tartara')));
});

test('los bytes empiezan inicializando la impresora y terminan cortando', () => {
  const bytes = buildReceipt(order, { businessName: 'Antojitos' });
  assert.deepEqual([...bytes.slice(0, 2)], [0x1b, 0x40]);
  assert.deepEqual([...bytes.slice(-4)], [0x1d, 0x56, 0x42, 0]);
  assert.ok(bytes.every(byte => byte < 0x80));
  assert.match(new TextDecoder().decode(bytes), /TOTAL S\/ 12\.00/);
  assert.match(new TextDecoder().decode(bytes), /PAGADO \(YAPE\)/);
});
