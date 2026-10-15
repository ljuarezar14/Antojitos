import test from 'node:test';
import assert from 'node:assert/strict';
import { debtBalance, paymentEvents } from './finance.js';

test('un abono cuenta el día del cobro y reduce el saldo sin duplicar la venta', () => {
  const firstDay = new Date(2026, 9, 14, 20).toISOString();
  const secondDay = new Date(2026, 9, 15, 20).toISOString();
  const order = {
    date: '2026-10-14', status: 'entregado', total: 10,
    debt: { createdAt: firstDay },
    debtPayments: [{ amount: 4, method: 'efectivo', paidAt: secondDay }],
    payment: null
  };
  assert.equal(debtBalance(order), 6);
  assert.equal(paymentEvents([order], '2026-10-14').length, 0);
  assert.deepEqual(paymentEvents([order], '2026-10-15').map(event => event.amount), [4]);

  order.debtPayments.push({ amount: 6, method: 'yape', paidAt: secondDay });
  order.payment = { method: 'yape', amountPaid: 10, paidAt: secondDay };
  assert.equal(debtBalance(order), 0);
  assert.deepEqual(paymentEvents([order], '2026-10-15').map(event => event.amount), [4, 6]);
});
