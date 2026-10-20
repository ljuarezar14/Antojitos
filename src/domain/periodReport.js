import { localDate, moneyAmount, paymentEvents } from './finance.js';

const round = value => Math.round(value * 100) / 100;
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const parse = date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const format = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const shiftDays = (date, days) => {
  const d = parse(date);
  d.setDate(d.getDate() + days);
  return format(d);
};

export function datesBetween(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = shiftDays(date, 1)) dates.push(date);
  return dates;
}

// The week (Monday to Sunday) or the month that contains `date`.
export function periodRange(kind, date) {
  const d = parse(date);
  if (kind === 'mes') {
    return { from: format(new Date(d.getFullYear(), d.getMonth(), 1)), to: format(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  const monday = shiftDays(date, -((d.getDay() + 6) % 7));
  return { from: monday, to: shiftDays(monday, 6) };
}

// The same-length period right before, for comparison.
export function previousRange({ from, to }, kind) {
  if (kind === 'mes') return periodRange('mes', shiftDays(from, -1));
  const length = datesBetween(from, to).length;
  return { from: shiftDays(from, -length), to: shiftDays(from, -1) };
}

// Totals for a range of days: money is counted on the day it was received (like the
// daily cash register); dishes and order counts on the day of the order.
export function buildPeriodReport({ orders = [], expenses = [] }, from, to) {
  const days = datesBetween(from, to).map(date => {
    const payments = paymentEvents(orders, date);
    const spent = expenses.filter(expense => expense.date === date).reduce((sum, expense) => sum + moneyAmount(expense.amount), 0);
    return { date, weekday: WEEKDAYS[parse(date).getDay()], sales: round(payments.reduce((sum, p) => sum + p.amount, 0)), expenses: round(spent), payments };
  });
  const payments = days.flatMap(day => day.payments);
  const sales = round(payments.reduce((sum, p) => sum + p.amount, 0));
  const spent = round(days.reduce((sum, day) => sum + day.expenses, 0));
  const byMethod = ['efectivo', 'yape', 'plin', 'tarjeta', 'otro']
    .map(method => ({ method, total: round(payments.filter(p => p.method === method).reduce((sum, p) => sum + p.amount, 0)) }))
    .filter(entry => entry.total > 0);

  const inRange = orders.filter(order => order.date >= from && order.date <= to);
  const sold = inRange.filter(order => order.status !== 'cancelado' && (order.payment || order.debt));
  const dishes = new Map();
  for (const order of sold) {
    for (const item of order.items || []) {
      const entry = dishes.get(item.name) || { name: item.name, count: 0, total: 0 };
      entry.count += Number(item.quantity) || 1;
      entry.total = round(entry.total + moneyAmount(item.price) * (Number(item.quantity) || 1));
      dishes.set(item.name, entry);
    }
  }
  const byWeekday = WEEKDAYS.map(weekday => {
    const matching = days.filter(day => day.weekday === weekday);
    return { weekday, days: matching.length, sales: round(matching.reduce((sum, day) => sum + day.sales, 0)) };
  }).filter(entry => entry.days && entry.sales > 0).sort((a, b) => b.sales - a.sales);

  const newDebts = orders.filter(order => order.debt && order.status !== 'cancelado' &&
    (localDate(order.debt.createdAt) || order.date) >= from && (localDate(order.debt.createdAt) || order.date) <= to);
  const recovered = payments.filter(p => p.order.debt);
  const openDays = days.filter(day => day.sales > 0);

  return {
    from, to,
    days: days.map(({ payments: _p, ...day }) => day),
    sales, expenses: spent, profit: round(sales - spent), byMethod,
    orders: sold.length,
    cancelled: inRange.filter(order => order.status === 'cancelado').length,
    averageTicket: sold.length ? round(sold.reduce((sum, order) => sum + moneyAmount(order.total), 0) / sold.length) : 0,
    dishes: [...dishes.values()].sort((a, b) => b.count - a.count || b.total - a.total),
    byWeekday,
    bestDay: openDays.reduce((best, day) => (!best || day.sales > best.sales ? day : best), null),
    openDays: openDays.length,
    newDebts: { count: newDebts.length, total: round(newDebts.reduce((sum, order) => sum + moneyAmount(order.total), 0)) },
    recovered: round(recovered.reduce((sum, p) => sum + p.amount, 0))
  };
}
