import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CashClosingCard } from './CashClosingCard';
import { 
  DollarSign, 
  Coins, 
  Smartphone, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Share2, 
  Calendar, 
  CheckCircle, 
  FileText,
  Flame,
  Award,
  Download
} from 'lucide-react';

export const DailyCashRegisterView = () => {
  const { 
    filterDate, 
    setFilterDate, 
    todayDateStr,
    totalSales, 
    cashSales, 
    yapePlinSales, 
    cardOtherSales,
    totalExpenses, 
    netProfit, 
    filteredOrders, 
    filteredExpenses, 
    dishesRanking,
    dailyPayments,
    orders,
    addExpense,
    deleteExpense,
    settings,
    dbError,
    pendingChanges,
    dayClosing
  } = useApp();

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);
  const [reportError, setReportError] = useState('');
  const [exportingReport, setExportingReport] = useState(false);

  const expensePresets = [
    'Bolsas y descartables',
    'Hielo en bolsa',
    'Aceite 5L',
    'Carbón / Gas',
    'Pan hamburguesa',
    'Papas 1 saco'
  ];

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount) return;
    addExpense(expenseDesc, expenseAmount);
    setExpenseDesc('');
    setExpenseAmount('');
  };

  const attendedOrders = filteredOrders.filter(order => order.status === 'entregado');
  const averageTicket = dailyPayments.length > 0 ? (totalSales / dailyPayments.length) : 0;
  const newDebts = filteredOrders.filter(order => order.debt);
  const debtTotal = newDebts.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const dailyGoal = settings?.dailyGoal || 0;
  const initialCash = settings?.initialCash || 0;
  const goalProgress = dailyGoal > 0 ? Math.min(100, Math.round((totalSales / dailyGoal) * 100)) : 0;

  const formatFriendlyDate = (dateStr) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('es-PE', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const generateWhatsAppReport = () => {
    const bizName = settings?.businessName || 'ANTOJITOS CON MIRIAM';
    const lines = [
      `🍔 *CIERRE DE CAJA - ${bizName}* 🍔`,
      `📅 *Fecha:* ${formatFriendlyDate(filterDate)}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👥 *Pedidos entregados:* ${attendedOrders.length}`,
      `💰 *COBROS RECIBIDOS:* S/ ${totalSales.toFixed(2)}`,
      `🧾 *Pedidos fiados del día:* ${newDebts.length} (S/ ${debtTotal.toFixed(2)})`,
      ``,
      `💵 *Cobros en efectivo:* S/ ${cashSales.toFixed(2)}`,
      `📱 *Digital (Yape / Plin):* S/ ${yapePlinSales.toFixed(2)}`,
      cardOtherSales > 0 ? `💳 *Tarjeta / Otros:* S/ ${cardOtherSales.toFixed(2)}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    if (settings?.dailyGoal && settings.dailyGoal > 0) {
      lines.push(`🎯 *Meta del día:* S/ ${settings.dailyGoal.toFixed(2)} (${goalProgress}%)`);
      lines.push(``);
    }

    if (settings?.initialCash && settings.initialCash > 0) {
      lines.push(`💼 *Fondo inicial:* S/ ${settings.initialCash.toFixed(2)}`);
      lines.push(``);
    }

    lines.push(`📉 *GASTOS / COMPRAS DEL DÍA:* S/ ${totalExpenses.toFixed(2)}`);

    if (filteredExpenses.length > 0) {
      filteredExpenses.forEach(exp => {
        lines.push(`  • ${exp.description}: -S/ ${exp.amount.toFixed(2)}`);
      });
    } else {
      lines.push(`  • Sin gastos registrados`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`✨ *RESULTADO DEL DÍA (COBROS - GASTOS):* S/ ${netProfit.toFixed(2)} ✨`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (dayClosing) {
      const diff = dayClosing.difference;
      lines.push(`🔒 *Caja cerrada por ${dayClosing.closedBy || "—"}*`);
      lines.push(`  • Efectivo esperado: S/ ${dayClosing.expectedCash.toFixed(2)}`);
      lines.push(`  • Efectivo contado: S/ ${dayClosing.countedCash.toFixed(2)}`);
      lines.push(`  • ${diff === 0 ? "Cuadra exacto" : diff > 0 ? `Sobran S/ ${diff.toFixed(2)}` : `Faltan S/ ${(-diff).toFixed(2)}`}`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    if (dishesRanking.length > 0) {
      lines.push(`🏆 *Platos Más Vendidos:*`);
      dishesRanking.slice(0, 5).forEach((dish, idx) => {
        lines.push(`${idx + 1}. ${dish.name}: ${dish.count} und (S/ ${dish.total.toFixed(2)})`);
      });
      lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }

    lines.push(`_Reporte de ${bizName}_ 🍗`);
    return lines.filter(Boolean).join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppReport();
    navigator.clipboard.writeText(text);
    setShowCopiedAlert(true);
    setTimeout(() => setShowCopiedAlert(false), 3000);

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleCopyClipboard = () => {
    const text = generateWhatsAppReport();
    navigator.clipboard.writeText(text);
    setShowCopiedAlert(true);
    setTimeout(() => setShowCopiedAlert(false), 3000);
  };

  const handleDownloadReport = async () => {
    setReportError('');
    if (dbError) {
      setReportError('Hay un error de guardado. Resuélvelo antes de exportar el cierre.');
      return;
    }
    setExportingReport(true);
    try {
      if (pendingChanges) throw new Error('Hay cambios pendientes de guardar. Espera un momento y vuelve a descargar.');
      const { buildDailyReport } = await import('../reports/dailyReport');
      const report = buildDailyReport({ orders, expenses: filteredExpenses, settings }, filterDate);
      report.save(`cierre-caja-${filterDate}.pdf`);
    } catch (error) {
      setReportError(error.message || 'No se pudo crear el PDF.');
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8 space-y-5">
      
      {/* Date & Header Controls */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black text-amber-500 uppercase tracking-wider block">
            Control de Caja y Ganancias
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-stone-100 capitalize">
            {formatFriendlyDate(filterDate)}
          </h2>
          <p className="text-xs text-slate-500 dark:text-stone-400 font-medium mt-1">
            {settings?.businessName || 'Antojitos con Miriam'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-xl text-sm font-bold text-slate-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {filterDate !== todayDateStr && (
            <button
              onClick={() => setFilterDate(todayDateStr)}
              className="px-3 py-2 bg-amber-500 text-stone-950 rounded-xl text-xs font-black hover:bg-amber-400 whitespace-nowrap"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Copied alert notification */}
      {showCopiedAlert && (
        <div className="bg-emerald-600 text-white p-3 rounded-2xl font-black text-sm text-center shadow-lg animate-in slide-in-from-top flex items-center justify-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>¡Resumen de caja copiado para WhatsApp!</span>
        </div>
      )}

      {/* 5 Main KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Sales in Gold Amber */}
        <div className="bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-stone-950 p-4 rounded-2xl shadow-md flex flex-col justify-between border border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">
              Cobros del Día
            </span>
            <DollarSign className="w-5 h-5 text-amber-950" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight">
              S/ {totalSales.toFixed(2)}
            </span>
          </div>
          {dailyGoal > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-amber-950 font-bold">
                <span>Meta: S/ {dailyGoal.toFixed(2)}</span>
                <span>{goalProgress}%</span>
              </div>
              <div className="w-full bg-amber-950/30 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${goalProgress}%` }} />
              </div>
            </div>
          )}
          <p className="text-[11px] text-amber-950 font-bold">
            {dailyPayments.length} pagos o abonos recibidos
          </p>
        </div>

        {/* Physical Cash */}
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-stone-400">
              Cobros en Efectivo
            </span>
            <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              S/ {cashSales.toFixed(2)}
            </span>
          </div>
          {initialCash > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-stone-500 font-medium">
              Fondo inicial: S/ {initialCash.toFixed(2)}
            </p>
          )}
          <p className="text-[11px] text-slate-400 dark:text-stone-500 font-medium">
            Recibido durante este día
          </p>
        </div>

        {/* Digital (Yape / Plin) */}
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-stone-400">
              Yape / Plin
            </span>
            <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              S/ {yapePlinSales.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-stone-500 font-medium">
            Pagos en tu cuenta móvil
          </p>
        </div>

        {/* Net Profit After Initial */}
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-stone-400">
              Fondo Inicial
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              S/ {initialCash.toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-stone-500 font-medium">
            Declarado en configuración
          </p>
        </div>

        {/* Customers / Ticket Promedio */}
        <div className="bg-white dark:bg-stone-900 border-2 border-amber-200/90 dark:border-stone-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-stone-400">
              Pedidos Entregados
            </span>
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 tracking-tight">
              {attendedOrders.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-stone-400 font-medium">
            Cobro promedio: <strong>S/ {averageTicket.toFixed(2)}</strong>
          </p>
        </div>

      </div>

      {newDebts.length > 0 && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm font-bold text-red-800 dark:text-red-300">
          {newDebts.length} pedido(s) fiado(s) en esta fecha por S/ {debtTotal.toFixed(2)}. Los abonos aparecerán como cobros el día en que se registren.
        </div>
      )}

      {/* Net Profit Banner - Golden / Matte Black style */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-amber-500/30">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Resultado del Día (Cobros - Gastos)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-amber-400">
              S/ {netProfit.toFixed(2)}
            </span>
            <span className="text-xs text-stone-300 font-bold">
              (S/ {totalSales.toFixed(2)} cobros - S/ {totalExpenses.toFixed(2)} gastos)
            </span>
          </div>
        </div>

        {/* WhatsApp & Export Actions */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownloadReport}
            disabled={exportingReport}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white text-stone-950 hover:bg-amber-100 disabled:opacity-60 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{exportingReport ? 'Generando PDF...' : 'Descargar cierre PDF'}</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Share2 className="w-4 h-4 text-stone-950" />
            <span>Enviar Cierre a WhatsApp 📲</span>
          </button>
          <button
            onClick={handleCopyClipboard}
            className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 font-bold text-xs flex items-center justify-center gap-1 transition-all"
            title="Copiar texto"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </div>

      {reportError && <div role="alert" className="rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-white">{reportError}</div>}

      <CashClosingCard />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT: Daily Expenses Form & List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-base text-slate-800 dark:text-stone-100">
                  Gastos del Día (Compras de Carretilla)
                </h3>
              </div>
              <span className="font-black text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-900">
                Total: -S/ {totalExpenses.toFixed(2)}
              </span>
            </div>

            {/* Quick Expense Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="text-[11px] font-bold text-slate-400 dark:text-stone-500 self-center">Atajos:</span>
              {expensePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setExpenseDesc(preset)}
                  className="text-[11px] bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-700 dark:text-stone-300 px-2 py-1 rounded-lg border border-slate-200 dark:border-stone-700 font-semibold"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleAddExpense} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Descripción (ej. Hielo, Bolsas, Aceite)..."
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-800 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="relative w-28 sm:w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-stone-500">
                  S/
                </span>
                <input
                  type="number"
                  step="0.5"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full pl-7 pr-2 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-800 dark:text-stone-100 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar</span>
              </button>
            </form>

            {/* Expenses List */}
            {filteredExpenses.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-stone-500 text-center py-4 bg-slate-50 dark:bg-stone-850 rounded-xl border border-dashed border-slate-200 dark:border-stone-800">
                No hay compras o gastos registrados para este día.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-2.5 bg-slate-50 dark:bg-stone-800 rounded-xl border border-slate-200/80 dark:border-stone-700 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-stone-100">{expense.description}</p>
                      <p className="text-[10px] text-slate-400 dark:text-stone-500">
                        {new Date(expense.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-red-600 dark:text-red-400">
                        -S/ {expense.amount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Top Selling Dishes Ranking (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-base text-slate-800 dark:text-stone-100">
                Platos Más Vendidos Hoy
              </h3>
            </div>

            {dishesRanking.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-stone-500 text-center py-8 bg-slate-50 dark:bg-stone-850 rounded-xl border border-dashed border-slate-200 dark:border-stone-800">
                Aún no hay platos entregados registrados para este día.
              </p>
            ) : (
              <div className="space-y-2.5">
                {dishesRanking.map((dish, index) => {
                  const maxCount = dishesRanking[0].count;
                  const percentage = Math.round((dish.count / maxCount) * 100);

                  return (
                    <div key={dish.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-stone-200">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            index === 0 
                              ? 'bg-amber-400 text-amber-950' 
                              : index === 1 
                                ? 'bg-slate-300 dark:bg-stone-700 text-slate-800 dark:text-stone-100' 
                                : index === 2 
                                  ? 'bg-amber-700 text-amber-100' 
                                  : 'bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-400'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="truncate">{dish.name}</span>
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-black whitespace-nowrap">
                          {dish.count} und • S/ {dish.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
