import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';

export const UsersManagementModal = ({ onClose, inline = false }) => {
  const { users, addUser, updateUser, deleteUser, currentUser } = useApp();

  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('ayudante');
  const [newPin, setNewPin] = useState('');
  const [newAvatar, setNewAvatar] = useState('🧑‍🍳');
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Ingresa un nombre para el usuario.');
      return;
    }
    if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
      setErrorMsg('El PIN debe tener exactamente 4 números.');
      return;
    }

    addUser({
      name: newName,
      role: newRole,
      pin: newPin,
      avatar: newAvatar
    });

    setIsCreating(false);
    setNewName('');
    setNewRole('ayudante');
    setNewPin('');
    setNewAvatar('🧑‍🍳');
    setErrorMsg('');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingUser) return;
    // Blank keeps the current PIN; PINs are stored hashed and cannot be shown.
    if (editingUser.pin && !/^[0-9]{4}$/.test(editingUser.pin)) {
      alert('El PIN debe ser de 4 dígitos.');
      return;
    }
    updateUser(editingUser.id, editingUser);
    setEditingUser(null);
  };

  const handleDelete = (userId, userName) => {
    if (confirm(`¿Estás segura de eliminar a "${userName}"?`)) {
      const res = deleteUser(userId);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  const avatarOptions = ['👩‍🍳', '🧑‍🍳', '👨‍🍳', '🍔', '🍗', '🍟', '⭐', '🔥'];

  return (
    <div className={inline ? '' : 'fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in'}>
      <div className={`bg-white dark:bg-stone-900 rounded-3xl w-full shadow-2xl border border-slate-200 dark:border-stone-800 overflow-hidden flex flex-col ${inline ? '' : 'max-w-md max-h-[90vh]'}`}>
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-black text-base text-white">Gestión de Usuarios</h3>
              <p className="text-[11px] text-amber-300">Crea o cambia las claves PIN de tu carretilla</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Top action: Add new user */}
          {!isCreating && (
            <button
              onClick={() => {
                setIsCreating(true);
                setErrorMsg('');
              }}
              className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Crear Nuevo Usuario / Ayudante</span>
            </button>
          )}

          {/* Create User Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 bg-slate-50 dark:bg-stone-800 rounded-2xl border border-amber-400/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Nuevo Usuario
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-stone-300"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="text-[11px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 p-2 rounded-lg font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Avatar Picker */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-stone-400 block mb-1">Ícono:</label>
                <div className="flex gap-1.5 flex-wrap">
                  {avatarOptions.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewAvatar(emoji)}
                      className={`text-xl p-1.5 rounded-xl border ${newAvatar === emoji ? 'bg-amber-500/20 border-amber-500 scale-110' : 'bg-white dark:bg-stone-900 border-slate-200 dark:border-stone-700'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-stone-400 block mb-1">Nombre:</label>
                <input
                  type="text"
                  placeholder="ej. Lucía (Hija), Pedro Ayudante..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-stone-400 block mb-1">Rol:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs font-semibold"
                  >
                    <option value="ayudante">Ayudante / Mozo</option>
                    <option value="admin">Dueña / Administradora</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-stone-400 block mb-1">PIN (4 números):</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="ej. 5555"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 text-slate-900 dark:text-white rounded-xl text-xs font-black tracking-widest text-center"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl"
                >
                  Guardar y Crear
                </button>
              </div>
            </form>
          )}

          {/* Users List */}
          <div className="space-y-2">
            <span className="text-[11px] font-black text-slate-400 dark:text-stone-500 uppercase tracking-wider block">
              Usuarios Registrados ({users.length})
            </span>

            {users.map(u => {
              return (
                <div
                  key={u.id}
                  className="p-3 bg-slate-50 dark:bg-stone-800 rounded-2xl border border-amber-200 dark:border-stone-700 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl">{u.avatar || '🧑‍🍳'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {u.name}
                        </h4>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black ${u.role === 'admin' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300' : 'bg-slate-200 dark:bg-stone-700 text-slate-700 dark:text-stone-300'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Ayudante'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-stone-400">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        <span className="font-mono font-bold">PIN: ••••</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...u, pin: '' })}
                      className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-stone-700 rounded-lg"
                      title="Editar usuario o cambiar PIN"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {users.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="p-4 bg-slate-100 dark:bg-stone-850 border-t border-slate-200 dark:border-stone-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-xs text-slate-800 dark:text-stone-200">
                Editar a: {editingUser.name}
              </span>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-xs text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-stone-400 block">Nombre:</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-lg text-xs font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 dark:text-stone-400 block">Nuevo PIN (vacío = no cambiar):</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={editingUser.pin}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="••••"
                    className="w-full px-2 py-1.5 bg-white dark:bg-stone-900 border border-slate-200 dark:border-stone-700 rounded-lg text-xs font-black text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-200 dark:bg-stone-700 text-xs font-bold text-slate-700 dark:text-stone-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-black text-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
