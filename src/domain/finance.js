export const moneyAmount = value => Number(value) || 0;

export function localDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function debtBalance(order) {
  if (!order.debt) return 0;
  const paid = (order.debtPayments || []).reduce((sum, payment) => sum + moneyAmount(payment.amount), 0);
  return Math.max(0, Math.round((moneyAmount(order.total) - paid) * 100) / 100);
}

export function paymentEvents(orders, date) {
  return orders.flatMap(order => {
    if (order.status === 'cancelado') return [];
    if (order.debt) {
      return (order.debtPayments || [])
        .filter(payment => localDate(payment.paidAt) === date)
        .map(payment => ({ order, method: payment.method, amount: moneyAmount(payment.amount), paidAt: payment.paidAt }));
    }
    if (!order.payment) return [];
    const paidDate = localDate(order.payment.paidAt) || order.date;
    return paidDate === date ? [{
      order, method: order.payment.method, amount: moneyAmount(order.total), paidAt: order.payment.paidAt
    }] : [];
  });
}
