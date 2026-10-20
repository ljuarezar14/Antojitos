import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { orderNumberText } from '../domain/orders';
import { debtBalance } from '../domain/finance';

const methods = [
  ['efectivo', 'Efectivo'], ['yape', 'Yape'], ['plin', 'Plin'],
  ['tarjeta', 'Tarjeta'], ['otro', 'Otro']
];

const timeOf = value => value ? new Date(value).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';

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
    </div>
  );
};

export const DebtsView = () => {
  const { orders, recordDebtPayment, dbError } = useApp();
  const [showSettled, setShowSettled] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [error, setError] = useState('');
  const debts = orders.filter(order => order.debt && (showSettled || debtBalance(order) > 0));
  const outstanding = orders.reduce((sum, order) => sum + debtBalance(order), 0);

  const submitPayment = event => {
    event.preventDefault();
    setError('');
    if (dbError) {
      setError('Hay un error de guardado. Resuélvelo antes de registrar un abono.');
      return;
    }
    if (!recordDebtPayment(selectedId, amount, method)) {
      setError('Ingresa un importe mayor a cero y no mayor que el saldo.');
      return;
    }
    setSelectedId(null);
    setAmount('');
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 space-y-4">
      <div className="rounded-2xl bg-stone-900 border border-amber-500/30 p-5 text-white">
        <h2 className="text-xl font-black text-amber-400">Deudas de clientes</h2>
        <p className="text-sm mt-2">Saldo total por cobrar: <strong>S/ {outstanding.toFixed(2)}</strong></p>
        <p className="text-xs text-stone-300 mt-1">Para fiar un pedido, registra el nombre del cliente, marca el pedido como listo y elige «Entregar fiado».</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-stone-200">
        <input type="checkbox" checked={showSettled} onChange={event => setShowSettled(event.target.checked)} />
        Mostrar deudas saldadas
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-900 p-3 text-sm text-white">{error}</p>}
      {debts.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-8 text-center text-slate-600 dark:text-stone-300">
          No hay deudas pendientes.
        </div>
      ) : debts.map(order => {
        const balance = debtBalance(order);
        const paid = (order.debtPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return (
          <div key={order.id} className="rounded-2xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white">{order.customerName} · Pedido {orderNumberText(order)}</h3>
                <p className="text-xs text-slate-500 dark:text-stone-400">{order.date}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>
              </div>
              <span className={`font-black ${balance ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {balance ? `Debe S/ ${balance.toFixed(2)}` : 'Saldada'}
              </span>
            </div>
            <OrderDetail order={order} />
            <p className="text-sm text-slate-700 dark:text-stone-200">Total: S/ {Number(order.total).toFixed(2)} · Abonado: S/ {paid.toFixed(2)}</p>
            {(order.debtPayments || []).length > 0 && (
              <div className="text-xs text-slate-600 dark:text-stone-300 space-y-1">
                <p className="font-black text-slate-700 dark:text-stone-200">Abonos</p>
                {order.debtPayments.map(payment => (
                  <p key={payment.id}>
                    {new Date(payment.paidAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })} · {payment.method} · S/ {Number(payment.amount).toFixed(2)}
                    {payment.by ? ` · recibió ${payment.by}` : ''}
                  </p>
                ))}
              </div>
            )}
            {balance > 0 && (selectedId === order.id ? (
              <form onSubmit={submitPayment} className="flex flex-wrap gap-2 border-t border-slate-200 dark:border-stone-700 pt-3">
                <input type="number" min="0.01" max={balance} step="0.01" required value={amount}
                  onChange={event => setAmount(event.target.value)} placeholder="Importe S/"
                  className="w-32 rounded-xl border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-slate-900 dark:text-white" />
                <select value={method} onChange={event => setMethod(event.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 py-2 text-sm text-slate-900 dark:text-white">
                  {methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Registrar abono</button>
                <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 dark:text-stone-300">Cancelar</button>
              </form>
            ) : (
              <button type="button" onClick={() => { setSelectedId(order.id); setAmount(balance.toFixed(2)); setError(''); }}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-stone-950">Registrar pago o abono</button>
            ))}
          </div>
        );
      })}
    </div>
  );
};
