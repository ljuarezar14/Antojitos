import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { orderNumberText } from '../domain/orders';
import { debtBalance } from '../domain/finance';
import { allocatePayment, debtReminderText, groupDebts, whatsappUrl } from '../domain/debts';
import { MessageCircle, Search } from 'lucide-react';

const methods = [
  ['efectivo', 'Efectivo'], ['yape', 'Yape'], ['plin', 'Plin'],
  ['tarjeta', 'Tarjeta'], ['otro', 'Otro']
];

const timeOf = value => value ? new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
const dayOf = date => {
  const [year, month, day] = String(date).split('-').map(Number);
  return year ? new Date(year, month - 1, day).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
};
const normalize = text => String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// What was ordered, so both sides can check what the debt is for.
const OrderDetail = ({ order }) => {
  const items = order.items || [];
  const fiadoBy = (order.statusHistory || []).findLast?.(entry => entry.status === 'entregado')?.by;
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-stone-800/60 border border-slate-200 dark:border-stone-700 p-3 space-y-1.5">
      {items.map((item, index) => (
        <div key={index} className="text-xs sm:text-sm">
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-800 dark:text-stone-200 font-semibold">
              <span className="font-black text-amber-700 dark:text-amber-300">{item.quantity || 1}x</span> {item.name}
            </span>
            <span className="font-bold text-slate-600 dark:text-stone-400 whitespace-nowrap">
              S/ {(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
            </span>
          </div>
          {item.cremas?.length > 0 && (
            <p className="ml-5 text-[11px] font-bold text-amber-700 dark:text-amber-400">🌶️ {item.cremas.join(', ')}</p>
          )}
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-slate-500 dark:text-stone-400">Sin productos registrados.</p>}
      {!items.some(item => item.cremas?.length) && order.cremas?.length > 0 && (
        <p className="text-[11px] text-slate-600 dark:text-stone-300">Cremas: {order.cremas.join(', ')}</p>
      )}
      {order.specialInstructions && (
        <p className="text-[11px] text-amber-900 dark:text-amber-200">⚠️ <strong>Nota:</strong> {order.specialInstructions}</p>
      )}
      <p className="pt-1 border-t border-slate-200 dark:border-stone-700 text-[11px] text-slate-500 dark:text-stone-400">
        {order.orderType === 'llevar' ? '🥡 Para llevar' : '🍽️ En mesa'}
        {order.createdAt ? ` · Pedido a las ${timeOf(order.createdAt)}` : ''}
        {order.createdBy ? ` · Tomó: ${order.createdBy}` : ''}
        {order.debt?.createdAt ? ` · Fiado a las ${timeOf(order.debt.createdAt)}` : ''}
        {fiadoBy ? ` por ${fiadoBy}` : ''}
      </p>
      {(order.debtPayments || []).length > 0 && (
        <div className="pt-1 border-t border-slate-200 dark:border-stone-700 text-[11px] text-slate-600 dark:text-stone-300 space-y-0.5">
          <p className="font-black">Abonos</p>
          {order.debtPayments.map(payment => (
            <p key={payment.id}>
              {new Date(payment.paidAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })} · {payment.method} · S/ {Number(payment.amount).toFixed(2)}
              {payment.by ? ` · recibió ${payment.by}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// One person: their total, a WhatsApp reminder, one payment for everything and each order.
const DebtorCard = ({ group, settings, onPay }) => {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [error, setError] = useState('');
  const allocation = amount === '' ? null : allocatePayment(group.orders, amount);

  const submit = event => {
    event.preventDefault();
    setError('');
    const message = onPay(allocation, method);
    if (message) {
      setError(message);
      return;
    }
    setPaying(false);
    setAmount('');
  };
  const remind = () => window.open(whatsappUrl(group.phone, debtReminderText(group, settings)), '_blank');

  return (
    <div className="rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-white">{group.name}</h3>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            {group.orders.length} {group.orders.length === 1 ? 'pedido fiado' : 'pedidos fiados'}
            {group.phone ? ` · ${group.phone}` : ' · sin teléfono'}
          </p>
        </div>
        <span className={`text-lg font-black ${group.balance ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {group.balance ? `Debe S/ ${group.balance.toFixed(2)}` : 'Saldado'}
        </span>
      </div>

      {group.balance > 0 && !paying && (
        <div className="flex flex-wrap gap-2">
          {onPay && <button type="button" onClick={() => { setPaying(true); setAmount(group.balance.toFixed(2)); setError(''); }}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-stone-950">
            Registrar pago o abono
          </button>}
          <button type="button" onClick={remind}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-black text-white flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4" /> Recordar por WhatsApp
          </button>
        </div>
      )}

      {paying && (
        <form onSubmit={submit} className="space-y-2 rounded-xl border border-amber-300 dark:border-amber-500/40 p-3">
          <div className="flex flex-wrap gap-2">
            <input type="number" min="0.01" max={group.balance} step="0.01" required value={amount} aria-label="Importe del abono"
              onChange={event => setAmount(event.target.value)} placeholder="Importe S/"
              className="w-32 rounded-xl border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-slate-900 dark:text-white" />
            <select value={method} onChange={event => setMethod(event.target.value)} aria-label="Método de pago"
              className="rounded-xl border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-slate-900 dark:text-white">
              {methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Registrar abono</button>
            <button type="button" onClick={() => setPaying(false)} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 dark:text-stone-300">Cancelar</button>
          </div>
          {group.orders.length > 1 && allocation && (
            <p className="text-xs text-slate-600 dark:text-stone-300">
              Se aplica primero a lo más antiguo: {allocation.map(({ orderId, amount: part }) =>
                `${orderNumberText(group.orders.find(order => order.id === orderId))} S/ ${part.toFixed(2)}`).join(' · ')}
            </p>
          )}
          {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
        </form>
      )}

      <div className="space-y-2">
        {group.orders.map(order => {
          const balance = debtBalance(order);
          return (
            <details key={order.id} open={group.orders.length <= 2} className="group">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-sm py-1">
                <span className="font-bold text-slate-800 dark:text-stone-100">
                  Pedido {orderNumberText(order)} · <span className="capitalize">{dayOf(order.date)}</span>
                  <span className="ml-1 text-xs font-medium text-amber-600 group-open:hidden">ver detalle</span>
                </span>
                <span className={`whitespace-nowrap font-black ${balance ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {balance ? `S/ ${balance.toFixed(2)}` : 'Pagado'}
                  <span className="ml-1 text-xs font-medium text-slate-400">de S/ {Number(order.total).toFixed(2)}</span>
                </span>
              </summary>
              <OrderDetail order={order} />
            </details>
          );
        })}
      </div>
    </div>
  );
};

export const DebtsView = () => {
  const { orders, customers, settings, recordDebtPayments, dbError, can } = useApp();
  const [showSettled, setShowSettled] = useState(false);
  const [query, setQuery] = useState('');
  const groups = groupDebts(orders, customers, { includeSettled: showSettled });
  const owing = groups.filter(group => group.balance > 0);
  const outstanding = owing.reduce((sum, group) => sum + group.balance, 0);
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const digits = query.replace(/\D/g, '');
  const shown = groups.filter(group => !query.trim() ||
    words.every(word => normalize(group.name).includes(word)) ||
    (digits.length >= 3 && group.phone.replace(/\D/g, '').includes(digits)));

  const pay = (allocation, method) => {
    if (dbError) return 'Hay un error de guardado. Resuélvelo antes de registrar un abono.';
    if (!allocation || !recordDebtPayments(allocation, method)) return 'Ingresa un importe mayor a cero y no mayor que el saldo.';
    return '';
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 space-y-4">
      <div className="rounded-2xl bg-stone-900 border border-amber-500/30 p-5 text-white">
        <h2 className="text-xl font-black text-amber-400">Deudas de clientes</h2>
        <p className="text-sm mt-2">
          Saldo total por cobrar: <strong>S/ {outstanding.toFixed(2)}</strong>
          {owing.length > 0 && <> · {owing.length} {owing.length === 1 ? 'persona' : 'personas'}</>}
        </p>
        <p className="text-xs text-stone-300 mt-1">Para fiar un pedido, registra el nombre del cliente, marca el pedido como listo y elige «Entregar fiado».</p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar deudas"
            className="w-full rounded-xl border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-900 pl-9 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-stone-200">
          <input type="checkbox" checked={showSettled} onChange={event => setShowSettled(event.target.checked)} />
          Mostrar deudas saldadas
        </label>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-8 text-center text-slate-600 dark:text-stone-300">
          {query.trim() ? `Nadie con deudas coincide con «${query.trim()}».` : 'No hay deudas pendientes.'}
        </div>
      ) : shown.map(group => (
        <DebtorCard key={group.key} group={group} settings={settings} onPay={can('cobrar') ? pay : null} />
      ))}
    </div>
  );
};
