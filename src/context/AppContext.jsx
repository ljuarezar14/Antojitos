import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_MENU, DEFAULT_CREMAS, DEFAULT_CATEGORIES } from '../data/defaultMenu';

const AppContext = createContext();

export const DEFAULT_USERS = [
  { id: 'usr-1', name: 'Miriam (Dueña)', role: 'admin', pin: '1234', avatar: '👩‍🍳' },
  { id: 'usr-2', name: 'Ayudante / Mozo', role: 'ayudante', pin: '0000', avatar: '🧑‍🍳' }
];

// Editable WhatsApp greeting sent to frequent customers ("caseros").
// Use {nombre} as a placeholder that gets replaced by the customer name.
export const DEFAULT_GREETING_MESSAGE = `🍔 ¡Hola {nombre}! Te saluda Miriam de *Antojitos con Miriam* 🍗

¡Hoy estamos atendiendo con las hamburguesas a la plancha, broaster bien crocante, salchipollo y aguadito recién salido!

¿Te guardamos tu pedido favorito? Escríbenos para tenerlo listo y que no hagas cola al pasar a recoger. ¡Te esperamos casero! ✨`;

// Global business settings (editable from the Admin panel)
export const DEFAULT_SETTINGS = {
  businessName: 'Antojitos con Miriam',
  businessSubtitle: 'Hamburguesas • Frituras • Comidas • Bebidas',
  businessWhatsapp: '',
  businessAddress: '',
  businessSchedule: '',
  logo: null, // base64 dataURL; null => uses /logo.png
  yapeQr: null, // base64 dataURL of the Yape QR image
  yapeName: '',
  yapeNumber: '',
  paymentMethods: { efectivo: true, yape: true, plin: true, tarjeta: true },
  dailyGoal: 0,
  initialCash: 0,
  thankYouMessage: '¡Muchas gracias por su preferencia casero! ✨'
};

export const DEFAULT_CUSTOMERS = [
  {
    id: 'cli-1',
    name: 'Carlos Mendoza (Casero)',
    phone: '987654321',
    favoriteDish: 'Pollo Broaster (Pierna)',
    favoriteCremas: ['Mayonesa', 'Ají Pollero', 'Tártara'],
    notes: 'Casero fiel de los viernes. Le gustan las papas bien fritas y crocantes.',
    totalOrders: 14,
    totalSpent: 196.00,
    lastVisit: '2026-10-10'
  },
  {
    id: 'cli-2',
    name: 'Sra. Rosa Fernández',
    phone: '912345678',
    favoriteDish: 'Salchipollo',
    favoriteCremas: ['Todas'],
    notes: 'Vecina de la esquina. Pide para llevar con tártara generosa.',
    totalOrders: 9,
    totalSpent: 118.50,
    lastVisit: '2026-10-11'
  },
  {
    id: 'cli-3',
    name: 'Don Lucho (Taller de Motos)',
    phone: '955443322',
    favoriteDish: 'Mostrito Carretillero',
    favoriteCremas: ['Ají Pollero', 'Mostaza'],
    notes: 'Siempre pide con Inca Kola helada. Avisarle por WhatsApp cuando abre la carretilla.',
    totalOrders: 6,
    totalSpent: 108.00,
    lastVisit: '2026-10-09'
  }
];

// Safe sound player using Web Audio API (works offline, zero external assets required)
const playSound = (type = 'click') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'new-order') {
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.35);
    } else if (type === 'ready') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'paid') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch {
    // Ignore audio errors if blocked
  }
};

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const AppProvider = ({ children }) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Users list (can change PINs)
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_users_list');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  // Customers Registry State
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_customers');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS;
    } catch {
      return DEFAULT_CUSTOMERS;
    }
  });

  // Menu State
  const [menu, setMenu] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_menu');
      return saved ? JSON.parse(saved) : DEFAULT_MENU;
    } catch {
      return DEFAULT_MENU;
    }
  });

  // Cremas / Salsas State (editable)
  const [cremas, setCremas] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_cremas');
      return saved ? JSON.parse(saved) : DEFAULT_CREMAS;
    } catch {
      return DEFAULT_CREMAS;
    }
  });

  // Global business settings
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Menu categories (editable)
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  // Orders State
  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_orders');
      if (saved) return JSON.parse(saved);
      const today = getLocalDateString();
      return [
        {
          id: 'PED-101',
          orderNumber: 1,
          customerId: 'cli-1',
          customerName: 'Carlos Mendoza (Casero)',
          customerPhone: '987654321',
          date: today,
          createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          orderType: 'llevar',
          items: [
            { id: 'prod-1', name: 'Pollo Broaster (Pierna)', price: 11.00, quantity: 1, notes: 'Bien crocante' },
            { id: 'prod-10', name: 'Inca Kola 500ml', price: 3.50, quantity: 1, notes: 'Helada' }
          ],
          cremas: ['Mayonesa', 'Ají Pollero', 'Tártara'],
          specialInstructions: 'Papas bien doradas',
          total: 14.50,
          status: 'preparando',
          payment: null
        },
        {
          id: 'PED-102',
          orderNumber: 2,
          customerId: 'cli-2',
          customerName: 'Sra. Rosa Fernández',
          customerPhone: '912345678',
          date: today,
          createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
          orderType: 'mesa',
          items: [
            { id: 'prod-7', name: 'Salchipollo', price: 12.00, quantity: 1, notes: '' },
            { id: 'prod-13', name: 'Huevo Frito Adicional', price: 1.50, quantity: 1, notes: 'A la inglesa' }
          ],
          cremas: ['Todas'],
          specialInstructions: 'Para plato aquí con doble tártara',
          total: 13.50,
          status: 'listo',
          payment: {
            method: 'yape',
            amountPaid: 13.50,
            change: 0,
            paidAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
          }
        }
      ];
    } catch {
      return [];
    }
  });

  // Daily Expenses
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_expenses');
      if (saved) return JSON.parse(saved);
      const today = getLocalDateString();
      return [
        {
          id: 'EXP-1',
          date: today,
          description: 'Hielo en bolsa y descartables',
          amount: 8.00,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  // Active filter date
  const [filterDate, setFilterDate] = useState(() => getLocalDateString());

  // Current tab view: 'tomar-pedido' | 'pedidos-activos' | 'caja' | 'clientes' | 'menu'
  const [activeTab, setActiveTab] = useState('tomar-pedido');

  // Theme state ('dark' | 'light') - Defaults to dark matching Miriam's brand flyer
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_theme');
      return saved ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Editable WhatsApp greeting message for customers
  const [greetingTemplate, setGreetingTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_greeting');
      return saved !== null ? saved : DEFAULT_GREETING_MESSAGE;
    } catch {
      return DEFAULT_GREETING_MESSAGE;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('antojitos_miriam_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('antojitos_miriam_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_users_list', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_customers', JSON.stringify(customers));
    } catch (e) {
      console.error(e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_menu', JSON.stringify(menu));
    } catch (e) {
      console.error(e);
    }
  }, [menu]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_cremas', JSON.stringify(cremas));
    } catch (e) {
      console.error(e);
    }
  }, [cremas]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_settings', JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_categories', JSON.stringify(categories));
    } catch (e) {
      console.error(e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_orders', JSON.stringify(orders));
    } catch (e) {
      console.error(e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error(e);
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem('antojitos_miriam_greeting', greetingTemplate);
    } catch (e) {
      console.error(e);
    }
  }, [greetingTemplate]);

  // Login & Logout
  const login = (userId, enteredPin) => {
    const found = users.find(u => u.id === userId && u.pin === enteredPin);
    if (found) {
      setCurrentUser(found);
      return { success: true };
    }
    return { success: false, message: 'PIN incorrecto. Intenta de nuevo.' };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  // Editable WhatsApp greeting message actions
  const updateGreetingTemplate = (text) => {
    setGreetingTemplate(text);
  };

  const resetGreetingTemplate = () => {
    setGreetingTemplate(DEFAULT_GREETING_MESSAGE);
  };

  // User Management Actions (Create, Update, Delete)
  const addUser = (userData) => {
    const newUser = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: userData.name.trim(),
      role: userData.role || 'ayudante',
      pin: userData.pin.toString().trim(),
      avatar: userData.avatar || (userData.role === 'admin' ? '👩‍🍳' : '🧑‍🍳')
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (userId, updatedData) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...updatedData } : u)));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updatedData }));
    }
  };

  const deleteUser = (userId) => {
    if (users.length <= 1) {
      return { success: false, message: 'Debe haber al menos un usuario registrado en el sistema.' };
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(null);
    }
    return { success: true };
  };

  // Audio helper
  const triggerAudio = (soundName) => {
    if (soundEnabled) {
      playSound(soundName);
    }
  };

  // Helper to get next order number for a specific date
  const getNextOrderNumber = (date) => {
    const dayOrders = orders.filter(o => o.date === date);
    if (dayOrders.length === 0) return 1;
    const maxNum = Math.max(...dayOrders.map(o => o.orderNumber || 0));
    return maxNum + 1;
  };

  // Actions
  const addOrder = (orderData) => {
    const today = getLocalDateString();
    const orderNumber = getNextOrderNumber(today);
    const newOrder = {
      id: `PED-${Date.now().toString().slice(-4)}`,
      orderNumber,
      date: today,
      createdAt: new Date().toISOString(),
      status: 'preparando',
      payment: null,
      ...orderData
    };

    setOrders(prev => [newOrder, ...prev]);
    triggerAudio('new-order');
    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        if (newStatus === 'listo' && order.status !== 'listo') {
          triggerAudio('ready');
        }
        return {
          ...order,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    }));
  };

  const payOrder = (orderId, paymentData) => {
    setOrders(prev => {
      let paidOrderTarget = null;
      const updated = prev.map(order => {
        if (order.id === orderId) {
          paidOrderTarget = order;
          return {
            ...order,
            status: 'entregado',
            payment: {
              ...paymentData,
              paidAt: new Date().toISOString()
            }
          };
        }
        return order;
      });

      // Update customer stats if linked
      if (paidOrderTarget) {
        const cId = paidOrderTarget.customerId;
        const cName = paidOrderTarget.customerName;
        const total = paidOrderTarget.total || 0;

        setCustomers(prevCust => prevCust.map(c => {
          if ((cId && c.id === cId) || (!cId && c.name.toLowerCase() === cName.toLowerCase())) {
            return {
              ...c,
              totalOrders: (c.totalOrders || 0) + 1,
              totalSpent: (c.totalSpent || 0) + total,
              lastVisit: getLocalDateString()
            };
          }
          return c;
        }));
      }

      return updated;
    });

    triggerAudio('paid');
  };

  const cancelOrder = (orderId) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return { ...order, status: 'cancelado' };
      }
      return order;
    }));
  };

  const deleteOrder = (orderId) => {
    setOrders(prev => prev.filter(order => order.id !== orderId));
  };

  // Customers Management Actions
  const addCustomer = (customerData) => {
    const newCustomer = {
      id: `cli-${Date.now().toString().slice(-4)}`,
      name: customerData.name.trim(),
      phone: customerData.phone?.trim() || '',
      favoriteDish: customerData.favoriteDish || '',
      favoriteCremas: customerData.favoriteCremas || ['Todas'],
      notes: customerData.notes?.trim() || '',
      totalOrders: 0,
      totalSpent: 0,
      createdAt: getLocalDateString(),
      lastVisit: getLocalDateString()
    };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = (customerId, updatedData) => {
    setCustomers(prev => prev.map(c => (c.id === customerId ? { ...c, ...updatedData } : c)));
  };

  const deleteCustomer = (customerId) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  // Expenses
  const addExpense = (description, amount) => {
    const newExpense = {
      id: `EXP-${Date.now().toString().slice(-4)}`,
      date: filterDate,
      description: description.trim(),
      amount: parseFloat(amount) || 0,
      createdAt: new Date().toISOString()
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (expenseId) => {
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  // Menu Management
  const toggleProductAvailability = (productId) => {
    setMenu(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, available: !p.available };
      }
      return p;
    }));
  };

  const updateProduct = (updatedProduct) => {
    setMenu(prev => prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
  };

  const addProduct = (newProduct) => {
    const created = {
      ...newProduct,
      id: `prod-${Date.now().toString().slice(-4)}`,
      available: true
    };
    setMenu(prev => [...prev, created]);
  };

  const deleteProduct = (productId) => {
    setMenu(prev => prev.filter(p => p.id !== productId));
  };

  const resetMenuToDefault = () => {
    setMenu(DEFAULT_MENU);
  };

  // Cremas Management
  const addCrema = (cremaData) => {
    const name = (cremaData.name || '').trim();
    const created = {
      id: `crema-${Date.now().toString().slice(-4)}`,
      name,
      short: (cremaData.short || name).trim().slice(0, 12)
    };
    setCremas(prev => [...prev, created]);
    return created;
  };

  const updateCrema = (cremaId, updatedData) => {
    setCremas(prev => prev.map(c => (c.id === cremaId ? { ...c, ...updatedData } : c)));
  };

  const deleteCrema = (cremaId) => {
    setCremas(prev => prev.filter(c => c.id !== cremaId));
  };

  const resetCremasToDefault = () => {
    setCremas(DEFAULT_CREMAS);
  };

  // Business Settings
  const updateSettings = (partial) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // Menu Categories Management
  const addCategory = (catData) => {
    const name = (catData.name || '').trim();
    if (!name) return null;
    const created = {
      id: `cat-${Date.now().toString().slice(-4)}`,
      name,
      icon: catData.icon || 'Utensils'
    };
    setCategories(prev => [...prev, created]);
    return created;
  };

  const updateCategory = (catId, updatedData) => {
    setCategories(prev => prev.map(c => (c.id === catId ? { ...c, ...updatedData } : c)));
  };

  const deleteCategory = (catId) => {
    if (catId === 'extras' || catId === 'todos') return;
    const remaining = categories.filter(c => c.id !== catId && c.id !== 'todos');
    const fallback = remaining[0]?.id || 'comidas';
    setMenu(prev => prev.map(p => (p.category === catId ? { ...p, category: fallback } : p)));
    setCategories(prev => prev.filter(c => c.id !== catId));
  };

  const resetCategoriesToDefault = () => {
    setCategories(DEFAULT_CATEGORIES);
  };

  // Metrics for the currently selected filterDate
  const filteredOrders = orders.filter(o => o.date === filterDate);
  const activeOrdersCount = orders.filter(o => o.date === getLocalDateString() && (o.status === 'preparando' || o.status === 'listo')).length;

  const validPaidOrders = filteredOrders.filter(o => o.status !== 'cancelado' && o.payment);
  const totalSales = validPaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  const cashSales = validPaidOrders
    .filter(o => o.payment?.method === 'efectivo')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const yapePlinSales = validPaidOrders
    .filter(o => o.payment?.method === 'yape' || o.payment?.method === 'plin')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const cardOtherSales = validPaidOrders
    .filter(o => o.payment?.method === 'tarjeta' || o.payment?.method === 'otro')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const filteredExpenses = expenses.filter(e => e.date === filterDate);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  // Breakdown of dishes sold for the filterDate
  const dishesStats = {};
  validPaidOrders.forEach(order => {
    order.items?.forEach(item => {
      if (!dishesStats[item.name]) {
        dishesStats[item.name] = { count: 0, total: 0 };
      }
      dishesStats[item.name].count += item.quantity || 1;
      dishesStats[item.name].total += (item.price || 0) * (item.quantity || 1);
    });
  });

  const dishesRanking = Object.entries(dishesStats)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        menu,
        orders,
        expenses,
        filterDate,
        setFilterDate,
        activeTab,
        setActiveTab,
        theme,
        toggleTheme,
        soundEnabled,
        setSoundEnabled,
        greetingTemplate,
        updateGreetingTemplate,
        resetGreetingTemplate,
        activeOrdersCount,
        addOrder,
        updateOrderStatus,
        payOrder,
        cancelOrder,
        deleteOrder,
        addExpense,
        deleteExpense,
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
        settings,
        updateSettings,
        resetSettings,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        resetCategoriesToDefault,
        // Metrics
        filteredOrders,
        filteredExpenses,
        totalSales,
        cashSales,
        yapePlinSales,
        cardOtherSales,
        totalExpenses,
        netProfit,
        dishesRanking,
        todayDateStr: getLocalDateString(),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
