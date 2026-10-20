import React from 'react';
import { useApp } from '../context/AppContext';
import { orderNumberText } from '../domain/orders';

export const OpenAccountsView = ({ onOpenPayment }) => {
  const { orders, setAccountOrderId, setActiveTab, updateOrderStatus } = useApp();
  const accounts = orders.filter(order => order.openAccount && !order.payment && !order.debt && order.status !== 'cancelado');
  const total = accounts.reduce((sum, order) => sum + Number(order.total || 0), 0);

  return <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 space-y-4">
    <div className="rounded-2xl bg-stone-900 border border-amber-500/30 p-5 text-white">
      <h2 className="text-xl font-black text-amber-400">Cuentas abiertas</h2>
      <p className="mt-2 text-sm">{accounts.length} cuenta(s) · S/ {total.toFixed(2)} por cobrar</p>
      <p className="mt-1 text-xs text-stone-300">Agrega consumos a la misma cuenta y cobra todo cuando el cliente se retire. Las cuentas siguen aquí aunque cambie la fecha.</p>
    </div>
    {accounts.length === 0 ? <div className="rounded-2xl bg-white dark:bg-stone-900 p-8 text-center text-slate-600 dark:text-stone-300">
      No hay cuentas abiertas. En Tomar Pedido, escribe el nombre del cliente y elige «Abrir cuenta».
    </div> : accounts.map(order => <div key={order.id} className="rounded-2xl border border-amber-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white">{order.customerName} · Cuenta {orderNumberText(order)}</h3>
          <p className="text-xs text-slate-500 dark:text-stone-400">Abierta el {order.date}{order.customerPhone ? ` · ${order.customerPhone}` : ''} · {order.status === 'listo' ? 'Listo' : order.status === 'recibido' ? 'Recibido' : 'En preparación'}</p>
        </div>
        <span className="font-black text-lg text-amber-700 dark:text-amber-400">S/ {Number(order.total).toFixed(2)}</span>
      </div>
      <div className="text-sm text-slate-700 dark:text-stone-200">{(order.items || []).map((item, index) => <span key={item.lineId || index} className="inline-block mr-3">{item.quantity || 1} × {item.name}</span>)}</div>
      <div className="flex flex-wrap gap-2 border-t border-slate-200 dark:border-stone-700 pt-3">
        <button type="button" onClick={() => { setAccountOrderId(order.id); setActiveTab('tomar-pedido'); }} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-stone-950">Agregar consumo</button>
        {onOpenPayment && <button type="button" onClick={() => onOpenPayment(order)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white">Cobrar cuenta completa</button>}
        {order.status === 'recibido' && <button type="button" onClick={() => updateOrderStatus(order.id, 'preparando')} className="rounded-xl border border-stone-300 dark:border-stone-700 px-4 py-2 text-sm font-bold text-slate-700 dark:text-stone-200">Iniciar preparación</button>}
        {order.status === 'preparando' && <button type="button" onClick={() => updateOrderStatus(order.id, 'listo')} className="rounded-xl border border-stone-300 dark:border-stone-700 px-4 py-2 text-sm font-bold text-slate-700 dark:text-stone-200">Marcar listo</button>}
      </div>
    </div>)}
  </div>;
};
