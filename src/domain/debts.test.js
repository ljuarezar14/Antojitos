import test from 'node:test';
import assert from 'node:assert/strict';
import { allocatePayment, debtReminderText, groupDebts, whatsappUrl } from './debts.js';
import { buildPeriodReport, periodRange, previousRange } from './periodReport.js';

const debt = (id, extra) => ({
  id, date: '2026-10-16', status: 'entregado', total: 10, items: [{ name: 'Salchipollo', price: 5, quantity: 2 }],
  debt: { createdAt: '2026-10-16T20:00:00' }, debtPayments: [], ...extra
});

test('las deudas de una persona se juntan con un solo saldo', () => {
  const orders = [
    debt('a', { customerName: 'Wendy', debt: { createdAt: '2026-10-17T20:00:00' } }),
    debt('b', { customerName: 'wendy ', customerPhone: '987654321' }),
    debt('c', { customerName: 'Manu', total: 4, debtPayments: [{ amount: 4 }] }),
    debt('d', { customerName: 'Luis', status: 'cancelado' })
  ];
  const groups = groupDebts(orders);
  assert.deepEqual(groups.map(g => [g.name, g.balance, g.orders.map(o => o.id)]), [['Wendy', 20, ['b', 'a']]]);
  assert.equal(groups[0].phone, '987654321');
  assert.equal(groupDebts(orders, [], { includeSettled: true }).length, 2);
});

test('un abono se reparte pagando primero la deuda más antigua', () => {
  const orders = [debt('nueva', { debt: { createdAt: '2026-10-18T10:00:00' } }), debt('vieja', { debtPayments: [{ amount: 3 }] })];
  assert.deepEqual(allocatePayment(orders, 9.5), [{ orderId: 'vieja', amount: 7 }, { orderId: 'nueva', amount: 2.5 }]);
  assert.equal(allocatePayment(orders, 17.01), null);
  assert.equal(allocatePayment(orders, 0), null);
});

test('el recordatorio de WhatsApp lleva el detalle y el número peruano', () => {
  const [group] = groupDebts([debt('a', { customerName: 'Wendy Ruiz', customerPhone: '987 654 321' })]);
  const text = debtReminderText(group, { businessName: 'Antojitos', yapeNumber: '999888777' });
  assert.match(text, /Hola Wendy/);
  assert.match(text, /S\/ 10\.00/);
  assert.match(text, /2 Salchipollo/);
  assert.match(text, /yapear al 999888777/);
  assert.match(whatsappUrl(group.phone, text), /^https:\/\/wa\.me\/51987654321\?text=/);
  assert.match(whatsappUrl('', 'x'), /^https:\/\/api\.whatsapp\.com\/send\?text=x$/);
});

test('el reporte del periodo suma cobros, gastos, platos y mejores días', () => {
  const orders = [
    { id: '1', date: '2026-10-16', status: 'entregado', total: 12, items: [{ name: 'Hamburguesa', price: 6, quantity: 2 }],
      payment: { method: 'efectivo', paidAt: '2026-10-16T20:00:00' } },
    { id: '2', date: '2026-10-17', status: 'entregado', total: 30, items: [{ name: 'Broaster', price: 10, quantity: 3 }],
      payment: { method: 'yape', paidAt: '2026-10-17T20:00:00' } },
    { id: '3', date: '2026-10-17', status: 'cancelado', total: 6, items: [{ name: 'Hamburguesa', price: 6, quantity: 1 }],
      payment: { method: 'efectivo', paidAt: '2026-10-17T20:00:00' } },
    debt('4', { date: '2026-10-17', debt: { createdAt: '2026-10-17T21:00:00' }, debtPayments: [{ amount: 4, method: 'plin', paidAt: '2026-10-18T12:00:00' }] })
  ];
  const report = buildPeriodReport({ orders, expenses: [{ date: '2026-10-17', amount: 5 }] }, '2026-10-12', '2026-10-18');
  assert.equal(report.sales, 46);
  assert.equal(report.expenses, 5);
  assert.equal(report.profit, 41);
  assert.deepEqual(report.byMethod, [{ method: 'efectivo', total: 12 }, { method: 'yape', total: 30 }, { method: 'plin', total: 4 }]);
  assert.equal(report.orders, 3);
  assert.equal(report.cancelled, 1);
  assert.deepEqual(report.dishes[0], { name: 'Broaster', count: 3, total: 30 });
  assert.equal(report.bestDay.date, '2026-10-17');
  assert.equal(report.bestDay.weekday, 'Sábado');
  assert.deepEqual(report.newDebts, { count: 1, total: 10 });
  assert.equal(report.recovered, 4);
});

test('semana de lunes a domingo, mes completo y periodo anterior', () => {
  assert.deepEqual(periodRange('semana', '2026-10-17'), { from: '2026-10-12', to: '2026-10-18' });
  assert.deepEqual(periodRange('mes', '2026-02-10'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(previousRange({ from: '2026-10-12', to: '2026-10-18' }, 'semana'), { from: '2026-10-05', to: '2026-10-11' });
  assert.deepEqual(previousRange({ from: '2026-03-01', to: '2026-03-31' }, 'mes'), { from: '2026-02-01', to: '2026-02-28' });
});
