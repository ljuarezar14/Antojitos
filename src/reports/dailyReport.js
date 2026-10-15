import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { localDate, paymentEvents } from '../domain/finance.js';

const amount = value => Number(value) || 0;
const money = value => `S/ ${amount(value).toFixed(2)}`;
const paymentLabel = method => ({
  efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', otro: 'Otro'
})[method] || 'Sin indicar';
const dateLabel = date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
};
const timeLabel = value => value ? new Date(value).toLocaleTimeString('es-PE', {
  hour: '2-digit', minute: '2-digit'
}) : '-';

export function buildDailyReport({ orders = [], expenses = [], settings = {} }, date) {
  const collected = paymentEvents(orders, date);
  const delivered = orders.filter(order => order.date === date && order.status === 'entregado');
  const newDebts = delivered.filter(order => order.debt);
  const debtsAtClose = orders.filter(order => order.debt && localDate(order.debt.createdAt) <= date)
    .map(order => {
      const paid = (order.debtPayments || []).filter(payment => localDate(payment.paidAt) <= date)
        .reduce((sum, payment) => sum + amount(payment.amount), 0);
      return { order, paid, balance: Math.max(0, Math.round((amount(order.total) - paid) * 100) / 100) };
    }).filter(entry => entry.balance > 0);
  const outstandingAtClose = debtsAtClose.reduce((sum, entry) => sum + entry.balance, 0);
  const dailyExpenses = expenses.filter(expense => expense.date === date);
  const sales = collected.reduce((sum, payment) => sum + payment.amount, 0);
  const spent = dailyExpenses.reduce((sum, expense) => sum + amount(expense.amount), 0);
  const methods = ['efectivo', 'yape', 'plin', 'tarjeta', 'otro'].map(method => ({
    label: paymentLabel(method),
    total: collected.filter(payment => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0)
  }));
  const dishes = new Map();
  delivered.forEach(order => (order.items || []).forEach(item => {
    const previous = dishes.get(item.name) || { count: 0, total: 0 };
    const quantity = amount(item.quantity) || 1;
    dishes.set(item.name, {
      count: previous.count + quantity,
      total: previous.total + amount(item.price) * quantity
    });
  }));

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const businessName = settings.businessName || 'Antojitos con Miriam';
  doc.setFillColor(35, 29, 22);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 197, 65);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(businessName, 14, 16);
  doc.setFontSize(11);
  doc.text('REPORTE DE CIERRE DE CAJA', 14, 26);
  doc.setTextColor(45, 45, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Fecha de operaciones: ${dateLabel(date)}`, 14, 43);
  doc.text(`Generado: ${new Date().toLocaleString('es-PE')}`, 14, 49);

  const tableStyle = {
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [72, 54, 32], textColor: 255 },
    margin: { left: 14, right: 14, top: 17, bottom: 17 }
  };
  const section = (title, head, body, startY) => {
    if (startY > 264) { doc.addPage(); startY = 21; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(130, 78, 20);
    doc.text(title, 14, startY);
    autoTable(doc, { ...tableStyle, startY: startY + 3, head: [head], body });
    return doc.lastAutoTable.finalY + 10;
  };

  let y = section('Resumen', ['Concepto', 'Resultado'], [
    ['Pedidos entregados', String(delivered.length)],
    ['Pagos y abonos recibidos', String(collected.length)],
    ['Cobro promedio', money(collected.length ? sales / collected.length : 0)],
    ['Cobros recibidos', money(sales)],
    ['Gastos registrados', money(spent)],
    ['Resultado del día (cobros - gastos)', money(sales - spent)],
    ['Pedidos fiados del día', `${newDebts.length} (${money(newDebts.reduce((sum, order) => sum + amount(order.total), 0))})`],
    ['Saldo fiado pendiente al cierre', money(outstandingAtClose)],
    ['Fondo inicial declarado', money(settings.initialCash)]
  ], 59);
  y = section('Cobros por método de pago', ['Método', 'Total'], methods.map(item => [item.label, money(item.total)]), y);
  y = section('Gastos del día', ['Descripción', 'Importe'], dailyExpenses.length
    ? dailyExpenses.map(expense => [expense.description || '-', money(expense.amount)])
    : [['Sin gastos registrados', money(0)]], y);
  y = section('Platos entregados', ['Plato', 'Unidades', 'Importe'], dishes.size
    ? [...dishes.entries()].sort((a, b) => b[1].count - a[1].count).map(([name, item]) => [name, String(item.count), money(item.total)])
    : [['Sin platos vendidos', '0', money(0)]], y);
  y = section('Deudas pendientes al cierre', ['Pedido', 'Cliente', 'Teléfono', 'Total', 'Abonado', 'Por cobrar'], debtsAtClose.length
    ? debtsAtClose.map(({ order, paid, balance }) => [
      `#${order.orderNumber || '-'} (${order.date})`,
      order.customerName || 'Sin nombre',
      order.customerPhone || '-',
      money(order.total), money(paid), money(balance)
    ])
    : [['-', 'Sin deudas pendientes', '-', money(0), money(0), money(0)]], y);
  section('Detalle de cobros', ['N°', 'Hora', 'Cliente', 'Platos', 'Pago', 'Cobrado'], collected.length
    ? collected.map(({ order, method, amount: paidAmount, paidAt }) => [
      String(order.orderNumber || '-'),
      timeLabel(paidAt || order.createdAt),
      order.customerName || 'Cliente al paso',
      (order.items || []).map(item => `${amount(item.quantity) || 1} x ${item.name}`).join(', ') || '-',
      paymentLabel(method),
      money(paidAmount)
    ])
    : [['-', '-', 'Sin cobros registrados', '-', '-', money(0)]], y);

  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setDrawColor(210, 210, 210);
    doc.line(14, 282, pageWidth - 14, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`${businessName} - ${date}`, 14, 288);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth - 14, 288, { align: 'right' });
  }
  return doc;
}
