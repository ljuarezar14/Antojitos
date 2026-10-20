// An order made without signal has a number guessed on this device; the server gives the
// final one when it arrives (it can change if another device took that number meanwhile).
export const isProvisional = order => order?._seq == null;

export const orderNumberText = order => `#${order?.orderNumber ?? '?'}${isProvisional(order) ? ' (provisional)' : ''}`;

// The customer's most recent order that was not cancelled (by id, or by name for orders
// taken before they were saved as a casero).
export function lastOrderOf(orders, customer) {
  if (!customer) return null;
  const name = String(customer.name || '').trim().toLowerCase();
  return orders
    .filter(order => order.status !== 'cancelado' && (order.items || []).length &&
      (order.customerId ? order.customerId === customer.id : String(order.customerName || '').trim().toLowerCase() === name))
    .reduce((last, order) => (!last || String(order.createdAt) > String(last.createdAt) ? order : last), null);
}

// Cart lines (one per unit, at today's price) to order the same again. Dishes that are
// sold out or no longer on the menu are returned apart.
export function repeatLines(order, menu, makeLineId) {
  const lines = [];
  const missing = [];
  for (const item of order?.items || []) {
    const product = menu.find(entry => entry.id === item.id) || menu.find(entry => entry.name === item.name);
    if (!product?.available) {
      missing.push(item.name);
      continue;
    }
    for (let unit = 0; unit < (Number(item.quantity) || 1); unit++) {
      lines.push({
        lineId: makeLineId(), id: product.id, name: product.name, price: product.price,
        quantity: 1, notes: item.notes || '', cremas: [...(item.cremas || ['Todas'])]
      });
    }
  }
  return { lines, missing: [...new Set(missing)] };
}
