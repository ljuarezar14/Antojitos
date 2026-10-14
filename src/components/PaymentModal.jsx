import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import confetti from 'canvas-confetti';
import { 
  X, 
  Check, 
  DollarSign, 
  Smartphone, 
  CreditCard, 
  Coins, 
  ArrowRight,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

export const PaymentModal = ({ order, onClose }) => {
  const { payOrder, settings } = useApp();

  const paymentMethods = settings?.paymentMethods || { efectivo: true, yape: true, plin: true, tarjeta: true };
  const activeMethods = Object.entries(paymentMethods).filter(([, v]) => v).map(([k]) => k);
  const defaultMethod = activeMethods[0] || 'efectivo';

  const [paymentMethod, setPaymentMethod] = useState(defaultMethod);
  const [cashGiven, setCashGiven] = useState('');

  if (!order) return null;

  const total = order.total || 0;
  const cashNum = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashNum - total);
  const isCashInsufficient = paymentMethod === 'efectivo' && cashNum > 0 && cashNum < total;

  const handleQuickCash = (amount) => {
    setCashGiven(amount.toString());
  };

  const handleConfirmPayment = () => {
    const finalAmountPaid = paymentMethod === 'efectivo' ? (cashNum || total) : total;
    const finalChange = paymentMethod === 'efectivo' ? change : 0;

    payOrder(order.id, {
      method: paymentMethod,
      amountPaid: finalAmountPaid,
      change: finalChange
    });

    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // Confetti optional
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-stone-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-stone-800 overflow-hidden flex flex-col">
        
        {/* Top Header */}
        <div className="bg-stone-900 text-white p-4 border-b border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
              Cobrar Pedido #{order.orderNumber}
            </span>
            <h3 className="font-black text-lg text-white">
              {order.customerName || 'Cliente al paso'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          
          {/* Big Amount Card */}
          <div className="bg-amber-50/90 dark:bg-amber-950/40 rounded-2xl p-4 text-center border border-amber-200 dark:border-amber-500/40">
            <span className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
              Monto a Cobrar
            </span>
            <span className="text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              S/ {total.toFixed(2)}
            </span>
            <div className="mt-1 text-xs text-slate-500 dark:text-stone-400 font-medium">
              {order.items?.length} {order.items?.length === 1 ? 'producto' : 'productos'} • {order.orderType === 'llevar' ? 'Para llevar' : 'En mesa'}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-stone-400 uppercase tracking-wider block">
              Selecciona Método de Pago:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {activeMethods.map((method) => {
                const Icon = method === 'efectivo' ? Coins : method === 'tarjeta' ? CreditCard : Smartphone;
                const accentColor = method === 'efectivo' ? 'emerald' : method === 'yape' ? 'purple' : method === 'plin' ? 'cyan' : 'stone';
                const active = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-3 px-2 rounded-2xl border font-black text-xs flex flex-col items-center gap-1.5 transition-all ${
                      active
                        ? `bg-${accentColor}-600 text-white border-${accentColor}-500 shadow-md shadow-${accentColor}-600/20 scale-102`
                        : 'bg-slate-50 dark:bg-stone-800 text-slate-700 dark:text-stone-300 border-slate-200 dark:border-stone-700 hover:bg-slate-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{method.charAt(0).toUpperCase() + method.slice(1)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Calculator if Efectivo is chosen */}
          {paymentMethod === 'efectivo' && (
            <div className="bg-slate-50 dark:bg-stone-800 p-3.5 rounded-2xl border border-slate-200 dark:border-stone-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-stone-300">¿Con cuánto paga el cliente?</span>
                <span className="text-[11px] text-slate-400 dark:text-stone-500">Atajos rápidos:</span>
              </div>

              {/* Quick bill buttons */}
              <div className="grid grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCash(total)}
                  className="py-1.5 px-1 bg-white dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-stone-750 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-black"
                >
                  Exacto
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(10)}
                  className="py-1.5 px-1 bg-white dark:bg-stone-900 hover:bg-slate-100 dark:hover:bg-stone-750 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700 rounded-lg text-xs font-bold"
                >
                  S/ 10
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(20)}
                  className="py-1.5 px-1 bg-white dark:bg-stone-900 hover:bg-slate-100 dark:hover:bg-stone-750 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700 rounded-lg text-xs font-bold"
                >
                  S/ 20
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(50)}
                  className="py-1.5 px-1 bg-white dark:bg-stone-900 hover:bg-slate-100 dark:hover:bg-stone-750 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700 rounded-lg text-xs font-bold"
                >
                  S/ 50
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickCash(100)}
                  className="py-1.5 px-1 bg-white dark:bg-stone-900 hover:bg-slate-100 dark:hover:bg-stone-750 text-slate-700 dark:text-stone-300 border border-slate-200 dark:border-stone-700 rounded-lg text-xs font-bold"
                >
                  S/ 100
                </button>
              </div>

              {/* Manual input */}
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 dark:text-stone-500 text-sm">
                  S/
                </span>
                <input
                  type="number"
                  step="0.5"
                  placeholder={total.toString()}
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-stone-900 border border-slate-300 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                />
              </div>

              {/* Change Highlight */}
              {cashNum >= total && (
                <div className="bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-between text-emerald-900 dark:text-emerald-300">
                  <span className="font-black text-sm">💵 VUELTO A ENTREGAR:</span>
                  <span className="font-black text-2xl tracking-tight text-emerald-800 dark:text-emerald-300">
                    S/ {change.toFixed(2)}
                  </span>
                </div>
              )}

              {isCashInsufficient && (
                <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 p-2.5 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-400 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Faltan S/ {(total - cashNum).toFixed(2)} para completar el pago.</span>
                </div>
              )}
            </div>
          )}

          {/* Digital Payment Info Notice */}
          {(paymentMethod === 'yape' || paymentMethod === 'plin') && (
            <div className={`p-3.5 rounded-2xl border text-xs font-medium space-y-1 ${
              paymentMethod === 'yape'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300'
                : 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-300'
            }`}>
              <p className="font-black flex items-center gap-1.5 text-sm">
                📱 Cobro con {paymentMethod.toUpperCase()}
              </p>
              <p>
                Verifica en la notificación de tu celular que ingresó el depósito de <strong>S/ {total.toFixed(2)}</strong>.
              </p>
            </div>
          )}

          {/* Yape QR Display */}
          {paymentMethod === 'yape' && settings?.yapeQr && (
            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 space-y-2">
              <div className="text-center">
                <p className="font-black text-sm text-purple-900 dark:text-purple-300 flex items-center justify-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Escanea con Yape</span>
                </p>
                {settings?.yapeName && (
                  <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5 font-medium">
                    A nombre de: <strong>{settings.yapeName}</strong>
                  </p>
                )}
                {settings?.yapeNumber && (
                  <p className="text-xs text-purple-700 dark:text-purple-400 font-mono">
                    {settings.yapeNumber}
                  </p>
                )}
              </div>
              <div className="flex justify-center">
                <img 
                  src={settings.yapeQr} 
                  alt="QR de Yape" 
                  className="max-w-[200px] w-full h-auto rounded-xl bg-white p-2 border border-purple-200 dark:border-purple-800 shadow-sm"
                />
              </div>
              <p className="text-[11px] text-center text-purple-700 dark:text-purple-400 font-medium">
                Muestra este QR al cliente para escanear
              </p>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-stone-850 border-t border-slate-200 dark:border-stone-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 px-3 rounded-2xl bg-slate-200 dark:bg-stone-800 hover:bg-slate-300 dark:hover:bg-stone-750 text-slate-700 dark:text-stone-300 font-bold text-sm transition-colors"
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={handleConfirmPayment}
            className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Confirmar Pago Recibido</span>
          </button>
        </div>

      </div>
    </div>
  );
};
