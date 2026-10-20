import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useSyncedCollection, syncRequest, SESSION_EXPIRED } from '../sync/useSyncedCollection';
import { DEFAULT_MENU, DEFAULT_CREMAS, DEFAULT_CATEGORIES } from '../data/defaultMenu';
import { debtBalance, paymentEvents } from '../domain/finance';
import { can as userCan } from '../domain/permissions';

const AppContext = createContext();

export const DEFAULT_USERS = [];

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

export const DEFAULT_CUSTOMERS = [];

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

const CURSORS_KEY = 'antojitos_miriam_cursors';
const CUSTOMER_STATS_KEY = 'antojitos_miriam_customer_stats';
// Each device holds this many days of orders (plus debts, open accounts and orders in
// progress); older days are fetched from the server when someone looks at them.
const ORDER_WINDOW_DAYS = 60;

const readStoredJson = key => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const sortOrders =list => [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

const withOrderStatus = (order, status, at = new Date().toISOString(), by = '') => {
  if (order.status === status) return order;
  return {
    ...order,
    status,
    updatedAt: at,
    statusHistory: [...(order.statusHistory || []), { status, at, ...(by && { by }) }]
  };
};

export const AppProvider = ({ children }) => {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = readStoredJson('antojitos_miriam_user');
    if (!saved) return null;
    const { pin, ...user } = saved;
    return user;
  });

  // Every collection is saved record by record (see useSyncedCollection).
  const ordersStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_orders', syncKey: 'antojitos_miriam_order_sync', path: '/api/orders', bodyKey: 'order',
    fallback: [], sort: sortOrders, describe: order => `El pedido #${order.orderNumber}`
  });
  const usersStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_users_list', path: '/api/data/users', fallback: DEFAULT_USERS, describe: user => `El usuario ${user.name}`
  });
  const customersStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_customers', path: '/api/data/customers', fallback: DEFAULT_CUSTOMERS, describe: customer => `El casero ${customer.name}`
  });
  const menuStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_menu', path: '/api/data/menu', fallback: DEFAULT_MENU, describe: product => `El producto ${product.name}`
  });
  const cremasStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_cremas', path: '/api/data/cremas', fallback: DEFAULT_CREMAS, describe: crema => `La crema ${crema.name}`
  });
  const categoriesStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_categories', path: '/api/data/categories', fallback: DEFAULT_CATEGORIES, describe: category => `La categoría ${category.name}`
  });
  const expensesStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_expenses', path: '/api/data/expenses', fallback: [], describe: expense => `El gasto "${expense.description}"`
  });
  // Business settings and the WhatsApp greeting are two records of the config collection.
  const configStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_config', path: '/api/data/config',
    fallback: [{ id: 'settings', value: DEFAULT_SETTINGS }, { id: 'greeting', value: DEFAULT_GREETING_MESSAGE }],
    describe: item => item.id === 'settings' ? 'La configuración del negocio' : 'El mensaje de saludo'
  });
  // One record per day the cash register was closed (cierre-YYYY-MM-DD).
  const closingsStore = useSyncedCollection({
    storageKey: 'antojitos_miriam_closings', path: '/api/data/closings', fallback: [], describe: closing => `El cierre de caja del ${closing.date}`
  });
  const dataStores = {
    users: usersStore, customers: customersStore, categories: categoriesStore, cremas: cremasStore,
    menu: menuStore, expenses: expensesStore, config: configStore, closings: closingsStore
  };
  const allStores = [ordersStore, ...Object.values(dataStores)];

  const { list: users, setList: setUsers } = usersStore;
  const { list: storedCustomers, setList: setCustomers } = customersStore;
  const { list: menu, setList: setMenu } = menuStore;
  const { list: cremas, setList: setCremas } = cremasStore;
  const { list: categories, setList: setCategories } = categoriesStore;
  const { list: orders, setList: setOrders } = ordersStore;
  const { list: expenses, setList: setExpenses } = expensesStore;
  const { list: config, setList: setConfig } = configStore;
  const { list: closings, setList: setClosings } = closingsStore;
  // Who did it, shown on the order and in the receipt; the server keeps its own history too.
  const by = () => currentUser?.name || '';
  // Read from the synced users list, so a permission the admin changes applies at once.
  const can = key => userCan(users.find(u => u.id === currentUser?.id) || currentUser, key);

  const setConfigValue = (id, update) => setConfig(previous => {
    const current = previous.find(item => item.id === id);
    const value = typeof update === 'function' ? update(current?.value) : update;
    return current ? previous.map(item => item.id === id ? { ...item, value } : item) : [...previous, { id, value }];
  });
  const settings = { ...DEFAULT_SETTINGS, ...config.find(item => item.id === 'settings')?.value };
  const setSettings = update => setConfigValue('settings', previous =>
    typeof update === 'function' ? update({ ...DEFAULT_SETTINGS, ...previous }) : update);
  const greetingTemplate = config.find(item => item.id === 'greeting')?.value ?? DEFAULT_GREETING_MESSAGE;
  const setGreetingTemplate = text => setConfigValue('greeting', text);

  // Visit counts and spending come from the orders themselves, so two devices charging
  // at the same time never overwrite each other's totals. Orders before `archived.before`
  // are summed by the server; this device adds the ones it holds from that day on.
  const [archived, setArchived] = useState(() => readStoredJson(CUSTOMER_STATS_KEY) || { before: '0000-00-00', stats: [] });
  const customers = storedCustomers.map(customer => {
    const isTheirs = (customerId, customerName) =>
      customerId ? customerId === customer.id : customerName?.toLowerCase() === customer.name.toLowerCase();
    const theirs = orders.filter(order => order.date >= archived.before && order.status !== 'cancelado' &&
      (order.payment || order.debt) && isTheirs(order.customerId, order.customerName));
    const past = archived.stats.filter(stat => isTheirs(stat.customerId, stat.customerName));
    return {
      ...customer,
      totalOrders: theirs.length + past.reduce((sum, stat) => sum + stat.totalOrders, 0),
      totalSpent: Math.round((theirs.reduce((sum, order) => sum + (order.total || 0), 0) +
        past.reduce((sum, stat) => sum + stat.totalSpent, 0)) * 100) / 100,
      lastVisit: [...theirs.map(order => order.date), ...past.map(stat => stat.lastVisit)]
        .reduce((last, date) => (date > last ? date : last), customer.lastVisit || '')
    };
  });

  // Active filter date
  const [filterDate, setFilterDate] = useState(() => getLocalDateString());

  // Current tab view: 'tomar-pedido' | 'pedidos-activos' | 'caja' | 'clientes' | 'menu'
  const [activeTab, setActiveTab] = useState('tomar-pedido');
  const [accountOrderId, setAccountOrderId] = useState(null);

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

  const [dbReady, setDbReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const [offline, setOffline] = useState(false);
  const [loginUsers, setLoginUsers] = useState([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const cursors = useRef(readStoredJson(CURSORS_KEY));
  const syncError = [...new Set(allStores.map(store => store.error).filter(Boolean))].join(' · ');
  const pendingChanges = allStores.reduce((sum, store) => sum + store.pending, 0);

  const saveCursors = value => {
    cursors.current = value;
    try {
      localStorage.setItem(CURSORS_KEY, JSON.stringify(value));
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    const from = getLocalDateString(new Date(Date.now() - ORDER_WINDOW_DAYS * 86_400_000));
    const [{ body: remoteOrders }, { body: remoteData }, { body: pastStats }] = await Promise.all([
      syncRequest(`/api/orders?since=0&from=${from}`), syncRequest('/api/data?since=0'),
      syncRequest(`/api/orders/customer-stats?before=${from}`)
    ]);
    setArchived(pastStats);
    try {
      localStorage.setItem(CUSTOMER_STATS_KEY, JSON.stringify(pastStats));
    } catch (e) {
      console.error(e);
    }
    olderDaysLoaded.current = new Set();
    saveCursors({ orders: remoteOrders.cursor, data: remoteData.cursor });
    ordersStore.init(remoteOrders.orders);
    // A brand-new database (nothing but the admin) starts from this browser's data, or
    // the default menu. Users are never sent from here: the server holds their PINs.
    const seed = Object.entries(remoteData.records).every(([name, list]) => name === 'users' || list.length === 0);
    for (const [name, store] of Object.entries(dataStores)) store.init(remoteData.records[name], { seed: seed && name !== 'users' });
    setOffline(false);
    setDataReady(true);
  };

  // Without signal, whoever was signed in keeps working on this browser's copy.
  const startOffline = () => {
    if (!cursors.current || !readStoredJson('antojitos_miriam_user')) return false;
    const restored = allStores.map(store => store.initOffline());
    if (!restored.every(Boolean)) return false;
    setOffline(true);
    setDataReady(true);
    return true;
  };

  const refreshLoginUsers = () => syncRequest('/api/session').then(({ body }) => {
    setLoginUsers(body.users);
    setNeedsSetup(body.needsSetup);
    return body;
  });

  useEffect(() => {
    let active = true;
    refreshLoginUsers()
      .then(async session => {
        if (!active) return;
        setCurrentUser(session.user);
        if (session.user) await loadData();
        setDbReady(true);
      })
      .catch(error => {
        if (!active) return;
        if (startOffline()) setDbReady(true);
        else setDbError(navigator.onLine === false ? 'Sin conexión. Abre la aplicación con señal al menos una vez.' : error.message);
      });
    return () => { active = false; };
  }, []);

  // The server ended the session (expired, or the user was removed): ask for the PIN again.
  // Changes not yet sent stay on this device and go out after signing in.
  useEffect(() => {
    const expired = () => {
      setCurrentUser(null);
      refreshLoginUsers().catch(() => {});
    };
    window.addEventListener(SESSION_EXPIRED, expired);
    return () => window.removeEventListener(SESSION_EXPIRED, expired);
  }, []);

  // Days before the window are fetched when someone looks at them (cash register, orders).
  const olderDaysLoaded = useRef(new Set());
  useEffect(() => {
    if (!dataReady || !currentUser || filterDate >= archived.before || olderDaysLoaded.current.has(filterDate)) return;
    olderDaysLoaded.current.add(filterDate);
    syncRequest(`/api/orders?around=${filterDate}`)
      .then(({ body }) => ordersStore.applyServer(body.orders))
      .catch(() => olderDaysLoaded.current.delete(filterDate));
  }, [dataReady, currentUser?.id, filterDate, archived.before]);

  // Other devices' changes show up within a few seconds.
  const poll = async () => {
    if (document.visibilityState === 'hidden' || !cursors.current) return;
    try {
      const [{ body: orderChanges }, { body: dataChanges }] = await Promise.all([
        syncRequest(`/api/orders?since=${cursors.current.orders}`),
        syncRequest(`/api/data?since=${cursors.current.data}`)
      ]);
      ordersStore.applyServer(orderChanges.orders, orderChanges.deleted);
      for (const [name, store] of Object.entries(dataStores)) store.applyServer(dataChanges.records[name], dataChanges.deleted[name]);
      saveCursors({ orders: orderChanges.cursor, data: dataChanges.cursor });
      setOffline(false);
    } catch {
      // The next poll retries; pending sends report connection problems.
    }
  };

  useEffect(() => {
    if (!dataReady || !currentUser) return;
    const refresh = () => {
      allStores.forEach(store => store.flush());
      poll();
    };
    refresh();
    const timer = setInterval(poll, 5000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [dataReady, currentUser?.id]);

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

  // Login & Logout: the server checks the PIN and keeps the session in a cookie.
  const startSession = async (path, payload) => {
    let response;
    try {
      response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch {
      return { success: false, message: 'Sin conexión: para ingresar con tu PIN se necesita señal.' };
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) return { success: false, message: body?.error || 'No se pudo ingresar.' };
    setCurrentUser(body.user);
    setNeedsSetup(false);
    try {
      await loadData();
    } catch (error) {
      if (!startOffline()) setDbError(error.message);
    }
    return { success: true };
  };

  const login = (userId, enteredPin) => startSession('/api/session', { userId, pin: enteredPin });

  const logout = () => {
    fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    setCurrentUser(null);
    refreshLoginUsers().catch(() => {});
  };

  const createFirstAdmin = (name, pin) => startSession('/api/setup', { name, pin });

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
      id: `usr-${crypto.randomUUID()}`,
      name: userData.name.trim(),
      role: userData.role || 'ayudante',
      pin: userData.pin.toString().trim(),
      avatar: userData.avatar || (userData.role === 'admin' ? '👩‍🍳' : '🧑‍🍳'),
      ...(userData.role !== 'admin' && userData.permissions ? { permissions: userData.permissions } : {})
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  // A PIN is only sent when it changes; the server stores it hashed.
  const updateUser = (userId, updatedData) => {
    const { pin, _seq, ...profile } = updatedData;
    const change = pin ? { ...profile, pin: String(pin).trim() } : profile;
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...change } : u)));
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, name: profile.name ?? prev.name, avatar: profile.avatar ?? prev.avatar, role: profile.role ?? prev.role }));
    }
  };

  const deleteUser = (userId) => {
    if (users.length <= 1) {
      return { success: false, message: 'Debe haber al menos un usuario registrado en el sistema.' };
    }
    if (!users.some(u => u.id !== userId && u.role === 'admin')) {
      return { success: false, message: 'Debe quedar al menos una administradora.' };
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
    const createdAt = new Date().toISOString();
    const newOrder = {
      id: `PED-${crypto.randomUUID()}`,
      orderNumber,
      date: today,
      createdAt,
      status: 'recibido',
      payment: null,
      ...orderData,
      createdBy: by(),
      statusHistory: [{ status: 'recibido', at: createdAt, by: by() }]
    };

    setOrders(prev => [newOrder, ...prev]);
    triggerAudio('new-order');
    return newOrder;
  };

  const appendToOpenAccount = (orderId, newItems, note = '') => {
    const order = orders.find(item => item.id === orderId);
    if (!order?.openAccount || order.payment || order.debt ||
        order.status === 'cancelado' || !Array.isArray(newItems) || newItems.length === 0) return false;
    const extra = newItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
    if (!Number.isFinite(extra) || extra <= 0) return false;
    const now = new Date().toISOString();
    setOrders(previous => previous.map(item => item.id === orderId ? {
      ...withOrderStatus(item, 'preparando', now),
      items: [...(item.items || []), ...newItems],
      total: Math.round((Number(item.total || 0) + extra) * 100) / 100,
      specialInstructions: [item.specialInstructions, note.trim()].filter(Boolean).join(' | '),
      updatedAt: now
    } : item));
    triggerAudio('new-order');
    return true;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId && order.status !== newStatus) {
        if (newStatus === 'listo' && order.status !== 'listo') {
          triggerAudio('ready');
        }
        return withOrderStatus(order, newStatus, undefined, by());
      }
      return order;
    }));
  };

  const payOrder = (orderId, paymentData) => {
    if (!can('cobrar')) return false;
    // Customer stats are derived from the orders, so only the order changes here.
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      const paidAt = new Date().toISOString();
      return {
        ...withOrderStatus(order, 'entregado', paidAt, by()),
        openAccount: false,
        payment: {
          ...paymentData,
          paidAt,
          by: by()
        }
      };
    }));

    triggerAudio('paid');
  };

  const markOrderAsDebt = (orderId, debtorName, debtorPhone = '') => {
    const order = orders.find(item => item.id === orderId);
    const name = debtorName?.trim();
    if (!can('fiar') || !order || order.status !== 'listo' || order.payment || order.debt ||
        !name || name.toLowerCase() === 'cliente al paso') return false;
    const now = new Date().toISOString();
    setOrders(previous => previous.map(item => item.id === orderId ? {
      ...withOrderStatus(item, 'entregado', now, by()), customerName: name, customerPhone: debtorPhone.trim(),
      openAccount: false,
      debt: { createdAt: now }, debtPayments: []
    } : item));
    return true;
  };

  // allocations: [{ orderId, amount }], e.g. one payment spread over a customer's debts.
  const recordDebtPayments = (allocations, method) => {
    if (!can('cobrar') || !['efectivo', 'yape', 'plin', 'tarjeta', 'otro'].includes(method) || !allocations?.length) return false;
    const valid = allocations.every(({ orderId, amount }) => {
      const order = orders.find(item => item.id === orderId);
      const cents = Math.round(Number(amount) * 100);
      return order?.debt && Number.isSafeInteger(cents) && cents > 0 && cents <= Math.round(debtBalance(order) * 100);
    });
    if (!valid) return false;
    const now = new Date().toISOString();
    const amounts = new Map(allocations.map(({ orderId, amount }) => [orderId, Math.round(Number(amount) * 100) / 100]));
    setOrders(previous => previous.map(item => {
      if (!amounts.has(item.id)) return item;
      const debtPayments = [...(item.debtPayments || []), {
        id: `abono-${crypto.randomUUID()}`, amount: amounts.get(item.id), method, paidAt: now, by: by()
      }];
      return {
        ...item, debtPayments, updatedAt: now,
        payment: debtBalance({ ...item, debtPayments }) === 0 ? {
          method, amountPaid: item.total, change: 0, paidAt: now, by: by()
        } : null
      };
    }));
    return true;
  };
  const recordDebtPayment = (orderId, amount, method) => recordDebtPayments([{ orderId, amount }], method);

  const cancelOrder = (orderId) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return withOrderStatus(order, 'cancelado', undefined, by());
      }
      return order;
    }));
  };

  // Only the admin can delete an order (the server refuses anyone else); helpers cancel.
  const deleteOrder = (orderId) => {
    if (currentUser?.role !== 'admin') return false;
    setOrders(prev => prev.filter(order => order.id !== orderId));
    return true;
  };

  // Customers Management Actions
  const addCustomer = (customerData) => {
    const newCustomer = {
      id: `cli-${crypto.randomUUID()}`,
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
    const { totalOrders, totalSpent, ...editable } = updatedData;
    setCustomers(prev => prev.map(c => (c.id === customerId ? { ...c, ...editable } : c)));
  };

  const deleteCustomer = (customerId) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  // Expenses
  const addExpense = (description, amount) => {
    if (!can('gastos')) return false;
    const newExpense = {
      id: `EXP-${crypto.randomUUID()}`,
      date: filterDate,
      description: description.trim(),
      amount: parseFloat(amount) || 0,
      createdAt: new Date().toISOString(),
      createdBy: by()
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (expenseId) => {
    if (!can('gastos')) return false;
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  // Menu Management
  const toggleProductAvailability = (productId) => {
    if (!can('carta')) return false;
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
      id: `prod-${crypto.randomUUID()}`,
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
      id: `crema-${crypto.randomUUID()}`,
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
      id: `cat-${crypto.randomUUID()}`,
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
  const activeOrdersCount = orders.filter(o => o.date === getLocalDateString() && ['recibido', 'preparando', 'listo'].includes(o.status)).length;

  const validPaidOrders = filteredOrders.filter(o => o.status !== 'cancelado' && (o.payment || o.debt));
  const dailyPayments = paymentEvents(orders, filterDate);
  const totalSales = dailyPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  const cashSales = dailyPayments
    .filter(payment => payment.method === 'efectivo')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const yapePlinSales = dailyPayments
    .filter(payment => payment.method === 'yape' || payment.method === 'plin')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const cardOtherSales = dailyPayments
    .filter(payment => payment.method === 'tarjeta' || payment.method === 'otro')
    .reduce((sum, payment) => sum + payment.amount, 0);

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

  // Cash closing: the money counted at the end of the day against what the register says
  // should be there. The figures are kept as they were, so later edits show up as changes.
  const round = value => Math.round(value * 100) / 100;
  const initialCash = Number(settings.initialCash) || 0;
  const expectedCash = round(initialCash + cashSales - totalExpenses);
  const dayClosing = closings.find(closing => closing.date === filterDate) || null;
  const closeCashRegister = ({ countedCash, notes = '' }) => {
    const counted = round(Number(countedCash));
    if (!can('cerrarCaja') || !Number.isFinite(counted) || counted < 0 || dayClosing) return false;
    setClosings(previous => [...previous, {
      id: `cierre-${filterDate}`, date: filterDate, countedCash: counted, expectedCash,
      difference: round(counted - expectedCash), initialCash, cashSales: round(cashSales), yapePlinSales: round(yapePlinSales),
      cardOtherSales: round(cardOtherSales), totalSales: round(totalSales), totalExpenses: round(totalExpenses),
      payments: dailyPayments.length, notes: notes.trim(), closedBy: by(), closedAt: new Date().toISOString()
    }]);
    return true;
  };
  const reopenCashRegister = date => {
    if (!can('cambiarCierre')) return false;
    setClosings(previous => previous.filter(closing => closing.date !== date));
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        can,
        users,
        login,
        logout,
        createFirstAdmin,
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
        accountOrderId,
        setAccountOrderId,
        theme,
        toggleTheme,
        soundEnabled,
        setSoundEnabled,
        greetingTemplate,
        dbReady,
        dataReady,
        dbError,
        offline,
        loginUsers,
        needsSetup,
        syncError,
        pendingChanges,
        updateGreetingTemplate,
        resetGreetingTemplate,
        activeOrdersCount,
        addOrder,
        appendToOpenAccount,
        updateOrderStatus,
        payOrder,
        markOrderAsDebt,
        recordDebtPayment,
        recordDebtPayments,
        dailyPayments,
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
        expectedCash,
        dayClosing,
        closeCashRegister,
        reopenCashRegister,
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
