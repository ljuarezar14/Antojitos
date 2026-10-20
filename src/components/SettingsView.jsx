import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { UsersManagementModal } from './UsersManagementModal';
import {
  Home, 
  Store,
  QrCode,
  CreditCard,
  Tags,
  Receipt,
  Download,
  Upload,
  Image as ImageIcon,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Check,
  X,
  ShieldAlert,
  Coins,
  Smartphone,
  Banknote,
} from 'lucide-react';

const readImage = (file, cb) => {
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
};

const BACKUP_PREFIX = 'antojitos_miriam_';

// Images are stored apart from the rest of the data so they are not sent with every save.
// Returns the URL the settings keep; the version makes browsers fetch a replaced image.
const uploadImage = async (name, dataUrl) => {
  const response = await fetch(`/api/files/${name}`, { method: 'PUT', body: dataUrl });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || 'No se pudo subir la imagen');
  }
  return `/api/files/${name}?v=${Date.now()}`;
};

const removeImage = async (name) => {
  const response = await fetch(`/api/files/${name}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('No se pudo quitar la imagen');
};


const PAYMENT_OPTIONS = [
  { key: 'efectivo', label: 'Efectivo', icon: Coins },
  { key: 'yape', label: 'Yape', icon: Smartphone },
  { key: 'plin', label: 'Plin', icon: Smartphone },
  { key: 'tarjeta', label: 'Tarjeta', icon: Banknote },
];

export const SettingsView = () => {
  const {
    currentUser,
    settings,
    updateSettings,
    resetSettings,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetCategoriesToDefault,
    pendingChanges,
  } = useApp();

  // Hooks declared unconditionally to keep hook order stable
  const [segment, setSegment] = useState('negocio');
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [importMsg, setImportMsg] = useState('');
  const [qrError, setQrError] = useState('');
  const [logoError, setLogoError] = useState('');
  const [backups, setBackups] = useState(null);
  const [backupsError, setBackupsError] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const logoInputRef = useRef(null);
  const qrInputRef = useRef(null);
  const importInputRef = useRef(null);

  // ---- Access control: only the owner/admin (Miriam) ----
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white dark:bg-stone-900 rounded-3xl border-2 border-amber-200 dark:border-stone-800 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="font-black text-lg text-slate-900 dark:text-white">Acceso restringido</h2>
        <p className="text-sm text-slate-500 dark:text-stone-400">
          Solo la administradora (Miriam) puede ver la configuración del negocio.
        </p>
      </div>
    );
  }

  const paymentMethods = settings.paymentMethods || { efectivo: true, yape: true, plin: true, tarjeta: true };
  const realCategories = categories.filter(c => c.id !== 'todos');

  const segments = [
    { id: 'negocio', label: 'Negocio', icon: Store },
    { id: 'yape', label: 'Yape', icon: QrCode },
    { id: 'pagos', label: 'Pagos', icon: CreditCard },
    { id: 'categorias', label: 'Categorías', icon: Tags },
    { id: 'ticket', label: 'Ticket & Caja', icon: Receipt },
    { id: 'usuarios', label: 'Usuarios', icon: UsersManagementModal ? undefined : undefined },
    { id: 'respaldo', label: 'Respaldo', icon: Download },
  ];

  const handleImageUpload = (name, key, setError) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    readImage(file, async (dataUrl) => {
      try {
        updateSettings({ [key]: await uploadImage(name, dataUrl) });
      } catch (error) {
        setError(error.message);
      }
    });
    e.target.value = '';
  };
  const handleLogoUpload = handleImageUpload('logo', 'logo', setLogoError);
  const handleQrUpload = handleImageUpload('yape-qr', 'yapeQr', setQrError);

  const handleImageRemove = (name, key, setError) => async () => {
    setError('');
    try {
      await removeImage(name);
      updateSettings({ [key]: null });
    } catch (error) {
      setError(error.message);
    }
  };
  const handleLogoRemove = handleImageRemove('logo', 'logo', setLogoError);
  const handleQrRemove = handleImageRemove('yape-qr', 'yapeQr', setQrError);

  const togglePayment = (key) => {
    updateSettings({ paymentMethods: { ...paymentMethods, [key]: !paymentMethods[key] } });
  };

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    addCategory({ name });
    setNewCatName('');
  };

  const handleExport = () => {
    if (pendingChanges) {
      setImportMsg('Hay cambios pendientes de enviar. Espera a tener conexión y vuelve a intentarlo.');
      return;
    }
    // The server builds the full copy: this device only holds the recent orders.
    const a = document.createElement('a');
    a.href = '/api/backups/now';
    a.download = '';
    a.click();
  };

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/backups');
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo leer la lista de respaldos');
      setBackups(body.backups);
      setBackupsError('');
    } catch (error) {
      setBackupsError(error.message);
    }
  };

  useEffect(() => {
    if (segment === 'respaldo') loadBackups();
  }, [segment]);

  const handleBackupNow = async () => {
    setCreatingBackup(true);
    try {
      const response = await fetch('/api/backups', { method: 'POST' });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'No se pudo crear el respaldo');
      await loadBackups();
    } catch (error) {
      setBackupsError(error.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const data = parsed.data || parsed;
        const keys = Object.keys(data).filter((k) => k.startsWith(BACKUP_PREFIX));
        if (keys.length === 0) {
          setImportMsg('El archivo no contiene datos válidos de Antojitos.');
          return;
        }
        const read = (suffix, fallback) => {
          try { return JSON.parse(data[`${BACKUP_PREFIX}${suffix}`]) ?? fallback; } catch { return fallback; }
        };
        const restoredSettings = read('settings', {});
        // Server backups carry the images apart; older ones inside the settings.
        for (const [key, name] of [['yapeQr', 'yape-qr'], ['logo', 'logo']]) {
          const image = parsed.files?.[name] || restoredSettings[key];
          if (String(image || '').startsWith('data:')) {
            restoredSettings[key] = await uploadImage(name, image);
          }
        }
        const collections = {
          users: read('users_list', []),
          customers: read('customers', []),
          categories: read('categories', []),
          cremas: read('cremas', []),
          menu: read('menu', []),
          expenses: read('expenses', []),
          config: [
            { id: 'settings', value: restoredSettings },
            { id: 'greeting', value: data[`${BACKUP_PREFIX}greeting`] || '' }
          ]
        };
        const response = await fetch('/api/data/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collections })
        });
        if (!response.ok) throw new Error('No se pudo guardar el respaldo en la base de datos');
        const ordersResponse = await fetch('/api/orders/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: read('orders', []) })
        });
        if (!ordersResponse.ok) throw new Error('No se pudieron guardar los pedidos del respaldo');
        // This browser's copies are older than the restored data; it reloads from the server.
        Object.keys(localStorage)
          .filter((k) => k.startsWith(BACKUP_PREFIX) && !['user', 'theme'].includes(k.slice(BACKUP_PREFIX.length)))
          .forEach((k) => localStorage.removeItem(k));
        window.location.reload();
      } catch (error) {
        setImportMsg(error.message || 'No se pudo leer el archivo. Verifica que sea un respaldo válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 rounded-3xl p-5 border border-amber-500/20 text-white flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
          ⚙️
        </div>
        <div>
          <h1 className="font-black text-lg sm:text-xl">Administración</h1>
          <p className="text-xs text-amber-300">
            Configuración del negocio · {currentUser.name}
          </p>
        </div>
      </div>

      {/* Segment tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {segments.map((seg) => {
          const Icon = seg.icon;
          const isActive = segment === seg.id;
          return (
            <button
              key={seg.id}
              onClick={() => setSegment(seg.id)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                isActive
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-slate-700 dark:text-stone-300 border-amber-200 dark:border-stone-800 hover:bg-amber-50 dark:hover:bg-stone-800'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{seg.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- NEGOCIO ---------------- */}
      {segment === 'negocio' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
          <SectionTitle icon={Store} title="Datos del Negocio" hint="Se usan en el ticket y los mensajes." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del negocio">
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => updateSettings({ businessName: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Subtítulo (categorías del menú)">
              <input
                type="text"
                value={settings.businessSubtitle}
                onChange={(e) => updateSettings({ businessSubtitle: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="WhatsApp del local">
              <input
                type="text"
                placeholder="ej. 987654321"
                value={settings.businessWhatsapp}
                onChange={(e) => updateSettings({ businessWhatsapp: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Horario">
              <input
                type="text"
                placeholder="ej. 6pm - 11pm"
                value={settings.businessSchedule}
                onChange={(e) => updateSettings({ businessSchedule: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Dirección / referencia" full>
              <input
                type="text"
                placeholder="ej. Av. Los Álamos, frente al parque"
                value={settings.businessAddress}
                onChange={(e) => updateSettings({ businessAddress: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Logo */}
          <div className="pt-3 border-t border-slate-100 dark:border-stone-800">
            <Field label="Logo de la carretilla">
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 flex items-center justify-center overflow-hidden">
                  <img
                    src={settings.logo || '/logo.png'}
                    alt="Logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir logo
                  </button>
                  {settings.logo && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Quitar (usar original)
                    </button>
                  )}
                  {logoError && <p role="alert" className="text-[11px] font-bold text-red-600">{logoError}</p>}
                </div>
              </div>
            </Field>
          </div>

          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />

          <ResetRow label="Restablecer datos del negocio" onClick={resetSettings} />
        </div>
      )}
      

      {/* ---------------- YAPE ---------------- */}
      {segment === 'yape' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
          <SectionTitle icon={QrCode} title="QR de Yape" hint="Se mostrará al cliente al cobrar con Yape para que lo escanee." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del titular">
              <input
                type="text"
                placeholder="ej. Miriam"
                value={settings.yapeName}
                onChange={(e) => updateSettings({ yapeName: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Número de Yape">
              <input
                type="text"
                placeholder="ej. 987654321"
                value={settings.yapeNumber}
                onChange={(e) => updateSettings({ yapeNumber: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Imagen del QR">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-40 h-40 rounded-2xl bg-slate-50 dark:bg-stone-800 border-2 border-dashed border-amber-300 dark:border-stone-700 flex items-center justify-center overflow-hidden">
                {settings.yapeQr ? (
                  <img src={settings.yapeQr} alt="QR Yape" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-slate-400 dark:text-stone-500 px-3">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                    <span className="text-[11px] font-bold">Sin QR</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => qrInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> {settings.yapeQr ? 'Cambiar QR' : 'Subir QR'}
                </button>
                {settings.yapeQr && (
                  <button
                    type="button"
                    onClick={handleQrRemove}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-600 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Quitar QR
                  </button>
                )}
                <p className="text-[11px] text-slate-400 dark:text-stone-500 max-w-[180px]">
                  Usa una imagen ligera (menos de ~1 MB).
                </p>
                {qrError && <p role="alert" className="text-[11px] font-bold text-red-600 max-w-[180px]">{qrError}</p>}
              </div>
            </div>
          </Field>

          <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
        </div>
      )}

      {/* ---------------- PAGOS ---------------- */}
      {segment === 'pagos' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
          <SectionTitle icon={CreditCard} title="Métodos de pago" hint="Activa solo los que aceptas; aparecerán al cobrar." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = !!paymentMethods[opt.key];
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => togglePayment(opt.key)}
                  className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                    active
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400'
                      : 'bg-slate-50 dark:bg-stone-800 border-slate-200 dark:border-stone-700 opacity-70'
                  }`}
                >
                  <span className="flex items-center gap-2 font-black text-sm text-slate-800 dark:text-stone-200">
                    <Icon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    {opt.label}
                  </span>
                  <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-stone-600'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-4' : ''}`} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- CATEGORÍAS ---------------- */}
      {segment === 'categorias' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
          <SectionTitle icon={Tags} title="Categorías del menú" hint="Organiza tus platos. 'Extras' se usa para las adiciones." />

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva categoría (ej. Postres 🍮)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          <div className="space-y-2">
            {realCategories.map((cat) => {
              const isReserved = cat.id === 'extras';
              const isEditing = editingCat?.id === cat.id;
              return (
                <div
                  key={cat.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 flex items-center justify-between gap-2"
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editingCat.name}
                        onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                        className="flex-1 px-2 py-1.5 rounded-lg border border-amber-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-sm font-semibold text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => { updateCategory(cat.id, { name: editingCat.name.trim() || cat.name }); setEditingCat(null); }}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-stone-700 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCat(null)}
                        className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-stone-700 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-black text-sm text-slate-800 dark:text-stone-200">
                        {cat.name} {isReserved && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">(adiciones)</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCat({ id: cat.id, name: cat.name })}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-stone-700 rounded-lg"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {!isReserved && (
                          <button
                            type="button"
                            onClick={() => { if (confirm(`¿Eliminar la categoría "${cat.name}"? Sus platos pasarán a la primera categoría.`)) deleteCategory(cat.id); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <ResetRow label="Restablecer categorías originales" onClick={resetCategoriesToDefault} />
        </div>
      )}

      {/* ---------------- TICKET & CAJA ---------------- */}
      {segment === 'ticket' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
          <SectionTitle icon={Receipt} title="Ticket & Caja" hint="Mensaje del ticket, meta del día y fondo inicial." />

          <Field label="Mensaje de agradecimiento (ticket)">
            <textarea
              rows={2}
              value={settings.thankYouMessage}
              onChange={(e) => updateSettings({ thankYouMessage: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Meta diaria de ventas (S/)">
              <input
                type="number"
                min="0"
                step="10"
                value={settings.dailyGoal}
                onChange={(e) => updateSettings({ dailyGoal: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </Field>
            <Field label="Fondo de caja inicial (S/)">
              <input
                type="number"
                min="0"
                step="10"
                value={settings.initialCash}
                onChange={(e) => updateSettings({ initialCash: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      )}

      {/* ---------------- USUARIOS ---------------- */}
      {segment === 'usuarios' && (
        <div className="space-y-3">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 rounded-2xl p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Solo tú (administradora) ves esta sección. Aquí creas usuarios, ayudantes y cambias sus PIN.
          </div>
          <UsersManagementModal inline />
        </div>
      )}

      {/* ---------------- RESPALDO ---------------- */}
      {segment === 'respaldo' && (
        <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 border-2 border-amber-200/90 dark:border-stone-800 space-y-4">
          <SectionTitle icon={Download} title="Respaldo y restauración" hint="Guarda tus datos en un archivo por si cambias de celular o navegador." />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExport}
              className="p-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-sm flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Descargar respaldo
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="p-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-black text-sm flex items-center justify-center gap-2 border border-stone-700"
            >
              <Upload className="w-4 h-4" /> Restaurar respaldo
            </button>
          </div>

          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />

          {importMsg && (
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-500/40">
              {importMsg}
            </p>
          )}

          <p className="text-[11px] text-slate-400 dark:text-stone-500">
            Incluye menú, cremas, clientes, pedidos, gastos, usuarios y toda la configuración.
          </p>

          <div className="border-t border-slate-200 dark:border-stone-800 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">Respaldos automáticos</h4>
                <p className="text-[11px] text-slate-500 dark:text-stone-400">Se guarda uno cada madrugada (3:00 a. m.) y se conservan 90 días.</p>
              </div>
              <button
                type="button"
                onClick={handleBackupNow}
                disabled={creatingBackup}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs disabled:opacity-50"
              >
                {creatingBackup ? 'Creando…' : 'Crear respaldo ahora'}
              </button>
            </div>
            {backupsError && <p role="alert" className="text-xs font-bold text-red-600">{backupsError}</p>}
            {!backupsError && !backups && <p className="text-xs text-slate-500 dark:text-stone-400">Cargando respaldos…</p>}
            {!backupsError && backups?.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-stone-400">Todavía no hay respaldos automáticos.</p>
            )}
            <ul className="divide-y divide-slate-100 dark:divide-stone-800">
              {(backups || []).map((backup) => (
                <li key={backup.key} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-700 dark:text-stone-300">
                    <span className="font-bold">{new Date(backup.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {' · '}{backup.orders} pedidos · {Math.max(1, Math.round((backup.bytes || 0) / 1024))} KB
                  </span>
                  <a
                    href={`/api/backups/${encodeURIComponent(backup.key)}`}
                    download
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-stone-800 font-bold text-slate-700 dark:text-stone-200 hover:bg-amber-100"
                  >
                    Descargar
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

const inputClass =
  'w-full px-3 py-2 bg-slate-50 dark:bg-stone-800 border border-amber-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500';

const SectionTitle = ({ icon: Icon, title, hint }) => (
  <div className="flex items-start gap-2">
    {Icon && <Icon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
    <div>
      <h2 className="font-black text-base text-slate-900 dark:text-white">{title}</h2>
      {hint && <p className="text-[11px] text-slate-400 dark:text-stone-500">{hint}</p>}
    </div>
  </div>
);

const Field = ({ label, children, full = false }) => (
  <div className={full ? 'sm:col-span-2' : ''}>
    <label className="text-[11px] font-bold text-slate-600 dark:text-stone-400 block mb-1">{label}</label>
    {children}
  </div>
);

const ResetRow = ({ label, onClick }) => (
  <div className="pt-3 border-t border-slate-100 dark:border-stone-800">
    <button
      type="button"
      onClick={() => { if (confirm(`${label}?`)) onClick(); }}
      className="text-xs font-bold text-slate-500 dark:text-stone-400 hover:text-red-600 flex items-center gap-1.5"
    >
      <RotateCcw className="w-3.5 h-3.5" /> {label}
    </button>
  </div>
);

export default SettingsView;
