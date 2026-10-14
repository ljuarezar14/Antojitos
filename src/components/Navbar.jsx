import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SettingsView } from './SettingsView';
import { 
  ShoppingBag, 
  Clock, 
  DollarSign, 
  Menu as MenuIcon, 
  Volume2, 
  VolumeX, 
  Calendar, 
  Users, 
  LogOut, 
  Sun, 
  Moon,
  UserCog,
  Settings,
  ShieldCheck
} from 'lucide-react';

export const Navbar = () => {
  const { 
    activeTab, 
    setActiveTab, 
    activeOrdersCount, 
    soundEnabled, 
    setSoundEnabled, 
    filterDate, 
    setFilterDate, 
    todayDateStr, 
    currentUser, 
    logout, 
    theme, 
    toggleTheme,
    settings
  } = useApp();

  const [showUsersModal, setShowUsersModal] = useState(false);

  const formatDateFriendly = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-PE', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    } catch {
      return dateStr;
    }
  };

  const navItems = [
    {
      id: 'tomar-pedido',
      label: 'Tomar Pedido',
      icon: ShoppingBag,
      badge: null,
    },
    {
      id: 'pedidos-activos',
      label: 'Pedidos Activos',
      icon: Clock,
      badge: activeOrdersCount > 0 ? activeOrdersCount : null,
    },
    {
      id: 'caja',
      label: 'Caja & Ingresos',
      icon: DollarSign,
      badge: null,
    },
    {
      id: 'clientes',
      label: 'Mis Caseros',
      icon: Users,
      badge: null,
    },
    {
      id: 'menu',
      label: 'Carta & Cremas',
      icon: MenuIcon,
      badge: null,
    },
    ...(currentUser?.role === 'admin' ? [{
      id: 'admin',
      label: 'Admin',
      icon: Settings,
      badge: null,
    }] : [])
  ];

  return (
    <>
      {/* Top Header transforms between Golden Daylight in Light mode and Matte Black in Dark mode */}
      <header className={`sticky top-0 z-30 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-stone-950 text-white shadow-xl border-b border-amber-500/25'
          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 shadow-md border-b border-amber-600/20'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between">
          
          {/* Logo with official image */}
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={settings?.logo || '/logo.png'} 
              alt={settings?.businessName || 'Antojitos con Miriam'} 
              className="h-10 sm:h-12 w-auto object-contain drop-shadow hover:scale-105 transition-transform"
            />
          </div>

          {/* Quick Controls & Date */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            
            {/* Theme Toggle (☀️ / 🌙) with High-Visibility styling */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all border shadow-xs flex items-center gap-1 text-xs font-black ${
                theme === 'dark'
                  ? 'bg-stone-900 border-stone-800 text-amber-400 hover:bg-stone-800'
                  : 'bg-white border-amber-300 text-stone-900 hover:bg-amber-50 shadow-sm'
              }`}
              title={theme === 'dark' ? 'Cambiar a Modo Claro (Día)' : 'Cambiar a Modo Oscuro (Noche)'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-stone-900" />
                  <span className="hidden md:inline">Oscuro</span>
                </>
              )}
            </button>

            {/* Date Pill */}
            <div className={`hidden sm:flex text-xs px-2.5 py-1.5 rounded-xl items-center gap-1.5 border shadow-inner ${
              theme === 'dark'
                ? 'bg-stone-900 text-stone-200 border-stone-800'
                : 'bg-white/80 text-stone-900 border-amber-300'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span className="capitalize font-black">{formatDateFriendly(filterDate)}</span>
              {filterDate !== todayDateStr && (
                <button
                  onClick={() => setFilterDate(todayDateStr)}
                  className="ml-1 text-[10px] bg-amber-500 text-stone-950 px-1.5 py-0.5 rounded font-black hover:bg-amber-400"
                  title="Volver a Hoy"
                >
                  Hoy
                </button>
              )}
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-colors border ${
                theme === 'dark'
                  ? 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                  : 'bg-white/80 border-amber-300 text-stone-800 hover:bg-white'
              }`}
              title={soundEnabled ? 'Silenciar avisos' : 'Activar avisos de audio'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-stone-400" />
              )}
            </button>

            {/* Users Management Button (only for admin) */}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowUsersModal(true)}
                className={`p-2 rounded-xl transition-colors border flex items-center gap-1 text-xs font-bold ${
                  theme === 'dark'
                    ? 'bg-stone-900 border-stone-800 text-amber-300 hover:bg-stone-800'
                    : 'bg-white/80 border-amber-300 text-stone-900 hover:bg-white'
                }`}
                title="Administrar usuarios y crear nuevos"
              >
                <UserCog className="w-4 h-4 text-amber-500" />
                <span className="hidden xl:inline">Usuarios</span>
              </button>
            )}

            {/* User Profile Pill & Logout */}
            {currentUser && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${
                theme === 'dark'
                  ? 'bg-stone-900 border-stone-800'
                  : 'bg-stone-950 text-white border-stone-900'
              }`}>
                <span className="text-sm leading-none">{currentUser.avatar || '👩‍🍳'}</span>
                <span className="text-xs font-black hidden sm:inline">
                  {currentUser.name}
                </span>
                <button
                  onClick={logout}
                  className="ml-1 p-1 rounded-lg text-stone-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Desktop Navigation Tabs */}
            <nav className={`hidden lg:flex items-center gap-1 p-1 rounded-2xl border ${
              theme === 'dark'
                ? 'bg-stone-900 border-stone-800'
                : 'bg-stone-950 border-stone-900 text-white'
            }`}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                        : 'text-stone-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-4 text-center animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Supports Light and Dark Mode) */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 border-t px-1 py-1 z-40 flex items-center justify-around shadow-2xl safe-area-bottom transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-stone-950 border-stone-800'
          : 'bg-white border-amber-200'
      }`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-500 font-black scale-105'
                  : theme === 'dark'
                    ? 'text-stone-400 hover:text-stone-200 font-medium'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.1 rounded-full min-w-3.5 text-center shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-tight truncate max-w-[65px] text-center font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Users Management Modal */}
      {showUsersModal && (
        <UsersManagementModal onClose={() => setShowUsersModal(false)} />
      )}

      {/* Settings View (Admin only) */}
      {activeTab === 'admin' && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-stone-950">
          <SettingsView />
        </div>
      )}
    </>
  );
};
