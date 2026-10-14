import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Receipt, 
  Trash2, 
  Utensils, 
  ShoppingBag,
  Share2,
  ChevronRight,
  Flame,
  Check
} from 'lucide-react';

export const OrdersListView = ({ onOpenPayment, onOpenReceipt }) => {
  const { orders, updateOrderStatus, cancelOrder, filterDate, todayDateStr } = useApp();

  const [statusFilter, setStatusFilter] = useState('activos'); // 'activos' | 'preparando' | 'listo' | 'entregado' | 'todos'

  const dayOrders = orders.filter(o => o.date === filterDate);

  const filteredOrders = dayOrders.filter(order => {
    if (statusFilter === 'activos') {
      return order.status === 'preparando' || order.status === 'listo';
    }
    if (statusFilter === 'todos') return true;
    return order.status === statusFilter;
  });

  const getElapsedMinutes = (createdAt) => {
    try {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
      if (diff < 1) return 'Ahora mismo';
      if (diff === 1) return 'Hace 1 min';
      return `Hace ${diff} min`;
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'preparando':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/50 animate-pulse">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500" /> Preparando
          </span>
        );
      case 'listo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/50">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" /> ¡Listo para servir!
          </span>
        );
      case 'entregado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-stone-400" /> Entregado
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            Cancelado
          </span>
        );
      default:
        return null;
    }
  };

  const countActive = dayOrders.filter(o => o.status === 'preparando' || o.status === 'listo').length;
  const countPreparing = dayOrders.filter(o => o.status === 'preparando').length;
  const countReady = dayOrders.filter(o => o.status === 'listo').length;
  const countDelivered = dayOrders.filter(o => o.status === 'entregado').length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8 space-y-4">
      
      {/* Top Filter Tabs - Warm Amber borders in Light Mode */}
      <div className="bg-white dark:bg-stone-900 p-2.5 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setStatusFilter('activos')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'activos'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
              : 'text-stone-700 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-800'
          }`}
        >
          <span>🔥 Activos ({countActive})</span>
        </button>

        <button
          onClick={() => setStatusFilter('preparando')}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'preparando'
              ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-black'
              : 'text-stone-700 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-800'
          }`}
        >
          <span>En Freidora ({countPreparing})</span>
        </button>

        <button
          onClick={() => setStatusFilter('listo')}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'listo'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black'
              : 'text-stone-700 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-stone-800'
          }`}
        >
          <span>Listos ({countReady})</span>
        </button>

        <button
          onClick={() => setStatusFilter('entregado')}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'entregado'
              ? 'bg-stone-900 text-white shadow-md font-black'
              : 'text-stone-700 dark:text-stone-400 hover:bg-slate-100 dark:hover:bg-stone-800'
          }`}
        >
          <span>Entregados ({countDelivered})</span>
        </button>

        <button
          onClick={() => setStatusFilter('todos')}
          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            statusFilter === 'todos'
              ? 'bg-amber-100 dark:bg-stone-750 text-amber-950 dark:text-stone-200 font-black'
              : 'text-stone-500 dark:text-stone-500 hover:bg-amber-50 dark:hover:bg-stone-800'
          }`}
        >
          <span>Todos ({dayOrders.length})</span>
        </button>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border-2 border-dashed border-amber-200 dark:border-stone-800 space-y-3">
          <div className="w-16 h-16 bg-amber-100/70 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner border border-amber-400/30">
            🍟
          </div>
          <h3 className="font-black text-slate-800 dark:text-stone-100 text-lg">No hay pedidos en este estado</h3>
          <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm max-w-md mx-auto font-medium">
            {statusFilter === 'activos' 
              ? '¡Excelente trabajo! No tienes pedidos pendientes en cola ahora mismo.'
              : 'No se encontraron pedidos con este filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isPreparing = order.status === 'preparando';
            const isReady = order.status === 'listo';
            const isDelivered = order.status === 'entregado';
            const isPaid = !!order.payment;
            const hasPerItemCremas = (order.items || []).some(i => i.cremas && i.cremas.length > 0);

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-stone-900 rounded-2xl shadow-sm border-2 transition-all flex flex-col justify-between overflow-hidden ${
                  isPreparing 
                    ? 'border-amber-400 dark:border-amber-500/70 shadow-md ring-2 ring-amber-400/20' 
                    : isReady
                      ? 'border-emerald-500 dark:border-emerald-500/70 shadow-md ring-2 ring-emerald-500/30'
                      : 'border-amber-200/80 dark:border-stone-800 shadow-sm'
                }`}
              >
                {/* Order Top Bar */}
                <div className={`p-3.5 flex items-center justify-between border-b ${
                  isPreparing 
                    ? 'bg-amber-100/70 dark:bg-amber-950/20 border-amber-300 dark:border-stone-800' 
                    : isReady 
                      ? 'bg-emerald-100/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-stone-800' 
                      : 'bg-amber-50/50 dark:bg-stone-850 border-amber-200/70 dark:border-stone-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg bg-white dark:bg-stone-800 border border-slate-300 dark:border-stone-700 text-slate-900 dark:text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-xs">
                      #{order.orderNumber}
                    </span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                        {order.customerName || 'Cliente'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-stone-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-stone-500" />
                        {getElapsedMinutes(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(order.status)}
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      order.orderType === 'llevar'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-orange-100 dark:bg-stone-800 text-orange-800 dark:text-amber-300'
                    }`}>
                      {order.orderType === 'llevar' ? '🥡 Para Llevar' : '🍽️ En Mesa'}
                    </span>
                  </div>
                </div>

                {/* Items & Cremas Body */}
                <div className="p-4 space-y-3 flex-1">
                  
                  {/* Items list */}
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-xs sm:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-800 dark:text-stone-200 font-semibold flex items-center gap-1.5">
                            <span className="font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-stone-800 px-1.5 py-0.2 rounded border border-amber-200 dark:border-stone-700">
                              {item.quantity}x
                            </span>
                            <span>{item.name}</span>
                          </span>
                          <span className="font-bold text-slate-600 dark:text-stone-400">
                            S/ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        {item.cremas && item.cremas.length > 0 && (
                          <div className="ml-7 mt-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                            🌶️ {item.cremas.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Cremas Tag (fallback for pedidos antiguos sin cremas por plato) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-stone-800">
                    {!hasPerItemCremas && order.cremas && order.cremas.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-stone-400">Cremas:</span>
                        {order.cremas.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 px-2 py-0.5 rounded-md font-medium border border-slate-200 dark:border-stone-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {order.specialInstructions && (
                      <div className="mt-1.5 text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-1 rounded-lg border border-amber-200/80 dark:border-amber-500/30 font-medium">
                        ⚠️ <strong>Nota:</strong> {order.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="pt-2 border-t border-slate-100 dark:border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-stone-400 font-medium">Total:</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      S/ {order.total.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    {isPaid ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Pagado con <strong className="uppercase">{order.payment.method}</strong>
                        </span>
                        {order.payment.change > 0 && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            (Vuelto S/ {order.payment.change.toFixed(2)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center justify-between">
                        <span>⏳ Pago pendiente</span>
                        <span className="font-bold">S/ {order.total.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Card Action Footer */}
                <div className="p-3 bg-slate-50/80 dark:bg-stone-850 border-t border-slate-100 dark:border-stone-800 space-y-2">
                  
                  {isPreparing && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => updateOrderStatus(order.id, 'listo')}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1 shadow-sm active:scale-98 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>¡Ya está Listo! 🛎️</span>
                      </button>

                      {!isPaid ? (
                        <button
                          onClick={() => onOpenPayment(order)}
                          className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center justify-center gap-1 shadow-sm active:scale-98 transition-all"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Cobrar S/ {order.total.toFixed(2)}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'entregado')}
                          className="py-2.5 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-white font-black text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <span>Entregar ✅</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isReady && (
                    <div className="grid grid-cols-2 gap-2">
                      {!isPaid ? (
                        <button
                          onClick={() => onOpenPayment(order)}
                          className="col-span-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 transition-all animate-bounce"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Cobrar y Entregar (S/ {order.total.toFixed(2)})</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'entregado')}
                          className="col-span-2 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-black text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Marcar Entregado</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-stone-400">
                    <button
                      onClick={() => onOpenReceipt(order)}
                      className="hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 font-bold transition-colors"
                      title="Ver o compartir ticket"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Ver Ticket</span>
                    </button>

                    {!isDelivered && (
                      <button
                        onClick={() => {
                          if (confirm('¿Deseas cancelar este pedido?')) {
                            cancelOrder(order.id);
                          }
                        }}
                        className="hover:text-red-500 flex items-center gap-1 transition-colors text-[11px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Cancelar</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
