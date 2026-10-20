import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';

const ENTITY_LABELS = {
  orders: 'Pedido', expenses: 'Gasto', customers: 'Casero', menu: 'Carta', cremas: 'Crema', categories: 'Categoría',
  users: 'Usuario', config: 'Ajustes', closings: 'Cierre', files: 'Imagen', session: 'Ingreso', backup: 'Respaldo'
};
const ACTION_CLASSES = {
  eliminar: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  restaurar: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  crear: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
};

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Admin › Historial: who did what on a given day, as recorded by the server.
export const AuditLogPanel = () => {
  const [date, setDate] = useState(() => localDate());
  const [filter, setFilter] = useState('dinero');
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setEntries(null);
    setError('');
    const [y, m, d] = date.split('-').map(Number);
    const from = new Date(y, m - 1, d).toISOString();
    const to = new Date(y, m - 1, d + 1).toISOString();
    fetch(`/api/audit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error || 'No se pudo leer el historial');
        if (active) setEntries(body.entries);
      })
      .catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [date]);

  // "Dinero" leaves out logins and menu tweaks to focus on what moves the cash register.
  const moneyEntities = new Set(['orders', 'expenses', 'closings', 'backup']);
  const shown = (entries || []).filter(entry => filter === 'todo' || moneyEntities.has(entry.entity) ||
    entry.action === 'eliminar');

  return (
    <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
      <div className="flex items-start gap-2">
        <History className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-black text-base text-slate-900 dark:text-white">Historial de cambios</h2>
          <p className="text-[11px] text-slate-400 dark:text-stone-500">Quién tomó, cobró, canceló o eliminó cada cosa. Se guarda 6 meses.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Día del historial"
          className="px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl text-sm font-bold text-slate-700 dark:text-stone-200"
        />
        <div className="flex rounded-xl bg-slate-100 dark:bg-stone-800 p-1 text-xs font-bold">
          {[['dinero', 'Pedidos y caja'], ['todo', 'Todo']].map(([id, label]) => (
            <button
              key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id}
              className={`px-3 py-1.5 rounded-lg ${filter === id ? 'bg-amber-500 text-stone-950' : 'text-slate-600 dark:text-stone-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
      {!error && !entries && <p className="text-xs text-slate-500 dark:text-stone-400">Cargando historial…</p>}
      {entries && shown.length === 0 && <p className="text-xs text-slate-500 dark:text-stone-400">No hay cambios registrados ese día.</p>}
      <ul className="divide-y divide-slate-100 dark:divide-stone-800">
        {shown.map(entry => (
          <li key={entry.id} className="py-2 text-xs flex gap-3">
            <span className="w-12 shrink-0 font-mono text-slate-400 dark:text-stone-500">
              {new Date(entry.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-black text-slate-800 dark:text-stone-100">{entry.userName || 'Sistema'}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${ACTION_CLASSES[entry.action] || 'bg-slate-100 text-slate-600 dark:bg-stone-800 dark:text-stone-300'}`}>
                  {entry.action}
                </span>
                <span className="text-[10px] font-bold text-slate-400 dark:text-stone-500">{ENTITY_LABELS[entry.entity] || entry.entity}</span>
              </div>
              <p className="text-slate-600 dark:text-stone-300 break-words">{entry.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
