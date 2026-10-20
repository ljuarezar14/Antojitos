import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Unlock } from 'lucide-react';

const money = value => `S/ ${(Number(value) || 0).toFixed(2)}`;
const differenceText = difference => difference === 0 ? 'Cuadra exacto'
  : difference > 0 ? `Sobran ${money(difference)}` : `Faltan ${money(-difference)}`;
const differenceClass = difference => difference === 0 ? 'text-emerald-600 dark:text-emerald-400'
  : difference > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

// End of day: count the cash, compare it with what the register expects and keep the result.
export const CashClosingCard = () => {
  const {
    filterDate, todayDateStr, expectedCash, cashSales, totalSales, totalExpenses, settings,
    dayClosing, closeCashRegister, reopenCashRegister, currentUser, pendingChanges
  } = useApp();
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const initialCash = Number(settings?.initialCash) || 0;

  if (dayClosing) {
    // Orders or expenses edited after closing change the live totals, not the saved closing.
    const changedSince = Math.abs(dayClosing.totalSales - totalSales) >= 0.01 || Math.abs(dayClosing.totalExpenses - totalExpenses) >= 0.01;
    return (
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-emerald-300 dark:border-emerald-900 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-slate-800 dark:text-stone-100">Caja cerrada</h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-stone-400">
            por <strong>{dayClosing.closedBy || '—'}</strong> · {new Date(dayClosing.closedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800">
            <dt className="text-slate-500 dark:text-stone-400">Efectivo esperado</dt>
            <dd className="font-black text-sm text-slate-800 dark:text-stone-100">{money(dayClosing.expectedCash)}</dd>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800">
            <dt className="text-slate-500 dark:text-stone-400">Efectivo contado</dt>
            <dd className="font-black text-sm text-slate-800 dark:text-stone-100">{money(dayClosing.countedCash)}</dd>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800">
            <dt className="text-slate-500 dark:text-stone-400">Diferencia</dt>
            <dd className={`font-black text-sm ${differenceClass(dayClosing.difference)}`}>{differenceText(dayClosing.difference)}</dd>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800">
            <dt className="text-slate-500 dark:text-stone-400">Cobros del día</dt>
            <dd className="font-black text-sm text-slate-800 dark:text-stone-100">{money(dayClosing.totalSales)}</dd>
          </div>
        </dl>
        {dayClosing.notes && <p className="text-xs text-slate-600 dark:text-stone-300">Nota: {dayClosing.notes}</p>}
        {changedSince && (
          <p role="alert" className="text-xs font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-800">
            Después del cierre cambiaron los cobros o gastos de este día: ahora suman {money(totalSales)} en cobros y {money(totalExpenses)} en gastos.
            {currentUser?.role === 'admin' ? ' Revisa quién lo cambió en Admin › Historial.' : ''}
          </p>
        )}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => { if (confirm('¿Reabrir la caja de este día? El cierre guardado se borrará y se podrá cerrar de nuevo.')) reopenCashRegister(dayClosing.date); }}
            className="text-xs font-bold text-slate-500 dark:text-stone-400 hover:text-red-600 flex items-center gap-1.5"
          >
            <Unlock className="w-3.5 h-3.5" /> Reabrir caja
          </button>
        )}
      </div>
    );
  }

  const countedValue = Number(counted);
  const difference = counted === '' ? null : Math.round((countedValue - expectedCash) * 100) / 100;
  const handleClose = (e) => {
    e.preventDefault();
    setError('');
    if (counted === '' || !Number.isFinite(countedValue) || countedValue < 0) {
      setError('Escribe cuánto efectivo contaste.');
      return;
    }
    if (pendingChanges) {
      setError('Hay cambios pendientes de enviar. Espera a tener conexión para cerrar la caja.');
      return;
    }
    if (!confirm(`¿Cerrar la caja con ${money(countedValue)} contados? ${differenceText(difference)}.`)) return;
    if (closeCashRegister({ countedCash: countedValue, notes })) {
      setCounted('');
      setNotes('');
    }
  };

  return (
    <form onSubmit={handleClose} className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="w-5 h-5 text-amber-500" />
        <h3 className="font-black text-base text-slate-800 dark:text-stone-100">
          Cerrar caja {filterDate === todayDateStr ? 'de hoy' : 'de este día'}
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-stone-400">
        Efectivo esperado: <strong className="text-slate-800 dark:text-stone-100">{money(expectedCash)}</strong>
        {' '}(fondo inicial {money(initialCash)} + cobros en efectivo {money(cashSales)} − gastos {money(totalExpenses)})
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative sm:w-44">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">S/</span>
          <input
            type="number" step="0.1" min="0" inputMode="decimal" placeholder="Efectivo contado"
            aria-label="Efectivo contado"
            value={counted} onChange={(e) => setCounted(e.target.value)}
            className="w-full pl-7 pr-2 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-800 dark:text-stone-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <input
          type="text" placeholder="Nota (opcional)" aria-label="Nota del cierre" maxLength={200}
          value={notes} onChange={(e) => setNotes(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-800 dark:text-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black">
          Cerrar caja
        </button>
      </div>
      {difference !== null && Number.isFinite(difference) && (
        <p className={`text-sm font-black ${differenceClass(difference)}`}>{differenceText(difference)}</p>
      )}
      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
    </form>
  );
};
