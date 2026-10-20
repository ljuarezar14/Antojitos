import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { orderNumberText } from '../domain/orders';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  ShoppingBag, 
  UtensilsCrossed, 
  Sparkles,
  Search,
  Check,
  CreditCard,
  Users,
  UserCheck,
  Star,
  X
} from 'lucide-react';

export const TakeOrderView = ({ onOpenPayment, preselectedCustomer = null }) => {
  const { menu, orders, addOrder, appendToOpenAccount, accountOrderId, setAccountOrderId,
    customers, addCustomer, setActiveTab, cremas, categories } = useApp();
  const accountOrder = orders.find(order => order.id === accountOrderId && order.openAccount);

  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Current order in progress
  const [orderItems, setOrderItems] = useState([]);
  const [orderType, setOrderType] = useState('llevar'); // 'llevar' | 'mesa'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [saveAsNewCasero, setSaveAsNewCasero] = useState(false);
  const [showCaserosPicker, setShowCaserosPicker] = useState(false);

  const [defaultCremas, setDefaultCremas] = useState(['Todas']);
  const [expandedLineId, setExpandedLineId] = useState(null);
  const [specialNote, setSpecialNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  // If a customer was pre-selected from CustomersView
  useEffect(() => {
    if (preselectedCustomer && !accountOrderId) {
      applyCustomer(preselectedCustomer);
    }
  }, [preselectedCustomer, accountOrderId]);

  useEffect(() => {
    if (!accountOrder) return;
    setCustomerName(accountOrder.customerName);
    setCustomerPhone(accountOrder.customerPhone || '');
    setSelectedCustomerId(accountOrder.customerId || null);
    setOrderType(accountOrder.orderType || 'mesa');
    setOrderError('');
  }, [accountOrderId]);

  const applyCustomer = (cust) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || '');
    if (cust.favoriteCremas && cust.favoriteCremas.length > 0) {
      setDefaultCremas(cust.favoriteCremas);
    }
    if (cust.notes) {
      setSpecialNote(cust.notes);
    }
    setShowCaserosPicker(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Filtered menu
  const filteredProducts = menu.filter(item => {
    const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  const unavailableProducts = menu.filter(item => !item.available);

  // Calculate order subtotal
  const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Cart operations — each tap adds its own unit so every dish can carry its own cremas
  const qtyInCartOf = (productId) => orderItems.filter(i => i.id === productId).length;

  const handleAddItem = (product) => {
    if (!product.available) return;
    setOrderItems(prev => [
      ...prev,
      {
        lineId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        notes: '',
        cremas: [...defaultCremas]
      }
    ]);
  };

  const handleRemoveOneProduct = (productId) => {
    setOrderItems(prev => {
      let lastIdx = -1;
      prev.forEach((it, idx) => {
        if (it.id === productId) lastIdx = idx;
      });
      if (lastIdx === -1) return prev;
      return prev.filter((_, idx) => idx !== lastIdx);
    });
  };

  const handleRemoveLine = (lineId) => {
    setOrderItems(prev => prev.filter(i => i.lineId !== lineId));
    setExpandedLineId(prev => (prev === lineId ? null : prev));
  };

  // Per-line crema toggling
  const toggleCremaList = (list, cremaName) => {
    if (cremaName === 'Todas') return ['Todas'];
    if (cremaName === 'Sin cremas') return ['Sin cremas'];

    let updated = list.filter(c => c !== 'Todas' && c !== 'Sin cremas');
    if (updated.includes(cremaName)) {
      updated = updated.filter(c => c !== cremaName);
    } else {
      updated.push(cremaName);
    }
    return updated.length === 0 ? ['Sin cremas'] : updated;
  };

  const handleToggleLineCrema = (lineId, cremaName) => {
    setOrderItems(prev => prev.map(i => (
      i.lineId === lineId ? { ...i, cremas: toggleCremaList(i.cremas, cremaName) } : i
    )));
  };

  const cremasLabel = (list) => {
    if (!list || list.length === 0) return 'Todas';
    if (list.includes('Todas')) return 'Todas';
    if (list.includes('Sin cremas')) return 'Sin cremas';
    return list.map(name => {
      const found = cremas.find(c => c.name === name);
      return found ? found.short : name;
    }).join(', ');
  };

  const handleClearCart = () => {
    setOrderItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomerId(null);
    setSaveAsNewCasero(false);
    setDefaultCremas(['Todas']);
    setExpandedLineId(null);
    setSpecialNote('');
  };

  const handleCreateOrder = (autoPay = false, openAccount = false) => {
    if (orderItems.length === 0) return;
    setOrderError('');
    const unavailableInOrder = orderItems.find(item => !menu.some(product => product.id === item.id && product.available));
    if (unavailableInOrder) {
      setOrderError(`${unavailableInOrder.name} está agotado o ya no figura en la carta. Retíralo del pedido para continuar.`);
      return;
    }
    if (accountOrderId) {
      if (!accountOrder || !appendToOpenAccount(accountOrderId, orderItems, specialNote)) {
        setOrderError('Esta cuenta ya no está abierta. Vuelve a Cuentas y selecciónala otra vez.');
        return;
      }
      handleClearCart();
      setAccountOrderId(null);
      setActiveTab('cuentas');
      return;
    }
    if (openAccount && (!customerName.trim() || customerName.trim().toLowerCase() === 'cliente al paso')) {
      setOrderError('Escribe el nombre del cliente para abrir su cuenta.');
      return;
    }

    setIsSubmitting(true);

    let linkedCustomerId = selectedCustomerId;

    // Representative cremas for the casero profile (first dish added)
    const representativeCremas = orderItems[0]?.cremas || defaultCremas;

    if (saveAsNewCasero && !selectedCustomerId && customerName.trim()) {
      const created = addCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        favoriteCremas: representativeCremas,
        notes: specialNote.trim()
      });
      linkedCustomerId = created.id;
    }

    const orderData = {
      customerId: linkedCustomerId,
      customerName: customerName.trim() || 'Cliente al paso',
      customerPhone: customerPhone.trim(),
      orderType,
      items: orderItems,
      cremas: representativeCremas,
      specialInstructions: specialNote.trim(),
      total: orderTotal,
      openAccount
    };

    const newOrder = addOrder(orderData);
    handleClearCart();
    setIsSubmitting(false);

    if (autoPay) {
      onOpenPayment(newOrder);
    } else {
      setActiveTab(openAccount ? 'cuentas' : 'pedidos-activos');
    }
  };

  const quickNotesPresets = [
    'Papas bien fritas',
    'Sin ensalada',
    'Poco arroz',
    'Bien crocante',
    'Bien servido',
    'Cremas aparte'
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT: Menu Catalog (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {unavailableProducts.length > 0 && (
            <div role="status" className="rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-bold text-red-800 dark:text-red-300">
              Agotado ahora: {unavailableProducts.map(product => product.name).join(', ')}.
            </div>
          )}
          
          {/* Search Bar - Warm & Crisp */}
          <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl shadow-sm border-2 border-amber-200/80 dark:border-stone-800 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-amber-500 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar plato o bebida (ej. hamburguesa, aguadito, alitas)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-amber-50/50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-400 dark:placeholder:text-stone-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-stone-200 bg-amber-100 dark:bg-stone-700 px-1.5 py-0.5 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Ribbon Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 scale-102 border-2 border-amber-400'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-stone-800 border-2 border-amber-100 dark:border-stone-800'
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Dishes Grid - Distinct Colorful Light Mode & Dark Mode with [+] and [-] Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredProducts.map((product) => {
              const qtyInCart = qtyInCartOf(product.id);

              return (
                <div
                  key={product.id}
                  onClick={() => handleAddItem(product)}
                  className={`group text-left p-3.5 rounded-2xl border-2 transition-all relative flex flex-col justify-between cursor-pointer select-none ${
                    !product.available
                      ? 'bg-slate-100 dark:bg-stone-950/60 border-slate-200 dark:border-stone-800 opacity-50 cursor-not-allowed'
                      : qtyInCart > 0
                        ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-500 dark:border-amber-500 shadow-md ring-2 ring-amber-400/25'
                        : 'bg-white dark:bg-stone-900 border-amber-200/90 dark:border-stone-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md hover:bg-amber-50/30'
                  }`}
                >
                  {/* Quantity Badge on Top Right */}
                  {qtyInCart > 0 && (
                    <div className="absolute -top-2.5 -right-2.5 bg-amber-500 text-stone-950 font-black text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-md animate-bounce border-2 border-white dark:border-stone-900">
                      {qtyInCart}
                    </div>
                  )}

                  {!product.available && (
                    <div className="absolute top-2 right-2 bg-stone-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      Agotado
                    </div>
                  )}

                  <div>
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform origin-left">
                      {product.emoji || '🍽️'}
                    </div>
                    <h3 className="font-black text-slate-900 dark:text-stone-100 text-sm leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5 font-medium">
                      {product.description}
                    </p>
                  </div>

                  {/* Bottom Bar: Price and Stepper [-] [qty] [+] */}
                  <div className="mt-3 pt-2.5 border-t border-amber-100 dark:border-stone-800 flex items-center justify-between gap-1">
                    <span className="font-black text-base text-amber-700 dark:text-amber-400">
                      S/ {product.price.toFixed(2)}
                    </span>

                    {/* Stepper with Minus & Plus right on the card */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Minus button to decrease 1 if tapped too many times */}
                      {qtyInCart > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveOneProduct(product.id);
                          }}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-100 hover:bg-red-500 text-red-700 hover:text-white dark:bg-red-950/70 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white flex items-center justify-center transition-all shadow-xs active:scale-90 font-black"
                          title="Disminuir 1"
                        >
                          <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                        </button>
                      )}

                      {/* Current Count badge on card */}
                      {qtyInCart > 0 && (
                        <span className="font-black text-xs sm:text-sm text-stone-900 dark:text-white px-0.5 min-w-4 text-center">
                          {qtyInCart}
                        </span>
                      )}

                      {/* Plus button to add 1 */}
                      <button
                        type="button"
                        disabled={!product.available}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddItem(product);
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 flex items-center justify-center transition-all shadow-xs active:scale-90 font-black"
                        title="Aumentar 1"
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center border-2 border-dashed border-amber-200 dark:border-stone-800">
              <p className="text-slate-400 dark:text-stone-500 text-sm font-semibold">No se encontraron platos en esta categoría.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Active Order Builder (5 cols on desktop) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-md border-2 border-amber-200/90 dark:border-stone-800 sticky top-20 overflow-hidden">
            
            {/* Header matching flyer banner */}
            <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h2 className="font-black text-base">{accountOrder ? `Agregar a cuenta ${orderNumberText(accountOrder)}` : 'Pedido en Curso'}</h2>
              </div>
              {orderItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-amber-300 hover:text-white flex items-center gap-1 hover:underline font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar
                </button>
              )}
            </div>

            <div className="p-4 space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto">
              {accountOrder && <div className="rounded-xl bg-amber-100 dark:bg-stone-800 p-3 text-xs font-bold text-stone-900 dark:text-amber-300">
                Cuenta de {accountOrder.customerName} · Acumulado S/ {Number(accountOrder.total).toFixed(2)}
              </div>}
              
              {/* 1. Customer Selection / Autocomplete */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-800 dark:text-stone-300 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Cliente / Casero:</span>
                  </label>

                  {!accountOrder && <button
                    type="button"
                    onClick={() => setShowCaserosPicker(!showCaserosPicker)}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-black flex items-center gap-1 bg-amber-100/70 dark:bg-stone-800 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-stone-700"
                  >
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>Elegir Casero</span>
                  </button>}
                </div>

                {/* Casero Quick Picker Dropdown */}
                {showCaserosPicker && (
                  <div className="bg-amber-50/90 dark:bg-stone-800 border-2 border-amber-300 dark:border-stone-700 rounded-2xl p-2.5 space-y-2 shadow-md animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-black text-stone-800 dark:text-stone-300">
                      <span>Selecciona un Casero Frecuente:</span>
                      <button onClick={() => setShowCaserosPicker(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {customers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => applyCustomer(c)}
                          className="w-full text-left p-2 bg-white dark:bg-stone-900 hover:bg-amber-100 dark:hover:bg-stone-700 rounded-xl border border-amber-200 dark:border-stone-700 text-xs flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="font-extrabold text-slate-800 dark:text-stone-100">{c.name}</span>
                            {c.favoriteDish && (
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-medium">Pide: {c.favoriteDish}</span>
                            )}
                          </div>
                          <span className="text-[11px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                            {c.totalOrders || 0} pedidos
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Customer Pill or Input */}
                {accountOrder ? (
                  <div className="rounded-xl border border-amber-300 dark:border-stone-700 p-2.5 text-sm font-bold text-slate-900 dark:text-white">{accountOrder.customerName}{accountOrder.customerPhone ? ` · ${accountOrder.customerPhone}` : ''}</div>
                ) : selectedCustomerId ? (
                  <div className="bg-amber-100/70 dark:bg-stone-800 border-2 border-amber-400 dark:border-amber-500/50 p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-amber-500 text-stone-950 rounded-lg flex items-center justify-center font-black text-xs">
                        ⭐
                      </div>
                      <div>
                        <p className="font-black text-xs text-slate-900 dark:text-white">{customerName}</p>
                        <p className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold">Casero vinculado • Gustos cargados</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-xs text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Nombre o seña (ej. Carlos, Chico casaca roja)..."
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-amber-50/40 dark:bg-stone-800 border-2 border-amber-200/80 dark:border-stone-700 text-slate-800 dark:text-stone-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    {/* Quick option to save as new casero */}
                    {customerName.trim().length >= 3 && !selectedCustomerId && (
                      <label className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-400 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAsNewCasero}
                          onChange={(e) => setSaveAsNewCasero(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        <span>⭐ Guardar como nuevo casero en mi lista</span>
                      </label>
                    )}
                  </div>
                )}

                {/* Type buttons: Para Llevar vs Comer Aquí */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOrderType('llevar')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all ${
                      orderType === 'llevar'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                        : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-400 border-amber-200 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-stone-750'
                    }`}
                  >
                    <span>🥡 Para Llevar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('mesa')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-all ${
                      orderType === 'mesa'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                        : 'bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-400 border-amber-200 dark:border-stone-700 hover:bg-amber-50 dark:hover:bg-stone-750'
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    <span>🍽️ En Mesa (Plato)</span>
                  </button>
                </div>
              </div>

              {/* 2. Items List */}
              <div className="space-y-2 border-t border-b border-amber-100 dark:border-stone-800 py-3">
                <span className="text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Platos Seleccionados ({orderItems.reduce((acc, i) => acc + i.quantity, 0)})
                </span>

                {orderItems.length === 0 ? (
                  <div className="py-7 text-center text-stone-400 dark:text-stone-500 border-2 border-dashed border-amber-200 dark:border-stone-800 rounded-xl bg-amber-50/30 dark:bg-stone-900">
                    <p className="text-3xl mb-1">🍔</p>
                    <p className="text-sm font-bold">Aún no has agregado platos.</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 font-medium">Toca cualquier plato a la izquierda.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {orderItems.map((item) => {
                      const isExpanded = expandedLineId === item.lineId;
                      const hasTodas = item.cremas.includes('Todas');
                      const noCremas = item.cremas.includes('Sin cremas');
                      return (
                        <div
                          key={item.lineId}
                          className={`bg-amber-50/60 dark:bg-stone-800 rounded-xl border transition-colors ${
                            isExpanded
                              ? 'border-amber-400 dark:border-amber-500/50'
                              : 'border-amber-200 dark:border-stone-700'
                          }`}
                        >
                          <div className="p-2.5 flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-xs sm:text-sm text-slate-800 dark:text-stone-100 truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                                S/ {item.price.toFixed(2)}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Edit cremas for this dish */}
                              <button
                                type="button"
                                onClick={() => setExpandedLineId(isExpanded ? null : item.lineId)}
                                className={`text-[11px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                                  isExpanded
                                    ? 'bg-amber-500 text-stone-950 border-amber-400'
                                    : 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-stone-700'
                                }`}
                                title="Elegir cremas para este plato"
                              >
                                <span>🌶️</span>
                                <span>{isExpanded ? 'Cerrar' : 'Cremas'}</span>
                              </button>

                              {/* Remove this dish */}
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(item.lineId)}
                                className="text-stone-400 hover:text-red-500 p-1"
                                title="Quitar este plato"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Crema summary for this dish */}
                          <div className="px-2.5 pb-2 -mt-1">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-stone-400">
                              Cremas: <span className="text-amber-700 dark:text-amber-400">{cremasLabel(item.cremas)}</span>
                            </span>
                          </div>

                          {/* Expanded crema picker for this dish only */}
                          {isExpanded && (
                            <div className="px-2.5 pb-2.5 pt-2 space-y-1.5 border-t border-amber-200/70 dark:border-stone-700 animate-in fade-in">
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleLineCrema(item.lineId, 'Todas')}
                                  className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${
                                    hasTodas
                                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-amber-200 dark:border-stone-700'
                                  }`}
                                >
                                  Todas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleLineCrema(item.lineId, 'Sin cremas')}
                                  className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${
                                    noCremas
                                      ? 'bg-stone-800 text-white border-stone-700'
                                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-amber-200 dark:border-stone-700'
                                  }`}
                                >
                                  Sin cremas
                                </button>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {cremas.map((crema) => {
                                  const isSelected = hasTodas || item.cremas.includes(crema.name);
                                  return (
                                    <button
                                      key={crema.id}
                                      type="button"
                                      onClick={() => handleToggleLineCrema(item.lineId, crema.name)}
                                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                        isSelected
                                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 border-2 border-amber-400 dark:border-amber-500/50'
                                          : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-400 border border-amber-200 dark:border-stone-700'
                                      }`}
                                    >
                                      {isSelected && !hasTodas && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400 stroke-[3]" />}
                                      {crema.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cremas are now chosen per dish in the list above */}
              <p className="text-[11px] text-slate-400 dark:text-stone-500 leading-snug">
                💡 Tip: toca <strong>Cremas</strong> en cada plato para elegir salsas distintas por plato (ej. una hamburguesa con ají y otra con mayonesa).
              </p>


              {/* 4. Special Notes & Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-stone-800 dark:text-stone-300 uppercase tracking-wider block">
                  Indicación rápida:
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {quickNotesPresets.map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setSpecialNote(prev => prev ? `${prev}, ${note}` : note)}
                      className="text-[11px] bg-amber-50 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-stone-700 font-bold"
                    >
                      +{note}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="ej. Papas bien doradas, sin ensalada..."
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  className="w-full px-3 py-1.5 bg-amber-50/40 dark:bg-stone-800 border-2 border-amber-200 dark:border-stone-700 text-slate-800 dark:text-stone-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Total & Action Buttons */}
              <div className="pt-2 border-t border-amber-100 dark:border-stone-800 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-stone-600 dark:text-stone-400">{accountOrder ? 'Nuevo consumo:' : 'Total a Pagar:'}</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    S/ {orderTotal.toFixed(2)}
                  </span>
                </div>

                {accountOrder && <p className="text-sm font-black text-amber-700 dark:text-amber-400">Total acumulado: S/ {(Number(accountOrder.total) + orderTotal).toFixed(2)}</p>}
                {orderError && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">{orderError}</p>}

                {accountOrder ? <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { handleClearCart(); setAccountOrderId(null); setActiveTab('cuentas'); }} className="rounded-xl border border-stone-300 dark:border-stone-700 px-3 py-3 text-xs font-black text-stone-700 dark:text-stone-200">Volver</button>
                  <button type="button" disabled={orderItems.length === 0 || isSubmitting} onClick={() => handleCreateOrder()} className="rounded-xl bg-amber-500 px-3 py-3 text-xs font-black text-stone-950 disabled:opacity-50">Agregar a cuenta</button>
                </div> : <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={orderItems.length === 0 || isSubmitting}
                    onClick={() => handleCreateOrder(false)}
                    className="py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-98 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>A Preparar ⏱️</span>
                  </button>

                  <button
                    type="button"
                    disabled={orderItems.length === 0 || isSubmitting}
                    onClick={() => handleCreateOrder(true)}
                    className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cobrar Ahora 💵</span>
                  </button>
                </div>
                }
                {!accountOrder && <button type="button" disabled={orderItems.length === 0 || isSubmitting} onClick={() => handleCreateOrder(false, true)} className="w-full rounded-xl border-2 border-amber-500 bg-amber-100 dark:bg-stone-800 px-3 py-3 text-sm font-black text-amber-950 dark:text-amber-400 disabled:opacity-50">Abrir cuenta para cobrar al retirarse</button>}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
