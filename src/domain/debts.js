import { debtBalance, moneyAmount } from './finance.js';

const cents = value => Math.round(moneyAmount(value) * 100);
const oldestFirst = (a, b) => String(a.debt?.createdAt || a.createdAt || a.date).localeCompare(String(b.debt?.createdAt || b.createdAt || b.date));
const personKey = order => order.customerId || `nombre:${String(order.customerName || '').trim().toLowerCase()}`;

// One entry per person who owes, with all their debts (oldest first) and one balance.
// includeSettled keeps people whose debts are all paid.
export function groupDebts(orders, customers = [], { includeSettled = false } = {}) {
  const groups = new Map();
  for (const order of orders) {
    if (!order.debt || order.status === 'cancelado') continue;
    if (!includeSettled && debtBalance(order) === 0) continue;
    const key = personKey(order);
    if (!groups.has(key)) groups.set(key, { key, name: order.customerName || 'Sin nombre', orders: [] });
    groups.get(key).orders.push(order);
  }
  return [...groups.values()].map(group => {
    const sorted = [...group.orders].sort(oldestFirst);
    const customer = customers.find(item => item.id === sorted[0].customerId) ||
      customers.find(item => item.name?.trim().toLowerCase() === group.name.trim().toLowerCase());
    const phone = [...sorted].reverse().map(order => order.customerPhone).find(Boolean) || customer?.phone || '';
    return {
      ...group,
      orders: sorted,
      phone,
      balance: sorted.reduce((sum, order) => sum + cents(debtBalance(order)), 0) / 100,
      total: sorted.reduce((sum, order) => sum + cents(order.total), 0) / 100
    };
  }).sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

// Splits a payment over a person's debts, paying the oldest first.
// Returns [{ orderId, amount }], or null if the amount is not valid for that balance.
export function allocatePayment(orders, amount) {
  let left = Math.round(Number(amount) * 100);
  const owed = [...orders].filter(order => debtBalance(order) > 0).sort(oldestFirst);
  const total = owed.reduce((sum, order) => sum + cents(debtBalance(order)), 0);
  if (!Number.isSafeInteger(left) || left <= 0 || left > total) return null;
  const allocations = [];
  for (const order of owed) {
    if (!left) break;
    const part = Math.min(left, cents(debtBalance(order)));
    allocations.push({ orderId: order.id, amount: part / 100 });
    left -= part;
  }
  return allocations;
}

const shortDate = date => {
  const [year, month, day] = String(date).split('-').map(Number);
  return year ? new Date(year, month - 1, day).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '';
};
const itemsText = order => (order.items || []).map(item => `${item.quantity || 1} ${String(item.name).trim()}`).join(', ');

// The reminder sent by WhatsApp: what is owed, for which orders, and how to pay.
export function debtReminderText(group, settings = {}) {
  const business = settings.businessName || 'Antojitos con Miriam';
  const owed = group.orders.filter(order => debtBalance(order) > 0);
  const lines = [
    `Hola ${group.name.split(' ')[0]} 👋, te saluda ${business}.`,
    `Te recordamos que tienes pendiente *S/ ${group.balance.toFixed(2)}*:`,
    ...owed.map(order => `• ${shortDate(order.date)}: ${itemsText(order) || 'pedido'} — S/ ${debtBalance(order).toFixed(2)}`)
  ];
  if (settings.yapeNumber) lines.push('', `Puedes yapear al ${settings.yapeNumber}${settings.yapeName ? ` (${settings.yapeName})` : ''}.`);
  lines.push('¡Gracias, casero! 🙌');
  return lines.join('\n');
}

// Peruvian mobiles have 9 digits starting with 9; other numbers are used as written.
export function whatsappUrl(phone, text) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (/^9\d{8}$/.test(digits)) digits = `51${digits}`;
  const message = encodeURIComponent(text);
  return digits ? `https://wa.me/${digits}?text=${message}` : `https://api.whatsapp.com/send?text=${message}`;
}
