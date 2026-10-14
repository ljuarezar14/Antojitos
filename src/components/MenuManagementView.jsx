import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  RotateCcw, 
  Utensils, 
  Sparkles
} from 'lucide-react';

const EMOJI_OPTIONS = ['🍔', '🍗', '🍟', '🍲', '🥓', '🍳', '🍷', '🥤', '🌶️', '🧀'];

export const MenuManagementView = () => {
  const { 
    menu, 
    toggleProductAvailability, 
    updateProduct, 
    addProduct, 
    deleteProduct, 
    resetMenuToDefault,
    cremas,
    addCrema,
    updateCrema,
    deleteCrema,
    resetCremasToDefault,
    categories,
    resetCategoriesToDefault
  } = useApp();

  // Only real dish categories here (extras are managed in their own segment)
  const PLATO_CATEGORIES = categories.filter(c => c.id !== 'extras');

  const [segment, setSegment] = useState('platos'); // 'platos' | 'adiciones' | 'cremas'
  const [selectedCat, setSelectedCat] = useState('todos');

  // Product form state
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState(PLATO_CATEGORIES[0]?.id || 'comidas');
  const [newDesc, setNewDesc] = useState('');
  const [newEmoji, setNewEmoji] = useState('🍔');

  // Crema form state (used for both create and edit)
  const [editingCrema, setEditingCrema] = useState(null);

  const platos = menu.filter(p => p.category !== 'extras');
  const adiciones = menu.filter(p => p.category === 'extras');
  const platosFiltered = platos.filter(p => selectedCat === 'todos' || p.category === selectedCat);

  const segmentMeta = {
    platos: { label: 'Platos', count: platos.length, hint: 'Comidas, frituras y bebidas con sus precios.' },
    adiciones: { label: 'Adiciones', count: adiciones.length, hint: 'Extras que se suman a un plato (huevo, papas extra...).' },
    cremas: { label: 'Cremas', count: cremas.length, hint: 'Salsas y cremas que ofrece la carretilla.' }
  };

  // ---- Product handlers ----
  const openAddProduct = () => {
    setNewName('');
    setNewPrice('');
    setNewDesc('');
    if (segment === 'adiciones') {
      setNewCategory('extras');
      setNewEmoji('🍟');
    } else {
      setNewCategory(selectedCat !== 'todos' ? selectedCat : 'comidas');
      setNewEmoji('🍔');
    }
    setIsAddingProduct(true);
  };

  const handleCreateProduct = (e) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;
    addProduct({
      name: newName.trim(),
      price: parseFloat(newPrice) || 0,
      category: segment === 'adiciones' ? 'extras' : newCategory,
      description: newDesc.trim(),
      emoji: newEmoji || '🍽️'
    });
    setIsAddingProduct(false);
    setNewName('');
    setNewPrice('');
    setNewDesc('');
  };

  const handleSaveEditProduct = (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct({
      ...editingProduct,
      price: parseFloat(editingProduct.price) || 0
    });
    setEditingProduct(null);
  };

  // ---- Crema handlers ----
  const openAddCrema = () => setEditingCrema({ id: null, name: '', short: '' });

  const handleSaveCrema = (e) => {
    e.preventDefault();
    if (!editingCrema || !editingCrema.name.trim()) return;
    const payload = {
      name: editingCrema.name.trim(),
      short: (editingCrema.short || editingCrema.name).trim().slice(0, 12)
    };
    if (editingCrema.id) {
      updateCrema(editingCrema.id, payload);
    } else {
      addCrema(payload);
    }
    setEditingCrema(null);
  };

  const handleHeaderAdd = () => {
    if (segment === 'cremas') openAddCrema();
    else openAddProduct();
  };

  const handleReset = () => {
    if (segment === 'cremas') {
      if (confirm('¿Restablecer las cremas originales?')) resetCremasToDefault();
    } else {
      if (confirm('¿Restablecer el menú original de Antojitos Miriam?')) {
        resetMenuToDefault();
        resetCategoriesToDefault();
      }
    }
  };

  const listToShow = segment === 'adiciones' ? adiciones : platosFiltered;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 md:pb-8 space-y-5">
      
      {/* Header */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black text-amber-500 uppercase tracking-wider block">
            Administración de Carretilla
          </span>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-stone-100">
            Menú, Adiciones y Cremas
          </h2>
          <p className="text-xs text-slate-500 dark:text-stone-400">
            Edita tus platos, precios, adiciones y cremas. Todo se guarda en tu celular.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleHeaderAdd}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>
              {segment === 'cremas' ? 'Agregar Crema' : segment === 'adiciones' ? 'Agregar Adición' : 'Agregar Plato'}
            </span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2.5 bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-600 dark:text-stone-300 rounded-xl text-xs font-bold transition-colors"
            title="Restablecer valores de fábrica"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="bg-white dark:bg-stone-900 p-2 rounded-2xl shadow-sm border-2 border-amber-200/90 dark:border-stone-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'platos', label: 'Platos', icon: Utensils },
          { id: 'adiciones', label: 'Adiciones', icon: Plus },
          { id: 'cremas', label: 'Cremas', icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = segment === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSegment(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'text-stone-700 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                isActive ? 'bg-stone-950/20 text-stone-900' : 'bg-slate-100 dark:bg-stone-800 text-slate-500 dark:text-stone-400'
              }`}>
                {segmentMeta[tab.id].count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 dark:text-stone-400 -mt-2 px-1">
        {segmentMeta[segment].hint}
      </p>

      {/* Category Pills (only for Platos) */}
      {segment === 'platos' && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PLATO_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
                selectedCat === cat.id
                  ? 'bg-amber-500 text-stone-950 shadow-sm border border-amber-300'
                  : 'bg-white dark:bg-stone-900 text-slate-700 dark:text-stone-300 hover:bg-amber-50 dark:hover:bg-stone-800 border border-amber-200/90 dark:border-stone-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Products Grid (Platos & Adiciones) */}
      {segment !== 'cremas' && (
        listToShow.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-10 text-center border-2 border-dashed border-amber-200 dark:border-stone-800">
            <p className="text-3xl mb-2">{segment === 'adiciones' ? '🍳' : '🍽️'}</p>
            <p className="font-bold text-slate-700 dark:text-stone-300 text-sm">
              No hay {segment === 'adiciones' ? 'adiciones' : 'platos'} en esta lista.
            </p>
            <p className="text-xs text-slate-400 dark:text-stone-500 mt-1">Usa el botón de arriba para agregar uno.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {listToShow.map(product => (
              <div
                key={product.id}
                className={`bg-white dark:bg-stone-900 rounded-2xl p-4 border-2 transition-all flex flex-col justify-between ${
                  product.available
                    ? 'border-amber-200/90 dark:border-stone-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md'
                    : 'border-amber-200/60 dark:border-stone-800 bg-slate-50/70 dark:bg-stone-950/60 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product.emoji || '🍽️'}</span>
                      <div>
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-stone-100 leading-tight">
                          {product.name}
                        </h3>
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                          S/ {product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleProductAvailability(product.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap ${
                        product.available
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 hover:bg-red-200'
                      }`}
                    >
                      {product.available ? '🟢 Disponible' : '🔴 Agotado'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-stone-400 line-clamp-2">
                    {product.description || 'Sin descripción'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-stone-500 capitalize">
                    {segment === 'adiciones' ? 'Adición' : `Categoría: ${product.category}`}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingProduct(product)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 text-slate-700 dark:text-stone-300 rounded-lg font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${product.name}"?`)) {
                          deleteProduct(product.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Cremas List */}
      {segment === 'cremas' && (
        cremas.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-10 text-center border-2 border-dashed border-amber-200 dark:border-stone-800">
            <p className="text-3xl mb-2">🌶️</p>
            <p className="font-bold text-slate-700 dark:text-stone-300 text-sm">Aún no tienes cremas registradas.</p>
            <p className="text-xs text-slate-400 dark:text-stone-500 mt-1">Agrega tus salsas con el botón de arriba.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cremas.map(crema => (
              <div
                key={crema.id}
                className="bg-white dark:bg-stone-900 rounded-2xl p-3.5 border-2 border-amber-200/90 dark:border-stone-800 shadow-sm hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-base border border-amber-300/50">
                    🌶️
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                      {crema.name}
                    </p>
                    <span className="text-[10px] bg-slate-100 dark:bg-stone-800 text-slate-500 dark:text-stone-400 px-1.5 py-0.2 rounded border border-slate-200 dark:border-stone-700 font-bold">
                      {crema.short}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingCrema({ ...crema })}
                    className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-lg"
                    title="Editar crema"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la crema "${crema.name}"?`)) {
                        deleteCrema(crema.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                    title="Eliminar crema"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add / Edit Product Modal */}
      {(isAddingProduct || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-amber-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {editingProduct
                  ? 'Editar Plato'
                  : segment === 'adiciones'
                    ? 'Nueva Adición'
                    : 'Nuevo Plato o Bebida'}
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddingProduct(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingProduct ? handleSaveEditProduct : handleCreateProduct} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">Emoji / Ícono</label>
                <div className="flex gap-2 flex-wrap">
                  {EMOJI_OPTIONS.map(emoji => {
                    const currentEmoji = editingProduct ? editingProduct.emoji : newEmoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => editingProduct
                          ? setEditingProduct({ ...editingProduct, emoji })
                          : setNewEmoji(emoji)}
                        className={`text-xl p-1.5 rounded-lg border ${
                          currentEmoji === emoji
                            ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500'
                            : 'bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-stone-700'
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder={segment === 'adiciones' ? 'ej. Queso adicional, Huevo...' : 'ej. Hamburguesa Royal...'}
                  value={editingProduct ? editingProduct.name : newName}
                  onChange={(e) => editingProduct
                    ? setEditingProduct({ ...editingProduct, name: e.target.value })
                    : setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="6.00"
                    value={editingProduct ? editingProduct.price : newPrice}
                    onChange={(e) => editingProduct
                      ? setEditingProduct({ ...editingProduct, price: e.target.value })
                      : setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-black text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {segment !== 'adiciones' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">Categoría</label>
                    <select
                      value={editingProduct ? editingProduct.category : newCategory}
                      onChange={(e) => editingProduct
                        ? setEditingProduct({ ...editingProduct, category: e.target.value })
                        : setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold"
                    >
                      {PLATO_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">Descripción corta</label>
                <input
                  type="text"
                  placeholder="ej. Con papas fritas y ensalada"
                  value={editingProduct ? (editingProduct.description || '') : newDesc}
                  onChange={(e) => editingProduct
                    ? setEditingProduct({ ...editingProduct, description: e.target.value })
                    : setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAddingProduct(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-stone-800 text-slate-700 dark:text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs"
                >
                  {editingProduct ? 'Guardar Cambios' : segment === 'adiciones' ? 'Guardar Adición' : 'Guardar Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Crema Modal */}
      {editingCrema && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-amber-200 dark:border-stone-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-300/50">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {editingCrema.id ? 'Editar Crema' : 'Nueva Crema'}
                </h3>
              </div>
              <button
                onClick={() => setEditingCrema(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCrema} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">Nombre de la crema</label>
                <input
                  type="text"
                  placeholder="ej. Mayonesa, Ají Pollero..."
                  value={editingCrema.name}
                  onChange={(e) => setEditingCrema({ ...editingCrema, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-stone-400 block mb-1">
                  Nombre corto (para el botón)
                </label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="ej. Mayo"
                  value={editingCrema.short}
                  onChange={(e) => setEditingCrema({ ...editingCrema, short: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-400 dark:text-stone-500 mt-1">
                  Así se verá en los botones al tomar el pedido.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCrema(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-stone-800 text-slate-700 dark:text-stone-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs"
                >
                  {editingCrema.id ? 'Guardar Cambios' : 'Agregar Crema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
