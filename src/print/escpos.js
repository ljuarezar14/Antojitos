// Builds a receipt in ESC/POS, the language of cheap Bluetooth thermal printers.
// Most of them print only plain ASCII reliably, so accents and emojis are dropped.
import { debtBalance } from '../domain/finance.js';
import { orderNumberText } from '../domain/orders.js';

const ESC = 0x1b;
const GS = 0x1d;
const INIT = [ESC, 0x40];
const ALIGN_LEFT = [ESC, 0x61, 0];
const ALIGN_CENTER = [ESC, 0x61, 1];
const BOLD_ON = [ESC, 0x45, 1];
const BOLD_OFF = [ESC, 0x45, 0];
const BIG_ON = [GS, 0x21, 0x11];
const BIG_OFF = [GS, 0x21, 0x00];
const FEED_AND_CUT = [ESC, 0x64, 4, GS, 0x56, 0x42, 0];

export const toAscii = text => String(text ?? '')
  .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[¡¿]/g, '')
  .replace(/[^\x20-\x7e\n]/g, '')
  .replace(/ {2,}/g, ' ');

// Breaks text into lines of at most `width` characters.
export function wrap(text, width) {
  const lines = [];
  for (const paragraph of toAscii(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ').filter(Boolean)) {
      if (!line) line = word;
      else if (line.length + 1 + word.length <= width) line += ` ${word}`;
      else { lines.push(line); line = word; }
      while (line.length > width) { lines.push(line.slice(0, width)); line = line.slice(width); }
    }
    lines.push(line);
  }
  return lines;
}

// "2x Salchipollo ........ S/ 12.00" on one line, wrapping the name when needed.
const row = (left, right, width) => {
  const rightText = toAscii(right);
  const lines = wrap(left, width - rightText.length - 1);
  const last = lines.pop();
  return [...lines, `${last}${' '.repeat(Math.max(1, width - last.length - rightText.length))}${rightText}`];
};

const money = value => `S/ ${(Number(value) || 0).toFixed(2)}`;

export function receiptLines(order, settings = {}, width = 32) {
  const rule = '-'.repeat(width);
  const when = new Date(order.createdAt || Date.now()).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
  const body = [
    rule,
    ...wrap(`Ticket: ${orderNumberText(order)}`, width),
    ...wrap(`Cliente: ${order.customerName || 'Cliente al paso'}`, width),
    ...wrap(`${order.orderType === 'llevar' ? 'Para llevar' : 'Para comer aqui'} - ${when}`, width),
    rule
  ];
  for (const item of order.items || []) {
    const quantity = Number(item.quantity) || 1;
    body.push(...row(`${quantity}x ${String(item.name).trim()}`, money(Number(item.price) * quantity), width));
    if (item.cremas?.length) body.push(...wrap(`  Cremas: ${item.cremas.join(', ')}`, width));
  }
  if (!(order.items || []).some(item => item.cremas?.length) && order.cremas?.length) {
    body.push(...wrap(`Cremas: ${order.cremas.join(', ')}`, width));
  }
  if (order.specialInstructions) body.push(...wrap(`Nota: ${order.specialInstructions}`, width));
  body.push(rule);
  const status = order.debt
    ? (debtBalance(order) > 0 ? `FIADO - SALDO ${money(debtBalance(order))}` : 'DEUDA SALDADA')
    : order.payment
      ? `PAGADO (${String(order.payment.method).toUpperCase()})${order.payment.change > 0 ? ` - VUELTO ${money(order.payment.change)}` : ''}`
      : 'PENDIENTE DE PAGO';
  return {
    header: [settings.businessName || 'Antojitos con Miriam', settings.businessSubtitle].filter(Boolean),
    body,
    total: `TOTAL ${money(order.total)}`,
    status: wrap(status, width),
    footer: wrap(settings.thankYouMessage || 'Muchas gracias por su preferencia casero!', width)
  };
}

// The bytes to send to the printer.
export function buildReceipt(order, settings = {}, width = 32) {
  const { header, body, total, status, footer } = receiptLines(order, settings, width);
  const text = lines => Array.from(new TextEncoder().encode(lines.map(toAscii).join('\n') + '\n'));
  return Uint8Array.from([
    ...INIT,
    ...ALIGN_CENTER, ...BOLD_ON, ...text(wrap(header[0], width)), ...BOLD_OFF,
    ...(header[1] ? text(wrap(header[1], width)) : []),
    ...ALIGN_LEFT, ...text(body),
    ...ALIGN_CENTER, ...BOLD_ON, ...BIG_ON, ...text([total]), ...BIG_OFF,
    ...text(status), ...BOLD_OFF,
    ...text(footer),
    ...FEED_AND_CUT
  ]);
}
