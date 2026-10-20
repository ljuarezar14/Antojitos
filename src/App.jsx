import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { TakeOrderView } from './components/TakeOrderView';
import { OrdersListView } from './components/OrdersListView';
import { DailyCashRegisterView } from './components/DailyCashRegisterView';
import { CustomersView } from './components/CustomersView';
import { MenuManagementView } from './components/MenuManagementView';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsView } from './components/SettingsView';
import { DebtsView } from './components/DebtsView';
import { OpenAccountsView } from './components/OpenAccountsView';
import { Sparkles, HelpCircle, X } from 'lucide-react';

const MainContent = () => {
  const { currentUser, activeTab, theme, dbReady, dbError: stateError, syncError, orders } = useApp();
  const dbError = [stateError, syncError].filter(Boolean).join(' · ');
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [receiptOrder, setReceiptOrder] = useState(null);
  // Modals follow the live order, so a number confirmed by the server shows up right away.
  const liveOrder = order => order && (orders.find(item => item.id === order.id) || order);
  const [preselectedCustomer, setPreselectedCustomer] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  if (!dbReady) {
    return <div role={dbError ? 'alert' : undefined} className="min-h-screen grid place-items-center bg-stone-950 px-6 text-center text-amber-400 font-bold">{dbError || 'Abriendo base de datos...'}</div>;
  }

  // If user is not authenticated, show Login Screen
  if (!currentUser) {
    return <><LoginView />{dbError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-red-900 p-3 text-white text-sm">{dbError}</div>}</>;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      theme === 'dark' ? 'dark bg-stone-950 text-stone-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <Navbar />
      {dbError && <div role="alert" className="bg-red-900 px-4 py-2 text-center text-sm text-white">{dbError}</div>}

      <main className="flex-1">
        {activeTab === 'tomar-pedido' && (
          <TakeOrderView 
            onOpenPayment={(order) => setPaymentOrder(order)} 
            preselectedCustomer={preselectedCustomer}
          />
        )}

        {activeTab === 'pedidos-activos' && (
          <OrdersListView 
            onOpenPayment={(order) => setPaymentOrder(order)}
            onOpenReceipt={(order) => setReceiptOrder(order)}
          />
        )}
        {activeTab === 'cuentas' && <OpenAccountsView onOpenPayment={(order) => setPaymentOrder(order)} />}

        {activeTab === 'caja' && (
          <DailyCashRegisterView />
        )}
        {activeTab === 'deudas' && <DebtsView />}

        {activeTab === 'clientes' && (
          <CustomersView 
            onSelectCustomerForOrder={(cust) => setPreselectedCustomer(cust)} 
          />
        )}

        {activeTab === 'menu' && (
          <MenuManagementView />
        )}
        {activeTab === 'admin' && currentUser.role === 'admin' && <SettingsView />}
      </main>

      {/* Payment Modal */}
      {paymentOrder && (
        <PaymentModal 
          order={liveOrder(paymentOrder)} 
          onClose={() => setPaymentOrder(null)} 
        />
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal 
          order={liveOrder(receiptOrder)} 
          onClose={() => setReceiptOrder(null)} 
        />
      )}

      {/* Floating Quick Help */}
      <button
        onClick={() => setShowHelp(true)}
        className="hidden sm:flex fixed bottom-5 right-5 z-20 bg-stone-900 text-amber-400 border border-stone-700 p-3 rounded-full shadow-xl hover:bg-amber-500 hover:text-stone-950 transition-all items-center gap-2 text-xs font-black"
        title="Guía rápida de uso"
      >
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <span>¿Cómo funciona?</span>
      </button>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍔</span>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Guía de Antojitos con Miriam
                </h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-stone-800 flex items-center justify-center text-slate-500 dark:text-stone-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-stone-300">
              <div className="p-3 bg-amber-50 dark:bg-stone-800 rounded-xl border border-amber-200 dark:border-stone-700">
                <h4 className="font-black text-amber-900 dark:text-amber-400 mb-1">1. Tomar Pedido ⚡</h4>
                <p>Toca hamburguesas, aguadito, alitas o frituras, elige si es <strong>Para Llevar</strong> o <strong>En Mesa</strong>, y selecciona o guarda a tu <strong>Casero</strong> con sus cremas favoritas.</p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-stone-800 rounded-xl border border-blue-200 dark:border-stone-700">
                <h4 className="font-black text-blue-900 dark:text-blue-400 mb-1">2. Registro de Caseros ⭐</h4>
                <p>En <strong>Mis Caseros</strong> mira a tus clientes frecuentes y mándales mensajes por <strong>WhatsApp</strong> para avisarles que la carretilla abrió.</p>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-stone-800 rounded-xl border border-emerald-200 dark:border-stone-700">
                <h4 className="font-black text-emerald-900 dark:text-emerald-400 mb-1">3. Cobro y Vuelto 💵</h4>
                <p>Calcula el vuelto exacto al instante y registra pagos con <strong>Efectivo, Yape o Plin</strong>.</p>
              </div>

              <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                <h4 className="font-black text-slate-900 dark:text-white mb-1">4. Cierre de Caja 📊</h4>
                <p>Anota tus compras del día (hielo, bolsas, aceite), mira tu <strong>Ganancia Neta</strong> y envíate el resumen a tu WhatsApp con 1 clic.</p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs transition-colors"
            >
              ¡Entendido, a vender!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
