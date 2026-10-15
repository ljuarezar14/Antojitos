import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  Delete, 
  Flame, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sun,
  Moon,
  UserPlus,
  Users
} from 'lucide-react';

export const LoginView = () => {
  const { users, login, createFirstAdmin, theme, toggleTheme, settings } = useApp();

  const [selectedUser, setSelectedUser] = useState(users[0] || null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [ownerName, setOwnerName] = useState('Miriam');

  // If selectedUser is no longer in users (e.g. deleted), reset
  const activeUser = users.find(u => u.id === selectedUser?.id) || users[0] || null;

  const handleNumClick = (num) => {
    if (!activeUser) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 4) {
        attemptLogin(activeUser.id, newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const attemptLogin = (userId, pinToTest) => {
    const result = login(userId, pinToTest);
    if (!result.success) {
      setErrorMsg(result.message);
      setPin('');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-stone-950 text-white' 
        : 'bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 text-slate-900'
    }`}>
      
      {/* Decorative Warm Glows */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
        theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-400/30'
      }`} />
      <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
        theme === 'dark' ? 'bg-amber-600/10' : 'bg-orange-300/30'
      }`} />

      {/* Top right Theme Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-2xl border transition-all shadow-sm ${
            theme === 'dark'
              ? 'bg-stone-900 border-stone-800 text-amber-300 hover:bg-stone-800'
              : 'bg-white border-amber-300 text-amber-600 hover:bg-amber-50'
          }`}
          title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-amber-600" />
          )}
        </button>
      </div>

      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative z-10 border transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-stone-900 border-stone-800 shadow-amber-950/30'
          : 'bg-white border-amber-200 shadow-xl'
      }`}>
        
        {/* Top Banner with Official Logo */}
        <div className={`p-6 text-center border-b transition-colors ${
          theme === 'dark'
            ? 'bg-stone-950 border-amber-500/20'
            : 'bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border-amber-400/30 text-white'
        }`}>
          {/* Miriam's Official Logo */}
          <div className="flex justify-center mb-2">
            <img 
              src={settings?.logo || '/logo.png'} 
              alt={settings?.businessName || 'Antojitos con Miriam'} 
              className="h-20 sm:h-24 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform"
            />
          </div>

          <p className="text-amber-300 text-xs font-bold tracking-wide">
            {settings?.businessSubtitle || 'Gestión de Pedidos, Clientes & Caja Diaria'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {users.length === 0 && (
            <form onSubmit={event => {
              event.preventDefault();
              if (!createFirstAdmin(ownerName, pin)) setErrorMsg('Ingresa un nombre y un PIN de 4 números.');
            }} className="space-y-3">
              <h1 className="text-lg font-black">Configurar administradora</h1>
              <p className="text-sm">Crea el primer acceso para esta base de datos.</p>
              <input className="w-full rounded-xl border p-3 text-slate-900" value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nombre" required />
              <input className="w-full rounded-xl border p-3 text-slate-900" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="PIN de 4 números" required />
              {errorMsg && <p role="alert" className="text-red-500 text-sm">{errorMsg}</p>}
              <button className="w-full rounded-xl bg-amber-500 p-3 font-bold text-stone-950" type="submit">Crear administradora</button>
            </form>
          )}
          {users.length > 0 && <>
          
          {/* User Profile Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-amber-500 dark:text-amber-400">
                Selecciona tu usuario:
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {users.map(u => {
                const isSelected = activeUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setErrorMsg('');
                    }}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 relative ${
                      isSelected
                        ? theme === 'dark'
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40 text-amber-200'
                          : 'bg-amber-100 border-amber-500 ring-2 ring-amber-400/30 text-stone-900 shadow-sm'
                        : theme === 'dark'
                          ? 'bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl">{u.avatar || '🧑‍🍳'}</span>
                    <span className="font-black text-xs leading-tight">
                      {u.name}
                    </span>
                    <span className={`text-[10px] font-semibold capitalize ${
                      isSelected ? 'text-amber-600 dark:text-amber-300 font-bold' : 'text-slate-400 dark:text-stone-400'
                    }`}>
                      {u.role === 'admin' ? 'Dueña (Admin)' : 'Ayudante / Mozo'}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input Display */}
          <div className="text-center space-y-2">
            <span className={`text-xs font-bold ${
              theme === 'dark' ? 'text-stone-300' : 'text-slate-700'
            }`}>
              Ingresa el PIN de 4 dígitos:
            </span>

            {/* PIN Dots */}
            <div className="flex justify-center items-center gap-3 py-1">
              {[0, 1, 2, 3].map(idx => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? 'bg-amber-500 scale-125 shadow-md shadow-amber-500/50'
                        : theme === 'dark'
                          ? 'bg-stone-800 border border-stone-700'
                          : 'bg-slate-200 border border-slate-300'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <div className="text-xs text-red-500 dark:text-red-400 font-bold bg-red-100/80 dark:bg-red-950/60 p-2 rounded-xl border border-red-300 dark:border-red-800 flex items-center justify-center gap-1.5 animate-shake">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Touch-Friendly Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num.toString())}
                className={`h-14 rounded-2xl border text-xl font-black flex items-center justify-center shadow-xs transition-colors active:scale-95 ${
                  theme === 'dark'
                    ? 'bg-stone-800 hover:bg-stone-700 active:bg-amber-500 active:text-stone-950 border-stone-700 text-white'
                    : 'bg-slate-50 hover:bg-amber-50 active:bg-amber-500 active:text-stone-950 border-slate-200 text-slate-800'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className={`h-14 rounded-2xl border text-xs font-black flex items-center justify-center transition-colors active:scale-95 ${
                theme === 'dark'
                  ? 'bg-stone-800/60 hover:bg-stone-700 border-stone-700 text-stone-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
            >
              Borrar
            </button>

            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className={`h-14 rounded-2xl border text-xl font-black flex items-center justify-center shadow-xs transition-colors active:scale-95 ${
                theme === 'dark'
                  ? 'bg-stone-800 hover:bg-stone-700 active:bg-amber-500 active:text-stone-950 border-stone-700 text-white'
                  : 'bg-slate-50 hover:bg-amber-50 active:bg-amber-500 active:text-stone-950 border-slate-200 text-slate-800'
              }`}
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className={`h-14 rounded-2xl border flex items-center justify-center transition-colors active:scale-95 ${
                theme === 'dark'
                  ? 'bg-stone-800/60 hover:bg-stone-700 border-stone-700 text-stone-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
              }`}
              title="Borrar dígito"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
          </>}
        </div>

      </div>
    </div>
  );
};
