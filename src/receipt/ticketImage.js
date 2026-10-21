import { orderNumberText } from '../domain/orders';
import { debtBalance } from '../domain/finance';

const WIDTH = 480;
const PAD = 28;
const SCALE = 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const INK = '#1c1917';
const MUTED = '#57534e';
const AMBER = '#d97706';

const loadImage = src => new Promise(resolve => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

const wrap = (ctx, text, maxWidth) => {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

export const orderStatusText = order => {
  if (order.debt) return debtBalance(order) > 0 ? `FIADO · SALDO S/ ${debtBalance(order).toFixed(2)}` : 'DEUDA SALDADA';
  if (order.payment) return `PAGADO (${order.payment.method.toUpperCase()})`;
  return 'PENDIENTE DE PAGO';
};

// Draws the ticket. Called twice: once without drawing to measure the height, then for real.
function paint(ctx, order, settings, logo, formattedDate, draw) {
  const right = WIDTH - PAD;
  const inner = WIDTH - PAD * 2;
  let y = PAD;
  const text = (value, x, { size = 16, weight = 400, color = INK, align = 'left' } = {}) => {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    if (draw) ctx.fillText(value, x, y);
  };
  const lines = (value, options = {}) => {
    const size = options.size || 16;
    ctx.font = `${options.weight || 400} ${size}px ${FONT}`;
    for (const line of wrap(ctx, value, inner)) {
      y += size * 1.35;
      text(line, options.align === 'center' ? WIDTH / 2 : PAD, options);
    }
  };
  const dashed = () => {
    y += 14;
    if (draw) {
      ctx.strokeStyle = '#a8a29e';
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(right, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    y += 4;
  };

  if (logo) {
    const height = Math.min(110, logo.height * (inner / logo.width));
    const width = logo.width * (height / logo.height);
    if (draw) ctx.drawImage(logo, (WIDTH - width) / 2, y, width, height);
    y += height + 4;
  }
  // The logo already shows the name.
  if (!logo) lines(settings?.businessName || 'Antojitos con Miriam', { size: 26, weight: 800, align: 'center' });
  lines(settings?.businessSubtitle || 'Hamburguesas • Frituras • Comidas • Bebidas', { size: 14, color: MUTED, align: 'center' });
  dashed();

  y += 24;
  text(`Pedido ${orderNumberText(order)}`, PAD, { size: 20, weight: 800 });
  text(order.orderType === 'llevar' ? 'PARA LLEVAR' : 'PARA COMER AQUÍ', right, { size: 13, weight: 800, color: AMBER, align: 'right' });
  lines(order.customerName || 'Cliente al paso', { size: 15, color: MUTED });
  lines(formattedDate, { size: 13, color: MUTED });
  dashed();

  for (const item of order.items || []) {
    const price = `S/ ${(Number(item.price) * Number(item.quantity || 1)).toFixed(2)}`;
    ctx.font = `700 16px ${FONT}`;
    const priceWidth = ctx.measureText(price).width;
    ctx.font = `400 16px ${FONT}`;
    wrap(ctx, `${item.quantity || 1} × ${item.name}`, inner - priceWidth - 12).forEach((line, index) => {
      y += 22;
      text(line, PAD, { size: 16 });
      if (index === 0) text(price, right, { size: 16, weight: 700, align: 'right' });
    });
    if (item.cremas?.length) lines(`   Cremas: ${item.cremas.join(', ')}`, { size: 13, color: MUTED });
  }

  const perItemCremas = order.items?.some(item => item.cremas?.length);
  if ((!perItemCremas && order.cremas?.length) || order.specialInstructions) {
    dashed();
    if (!perItemCremas && order.cremas?.length) lines(`Cremas: ${order.cremas.join(', ')}`, { size: 14 });
    if (order.specialInstructions) lines(`Nota: ${order.specialInstructions}`, { size: 14 });
  }
  dashed();

  y += 34;
  text('TOTAL', PAD, { size: 18, weight: 700 });
  text(`S/ ${Number(order.total).toFixed(2)}`, right, { size: 30, weight: 900, color: AMBER, align: 'right' });
  y += 8;
  const statusColor = order.debt ? '#b91c1c' : order.payment ? '#047857' : MUTED;
  lines(orderStatusText(order), { size: 15, weight: 800, color: statusColor, align: 'center' });
  if (order.payment?.change > 0 && !order.debt) lines(`Vuelto: S/ ${order.payment.change.toFixed(2)}`, { size: 14, color: MUTED, align: 'center' });
  dashed();
  lines(settings?.thankYouMessage || '¡Muchas gracias por su preferencia casero! ✨', { size: 15, align: 'center' });
  return y + PAD;
}

// The ticket as a PNG file, ready to share or save.
export async function ticketImageFile(order, settings, formattedDate) {
  const logo = await loadImage(settings?.logo || '/logo.png');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const height = paint(ctx, order, settings, logo, formattedDate, false);
  canvas.width = WIDTH * SCALE;
  canvas.height = Math.ceil(height * SCALE);
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, WIDTH, height);
  paint(ctx, order, settings, logo, formattedDate, true);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const name = `ticket-${orderNumberText(order).replace(/[^\w-]+/g, '') || 'pedido'}.png`;
  return new File([blob], name, { type: 'image/png' });
}

// Opens the phone's share menu (WhatsApp, etc.). Where that is not available, as on most
// computers, the image is downloaded instead so it can be attached by hand.
export async function shareTicketImage(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
