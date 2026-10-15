import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { debtBalance } from '../domain/finance';
import { 
  X, 
  Share2, 
  Printer, 
  CheckCircle, 
  Copy, 
  Flame 
} from 'lucide-react';

export const ReceiptModal = ({ order, onClose }) => {
  const [copied, setCopied] = useState(false);
  const { settings } = useApp();

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getTicketText = () => {
    const bizName = settings?.businessName || 'ANTOJITOS CON MIRIAM';
    const subtitle = settings?.businessSubtitle || 'Sabor que te encanta en carretilla';
    const thankYou = settings?.thankYouMessage || '¡Muchas gracias por su preferencia casero! ✨';
    const lines = [
      `🍔 *${bizName}* 🍗`,
      `*${subtitle}*`,
      `---------------------------------`,
      `*Ticket:* #${order.orderNumber}`,
      `*Cliente:* ${order.customerName || 'Cliente al paso'}`,
      `*Modalidad:* ${order.orderType === 'llevar' ? 'Para Llevar' : 'Para Comer Aquí'}`,
      `*Fecha:* ${formattedDate}`,
      `---------------------------------`,
      `*DETALLE DEL PEDIDO:*`
    ];

    order.items?.forEach(i => {
      lines.push(`${i.quantity}x ${i.name} - S/ ${(i.price * i.quantity).toFixed(2)}`);
      if (i.cremas && i.cremas.length > 0) {
        lines.push(`   ↳ Cremas: ${i.cremas.join(', ')}`);
      }
    });

    lines.push(`---------------------------------`);
    const hasPerItemCremas = order.items?.some(i => i.cremas && i.cremas.length > 0);
    if (!hasPerItemCremas && order.cremas && order.cremas.length > 0) {
      lines.push(`*Cremas:* ${order.cremas.join(', ')}`);
    }
    if (order.specialInstructions) {
      lines.push(`*Nota:* ${order.specialInstructions}`);
    }
    lines.push(`---------------------------------`);
    lines.push(`*TOTAL A PAGAR: S/ ${order.total.toFixed(2)}*`);

    if (order.debt) {
      lines.push(`*Estado:* ${debtBalance(order) > 0 ? `FIADO - SALDO S/ ${debtBalance(order).toFixed(2)}` : 'DEUDA SALDADA'}`);
    } else if (order.payment) {
      lines.push(`*Estado:* PAGADO (${order.payment.method.toUpperCase()})`);
      if (order.payment.change > 0) {
        lines.push(`*Vuelto:* S/ ${order.payment.change.toFixed(2)}`);
      }
    } else {
      lines.push(`*Estado:* PENDIENTE DE PAGO`);
    }

    lines.push(`---------------------------------`);
    lines.push(thankYou);
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getTicketText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = getTicketText();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-stone-800">
        
        {/* Header */}
        <div className="bg-stone-950 text-white p-4 flex items-center justify-between border-b border-amber-500/20">
          <span className="font-black text-sm text-amber-400">Ticket Digital</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper receipt styling */}
        <div className="p-5 font-mono text-xs bg-amber-50/70 text-slate-900 space-y-3 border-b border-dashed border-slate-300">
          <div className="text-center space-y-0.5">
            <span className="text-3xl block">🍔</span>
            <h3 className="font-black text-base tracking-widest uppercase font-serif italic">
              {settings?.businessName?.split(' ')[0] || 'Antojitos'}
            </h3>
            <span className="inline-block text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.2 rounded font-sans uppercase">
              {settings?.businessName?.split(' ').slice(1).join(' ') || 'con Miriam'}
            </span>
            <p className="text-[10px] text-slate-600 mt-1">{settings?.businessSubtitle || 'Hamburguesas • Frituras • Comidas • Bebidas'}</p>
          </div>

          <div className="border-t border-b border-dashed border-slate-400 py-2 flex justify-between items-center">
            <div>
              <p className="font-black text-slate-900">Pedido #{order.orderNumber}</p>
              <p className="text-[10px] text-slate-600">{order.customerName || 'Cliente'}</p>
            </div>
            <div className="text-right">
              <span className="bg-stone-900 text-amber-400 text-[10px] px-2 py-0.5 rounded font-sans font-black">
                {order.orderType === 'llevar' ? 'LLEVAR' : 'MESA'}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">{formattedDate}</p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5 py-1">
            {order.items?.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span>
                    <strong>{item.quantity}x</strong> {item.name}
                  </span>
                  <span className="font-bold">
                    S/ {(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
                {item.cremas && item.cremas.length > 0 && (
                  <p className="text-[10px] text-slate-500 pl-4">🌶️ Cremas: {item.cremas.join(', ')}</p>
                )}
              </div>
            ))}
          </div>

          {/* Cremas (fallback for pedidos antiguos) */}
          <div className="border-t border-dashed border-slate-400 pt-2 text-[11px] text-slate-700">
            {!(order.items?.some(i => i.cremas && i.cremas.length > 0)) && (
              <p><strong>Cremas:</strong> {order.cremas?.join(', ') || 'Todas'}</p>
            )}
            {order.specialInstructions && (
              <p><strong>Nota:</strong> {order.specialInstructions}</p>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-dashed border-slate-400 pt-2 flex justify-between items-baseline font-sans">
            <span className="font-bold text-sm">TOTAL:</span>
            <span className="font-black text-2xl text-amber-600">
              S/ {order.total.toFixed(2)}
            </span>
          </div>

          {order.debt && <p className="text-center font-black text-red-700">{debtBalance(order) > 0 ? `FIADO · SALDO S/ ${debtBalance(order).toFixed(2)}` : 'DEUDA SALDADA'}</p>}

<p className="text-center pt-2 font-sans text-[11px] text-slate-500">
            {settings?.thankYouMessage || '¡Muchas gracias por su preferencia casero! ✨'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-white dark:bg-stone-900 grid grid-cols-3 gap-2">
          <button
            onClick={handleCopy}
            className="py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-700 dark:text-stone-300 font-bold text-xs flex flex-col items-center gap-1 transition-colors"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center gap-1 transition-all shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2.5 px-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs flex flex-col items-center gap-1 transition-all border border-stone-700"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>

      </div>
    </div>
  );
};
