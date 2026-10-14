import React, { useState } from 'react';
import { useApp, DEFAULT_GREETING_MESSAGE } from '../context/AppContext';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MessageCircle, 
  Edit3, 
  Trash2, 
  Heart, 
  ShoppingBag, 
  Calendar, 
  Check, 
  X,
  Star,
  Award,
  MessageSquare,
  RotateCcw
} from 'lucide-react';

export const CustomersView = ({ onSelectCustomerForOrder }) => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    menu, 
    setActiveTab,
    cremas,
    greetingTemplate,
    updateGreetingTemplate,
    resetGreetingTemplate
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [draftMessage, setDraftMessage] = useState(greetingTemplate);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newFavoriteDish, setNewFavoriteDish] = useState('');
  const [newCremas, setNewCremas] = useState(['Todas']);
  const [newNotes, setNewNotes] = useState('');

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.notes && c.notes.toLowerCase().includes(q));
  });

  const handleToggleCremaNew = (cremaName) => {
    if (cremaName === 'Todas') {
      setNewCremas(['Todas']);
      return;
    }
    let updated = newCremas.filter(c => c !== 'Todas');
    if (updated.includes(cremaName)) {
      updated = updated.filter(c => c !== cremaName);
    } else {
      updated.push(cremaName);
    }
    if (updated.length === 0) updated = ['Todas'];
    setNewCremas(updated);
  };

  const handleCreateCustomer = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    addCustomer({
      name: newName,
      phone: newPhone,
      favoriteDish: newFavoriteDish,
      favoriteCremas: newCremas,
      notes: newNotes
    });

    setIsAddingNew(false);
    setNewName('');
    setNewPhone('');
    setNewFavoriteDish('');
    setNewCremas(['Todas']);
    setNewNotes('');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingCustomer) return;
    updateCustomer(editingCustomer.id, editingCustomer);
    setEditingCustomer(null);
  };

  const handleSendWhatsAppGreeting = (customer) => {
    if (!customer.phone) {
      alert('Este casero no tiene número de teléfono registrado.');
      return;
    }

    const text = (greetingTemplate || '').replace(/\{nombre\}/gi, customer.name);

    const cleanPhone = customer.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
    window.open(`https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenMessageModal = () => {
    setDraftMessage(greetingTemplate);
    setShowMessageModal(true);
  };

  const handleSaveMessage = () => {
    updateGreetingTemplate(draftMessage);
    setShowMessageModal(false);
  };

  const handleResetMessage = () => {
    resetGreetingTemplate();
    setDraftMessage(DEFAULT_GREETING_MESSAGE);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8 space-y-5">
      
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black text-amber-500 uppercase tracking-wider block">
            Directorio de Caseros Frecuentes
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-stone-100 flex items-center gap-2">
            <span>Mis Clientes y Caseros</span>
            <span className="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-black border border-amber-300 dark:border-amber-500/40">
              {customers.length} registrados
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            Guarda sus platos favoritos, sus gustos de cremas y envíales mensajes por WhatsApp cuando prendas la carretilla.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleOpenMessageModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-stone-800 text-stone-900 dark:text-amber-300 border-2 border-amber-300 dark:border-stone-700 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Editar mensaje WhatsApp</span>
          </button>

          <button
            onClick={() => setIsAddingNew(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Nuevo Casero</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, apodo o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Customers Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-10 text-center border-2 border-dashed border-amber-200 dark:border-stone-800">
          <p className="text-3xl mb-2">👥</p>
          <p className="font-bold text-slate-700 dark:text-stone-300 text-sm">No se encontraron clientes con esa búsqueda.</p>
          <p className="text-xs text-slate-400 dark:text-stone-500 mt-1">Registra a tu primer casero usando el botón de arriba.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const isFrequent = (customer.totalOrders || 0) >= 5;

            return (
              <div
                key={customer.id}
                className="bg-white dark:bg-stone-900 rounded-2xl p-4 border-2 border-amber-200/90 dark:border-stone-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top: Name & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black text-base flex items-center justify-center border border-amber-300/40">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                          {customer.name}
                        </h3>
                        {customer.phone ? (
                          <p className="text-xs text-slate-500 dark:text-stone-400 font-medium flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400 dark:text-stone-500" />
                            {customer.phone}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 dark:text-stone-500 italic">Sin teléfono</p>
                        )}
                      </div>
                    </div>

                    {isFrequent && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/40">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Casero Fiel
                      </span>
                    )}
                  </div>

                  {/* Customer Preferences */}
                  <div className="space-y-1.5 py-2 border-t border-slate-100 dark:border-stone-800 text-xs">
                    {customer.favoriteDish && (
                      <p className="text-slate-700 dark:text-stone-300">
                        <strong className="text-slate-500 dark:text-stone-400">Plato preferido:</strong> {customer.favoriteDish}
                      </p>
                    )}

                    {customer.favoriteCremas && customer.favoriteCremas.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <strong className="text-slate-500 dark:text-stone-400 text-[11px]">Cremas:</strong>
                        {customer.favoriteCremas.map((c, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 px-1.5 py-0.2 rounded border border-slate-200 dark:border-stone-700 font-medium"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {customer.notes && (
                      <p className="text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg border border-amber-200/80 dark:border-amber-500/20 text-[11px]">
                        📝 <strong>Nota:</strong> {customer.notes}
                      </p>
                    )}
                  </div>

                  {/* Stats & History */}
                  <div className="bg-slate-50 dark:bg-stone-800 rounded-xl p-2.5 my-2 flex items-center justify-between text-xs border border-slate-200/60 dark:border-stone-700">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-stone-500 uppercase font-bold block">
                        Pedidos hechos
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-white">
                        {customer.totalOrders || 0} veces
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 dark:text-stone-500 uppercase font-bold block">
                        Consumo total
                      </span>
                      <span className="font-black text-amber-600 dark:text-amber-400">
                        S/ {(customer.totalSpent || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-stone-800 flex items-center justify-between gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppGreeting(customer)}
                    disabled={!customer.phone}
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
                    title="Avisar por WhatsApp que estás atendiendo"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Avisar WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCustomerForOrder) {
                        onSelectCustomerForOrder(customer);
                      }
                      setActiveTab('tomar-pedido');
                    }}
                    className="py-1.5 px-2.5 bg-amber-100 dark:bg-stone-800 hover:bg-amber-200 dark:hover:bg-stone-700 text-amber-900 dark:text-amber-300 rounded-xl font-black flex items-center gap-1 transition-colors"
                    title="Tomar pedido a este casero"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Pedir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCustomer(customer)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-stone-200 rounded-lg hover:bg-slate-100 dark:hover:bg-stone-800"
                    title="Editar casero"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${customer.name} de tus caseros?`)) {
                        deleteCustomer(customer.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Eliminar casero"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Customer */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  Nuevo Casero / Cliente
                </h3>
              </div>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">
                  Nombre o Apodo del Casero *
                </label>
                <input
                  type="text"
                  placeholder="ej. Juan Mecánico, Sra. Gladis de la botica..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="ej. 987654321"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">
                  Plato Favorito
                </label>
                <select
                  value={newFavoriteDish}
                  onChange={(e) => setNewFavoriteDish(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Seleccionar plato común --</option>
                  {menu.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">
                  Cremas que siempre pide
                </label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleCremaNew('Todas')}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border font-bold ${
                      newCremas.includes('Todas') ? 'bg-amber-500 text-stone-950 border-amber-400' : 'bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-400'
                    }`}
                  >
                    Todas
                  </button>
                  {cremas.map(c => {
                    const isSelected = newCremas.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleCremaNew(c.name)}
                        className={`text-[11px] px-2 py-0.5 rounded-lg border font-medium ${
                          isSelected ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 font-bold' : 'bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-400'
                        }`}
                      >
                        {c.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">
                  Señas / Gustos especiales
                </label>
                <input
                  type="text"
                  placeholder="ej. Papas bien doradas, le gusta la tártara aparte..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-stone-800 text-slate-700 dark:text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shadow-md"
                >
                  Guardar Casero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Customer */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white">Editar Datos de Casero</h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">Plato Favorito</label>
                <select
                  value={editingCustomer.favoriteDish || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, favoriteDish: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold"
                >
                  <option value="">-- Ninguno --</option>
                  {menu.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-stone-400 block mb-1">Notas / Preferencias</label>
                <input
                  type="text"
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-200 dark:bg-stone-800 text-slate-700 dark:text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit WhatsApp Greeting Message */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-amber-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-300/50">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                    Mensaje para tus Caseros
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-stone-400 font-medium">
                    Personaliza el saludo que se envía por WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 text-[11px] text-amber-900 dark:text-amber-200 font-medium">
              💡 Escribe <strong className="font-black">{'{nombre}'}</strong> para insertar automáticamente el nombre del casero. Puedes usar <strong>negritas</strong> con asteriscos y saltos de línea.
            </div>

            <textarea
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              rows={8}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-2xl text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              placeholder="Escribe aquí el mensaje que quieres enviar..."
            />

            <div className="bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-2xl p-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-stone-500 block mb-1">
                Vista previa (ejemplo con "Carlos")
              </span>
              <p className="text-xs text-slate-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                {(draftMessage || '').replace(/\{nombre\}/gi, 'Carlos')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleResetMessage}
                className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-600 dark:text-stone-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Restablecer mensaje original"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMessageModal(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-stone-800 text-slate-700 dark:text-stone-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMessage}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shadow-md shadow-amber-500/20"
              >
                Guardar mensaje
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
