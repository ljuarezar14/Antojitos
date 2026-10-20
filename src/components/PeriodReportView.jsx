import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { buildPeriodReport, periodRange, previousRange, shiftDays } from '../domain/periodReport';
import { ChevronLeft, ChevronRight, Share2, TrendingUp, TrendingDown, Award, CalendarDays } from 'lucide-react';

const money = value => `S/ ${(Number(value) || 0).toFixed(2)}`;
const METHOD_LABELS = { efectivo: 'Efectivo', yape: 'Yape', plin: 'Plin', tarjeta: 'Tarjeta', otro: 'Otro' };
const parse = date => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const rangeLabel = (kind, { from, to }) => kind === 'mes'
  ? parse(from).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
  : `${parse(from).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} – ${parse(to).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}`;
const dayLabel = date => parse(date).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });

// Server orders for the range, with this device's own (possibly unsent) versions on top.
const mergeOrders = (remote, local) => {
  const byId = new Map(remote.map(order => [order.id, order]));
  for (const order of local) byId.set(order.id, order);
  return [...byId.values()];
};

const Change = ({ now, before }) => {
  if (!before) return <span className="text-[11px] text-slate-400 dark:text-stone-500">sin datos del periodo anterior</span>;
  const percent = Math.round(((now - before) / before) * 100);
  const up = percent >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`text-[11px] font-black flex items-center gap-1 ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      <Icon className="w-3.5 h-3.5" /> {up ? '+' : ''}{percent}% vs. periodo anterior ({money(before)})
    </span>
  );
};

const Bars = ({ rows, value, label, detail }) => {
  const max = Math.max(...rows.map(value), 0);
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="space-y-0.5">
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-stone-200">
            <span className="truncate capitalize">{label(row)}</span>
            <span className="whitespace-nowrap text-amber-600 dark:text-amber-400">{detail(row)}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${max ? Math.round((value(row) / max) * 100) : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const Card = ({ title, icon: Icon, children }) => (
  <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-amber-500" />}
      <h3 className="font-black text-base text-slate-800 dark:text-stone-100">{title}</h3>
    </div>
    {children}
  </div>
);

export const PeriodReportView = ({ kind }) => {
  const { orders, expenses, todayDateStr, settings } = useApp();
  const [anchor, setAnchor] = useState(todayDateStr);
  const [remote, setRemote] = useState(null);
  const [offline, setOffline] = useState(false);
  const range = periodRange(kind, anchor);
  const previous = previousRange(range, kind);

  useEffect(() => {
    let active = true;
    setRemote(null);
    setOffline(false);
    fetch(`/api/orders?rangeFrom=${previous.from}&rangeTo=${range.to}`)
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error);
        if (active) setRemote(body.orders);
      })
      .catch(() => { if (active) { setOffline(true); setRemote([]); } });
    return () => { active = false; };
  }, [kind, range.from]);

  if (!remote) return <p className="text-center text-sm font-bold text-amber-500 py-10">Calculando reporte…</p>;

  const all = mergeOrders(remote, orders);
  const report = buildPeriodReport({ orders: all, expenses }, range.from, range.to);
  const before = buildPeriodReport({ orders: all, expenses }, previous.from, previous.to);
  const isCurrent = range.to >= todayDateStr;
  const salesDays = kind === 'mes' ? report.days.filter(day => day.sales > 0) : report.days;
  const move = direction => setAnchor(direction < 0 ? shiftDays(range.from, -1) : shiftDays(range.to, 1));

  const shareText = () => [
    `📊 *Reporte ${kind === 'mes' ? 'del mes' : 'de la semana'} - ${settings?.businessName || 'Antojitos con Miriam'}*`,
    `📅 ${rangeLabel(kind, range)}`,
    `━━━━━━━━━━━━━━━━━━`,
    `💰 *Cobros:* ${money(report.sales)}${before.sales ? ` (${report.sales >= before.sales ? '+' : ''}${Math.round(((report.sales - before.sales) / before.sales) * 100)}%)` : ''}`,
    ...report.byMethod.map(entry => `   • ${METHOD_LABELS[entry.method]}: ${money(entry.total)}`),
    `📉 *Gastos:* ${money(report.expenses)}`,
    `✨ *Ganancia:* ${money(report.profit)}`,
    `🧾 *Pedidos:* ${report.orders} · ticket promedio ${money(report.averageTicket)}`,
    report.bestDay ? `🏆 *Mejor día:* ${dayLabel(report.bestDay.date)} (${money(report.bestDay.sales)})` : null,
    report.dishes.length ? `🍔 *Más vendidos:* ${report.dishes.slice(0, 3).map(dish => `${dish.name} (${dish.count})`).join(', ')}` : null,
    `🤝 *Fiado:* ${money(report.newDebts.total)} · *Recuperado:* ${money(report.recovered)}`
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border-2 border-amber-200/90 dark:border-stone-800 flex items-center justify-between gap-2">
        <button type="button" onClick={() => move(-1)} aria-label="Periodo anterior" className="p-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-200">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-500">{kind === 'mes' ? 'Mes' : 'Semana'}{isCurrent ? ' en curso' : ''}</p>
          <p className="font-black text-slate-800 dark:text-stone-100 capitalize">{rangeLabel(kind, range)}</p>
        </div>
        <button type="button" onClick={() => move(1)} disabled={isCurrent} aria-label="Periodo siguiente" className="p-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-200 disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {offline && (
        <p role="status" className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/40">
          Sin conexión: el reporte usa solo los pedidos guardados en este celular (últimos 60 días).
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="col-span-2 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-stone-950 p-4 rounded-2xl space-y-1">
          <p className="text-xs font-black uppercase tracking-wider text-amber-950">Cobros</p>
          <p className="text-3xl font-black">{money(report.sales)}</p>
          <div className="[&_span]:!text-amber-950"><Change now={report.sales} before={before.sales} /></div>
        </div>
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-stone-400">Gastos</p>
          <p className="text-xl font-black text-red-600 dark:text-red-400">{money(report.expenses)}</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-stone-400">Ganancia</p>
          <p className={`text-xl font-black ${report.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{money(report.profit)}</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-stone-400">Pedidos</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-400">{report.orders}</p>
          <p className="text-[11px] text-slate-500 dark:text-stone-400">{report.cancelled} cancelados</p>
        </div>
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl">
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-stone-400">Ticket promedio</p>
          <p className="text-xl font-black text-amber-700 dark:text-amber-400">{money(report.averageTicket)}</p>
          <p className="text-[11px] text-slate-500 dark:text-stone-400">{report.openDays} días con ventas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Cobros por día" icon={CalendarDays}>
          {salesDays.length === 0 ? <p className="text-xs text-slate-500 dark:text-stone-400">Sin cobros en este periodo.</p> : (
            <Bars rows={salesDays} value={day => day.sales} label={day => dayLabel(day.date)}
              detail={day => `${money(day.sales)}${day.expenses ? ` · gastos ${money(day.expenses)}` : ''}`} />
          )}
          {report.bestDay && (
            <p className="text-xs font-bold text-slate-600 dark:text-stone-300">🏆 Mejor día: <span className="capitalize">{dayLabel(report.bestDay.date)}</span> con {money(report.bestDay.sales)}</p>
          )}
        </Card>

        <Card title="Platos más vendidos" icon={Award}>
          {report.dishes.length === 0 ? <p className="text-xs text-slate-500 dark:text-stone-400">Sin ventas en este periodo.</p> : (
            <Bars rows={report.dishes.slice(0, 10)} value={dish => dish.count} label={dish => dish.name}
              detail={dish => `${dish.count} und · ${money(dish.total)}`} />
          )}
        </Card>

        <Card title="Cómo pagaron">
          {report.byMethod.length === 0 ? <p className="text-xs text-slate-500 dark:text-stone-400">Sin cobros.</p> : (
            <Bars rows={report.byMethod} value={entry => entry.total} label={entry => METHOD_LABELS[entry.method]}
              detail={entry => `${money(entry.total)} · ${Math.round((entry.total / report.sales) * 100)}%`} />
          )}
        </Card>

        <Card title="Días de la semana que más venden">
          {report.byWeekday.length === 0 ? <p className="text-xs text-slate-500 dark:text-stone-400">Sin cobros.</p> : (
            <Bars rows={report.byWeekday} value={entry => entry.sales} label={entry => entry.weekday}
              detail={entry => money(entry.sales)} />
          )}
        </Card>

        <Card title="Fiados y cobro de deudas">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800">
              <p className="text-slate-500 dark:text-stone-400">Se fió</p>
              <p className="font-black text-sm text-red-600 dark:text-red-400">{money(report.newDebts.total)}</p>
              <p className="text-slate-500 dark:text-stone-400">{report.newDebts.count} {report.newDebts.count === 1 ? "pedido" : "pedidos"}</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-stone-800">
              <p className="text-slate-500 dark:text-stone-400">Se recuperó</p>
              <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">{money(report.recovered)}</p>
              <p className="text-slate-500 dark:text-stone-400">en abonos</p>
            </div>
          </div>
        </Card>
      </div>

      <button
        type="button"
        onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText())}`, '_blank')}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 font-black text-sm flex items-center justify-center gap-1.5"
      >
        <Share2 className="w-4 h-4" /> Enviar reporte por WhatsApp
      </button>
    </div>
  );
};

// Caja tab: the day's cash register, or the week/month report.
export const CashAndReportsView = ({ children }) => {
  const [mode, setMode] = useState('dia');
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 pb-24 md:pb-8 space-y-4">
      <div className="flex rounded-2xl bg-slate-200/70 dark:bg-stone-900 p-1 text-sm font-black border border-amber-200/60 dark:border-stone-800">
        {[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)} aria-pressed={mode === id}
            className={`flex-1 py-2 rounded-xl transition-colors ${mode === id ? 'bg-amber-500 text-stone-950 shadow-sm' : 'text-slate-600 dark:text-stone-300'}`}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'dia' ? <div className="-mx-3 sm:-mx-4 -mt-4">{children}</div> : <PeriodReportView key={mode} kind={mode} />}
    </div>
  );
};
