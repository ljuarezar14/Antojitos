import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { DEFAULT_MENU, DEFAULT_CREMAS, DEFAULT_CATEGORIES } from '../data/defaultMenu';
import { debtBalance, paymentEvents } from '../domain/finance';

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

const ORDER_SYNC_KEY = 'antojitos_miriam_order_sync';

const sortOrders = list => [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

// Resolves with 409/410 bodies too, since the sync handles those; other failures throw.
const orderRequest = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
  const body = await response.json().catch(() => null);
  if (!response.ok && response.status !== 409 && response.status !== 410) {
    throw new Error(body?.error || `Error ${response.status}`);
  }
  return { status: response.status, body };
};

const withOrderStatus = (order, status, at = new Date().toISOString()) => {
  if (order.status === status) return order;
  return {
    ...order,
    status,
    updatedAt: at,
    statusHistory: [...(order.statusHistory || []), { status, at }]
  };
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
      return [];
    } catch {
      return [];
    }
  });

  // Daily Expenses
  const [expenses, setExpenses] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_expenses');
      if (saved) return JSON.parse(saved);
      return [];
    } catch {
      return [];
    }
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

  // Editable WhatsApp greeting message for customers
  const [greetingTemplate, setGreetingTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem('antojitos_miriam_greeting');
      return saved !== null ? saved : DEFAULT_GREETING_MESSAGE;
    } catch {
      return DEFAULT_GREETING_MESSAGE;
    }
  });

  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState('');
  const writeQueue = useRef(Promise.resolve());
  const dbRevision = useRef(0);

  // Order sync: each order is saved on its own, so two devices never overwrite each other.
  // `serverOrders` holds the last version the server confirmed for each id; any local order
  // object that differs from it is pending. Pending ids survive reloads and lost signal.
  const [orderSyncError, setOrderSyncError] = useState('');
  const [pendingOrders, setPendingOrders] = useState(0);
  const serverOrders = useRef(new Map());
  const orderSync = useRef(null);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const flushing = useRef(false);
  const flushAgain = useRef(false);
  const retryTimer = useRef(null);

  const saveOrderSync = () => {
    const sync = orderSync.current;
    setPendingOrders(sync.dirty.size + sync.removed.size);
    try {
      localStorage.setItem(ORDER_SYNC_KEY, JSON.stringify({ dirty: [...sync.dirty], removed: [...sync.removed] }));
    } catch (e) {
      console.error(e);
    }
  };

  // Puts server versions into the list, leaving orders with unsent local changes alone.
  const applyServerOrders = (incoming, deletedIds = []) => {
    const sync = orderSync.current;
    const replacements = new Map();
    const previousVersions = new Map();
    for (const order of incoming) {
      if (sync.dirty.has(order.id) || sync.removed.has(order.id)) continue;
      previousVersions.set(order.id, serverOrders.current.get(order.id));
      serverOrders.current.set(order.id, order);
      replacements.set(order.id, order);
    }
    const gone = new Set(deletedIds.filter(id => !sync.dirty.has(id)));
    gone.forEach(id => serverOrders.current.delete(id));
    if (!replacements.size && !gone.size) return;
    setOrders(previous => {
      const added = new Map(replacements);
      const next = previous.filter(order => !gone.has(order.id)).map(order => {
        if (!added.has(order.id)) return order;
        const replacement = added.get(order.id);
        added.delete(order.id);
        // An edit made in this instant stays; it is sent and resolved as a conflict.
        return order === previousVersions.get(order.id) ? replacement : order;
      });
      return added.size ? sortOrders([...next, ...added.values()]) : next;
    });
  };

  const flushOrders = async () => {
    if (!orderSync.current) return;
    if (flushing.current) { flushAgain.current = true; return; }
    flushing.current = true;
    clearTimeout(retryTimer.current);
    const sync = orderSync.current;
    try {
      do {
        flushAgain.current = false;
        for (const id of [...sync.removed]) {
          await orderRequest(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
          sync.removed.delete(id);
          serverOrders.current.delete(id);
          saveOrderSync();
        }
        for (const id of [...sync.dirty]) {
          const sent = ordersRef.current.find(order => order.id === id);
          if (!sent) { sync.dirty.delete(id); saveOrderSync(); continue; }
          const { status, body } = sent._seq == null
            ? await orderRequest('/api/orders', { method: 'POST', body: JSON.stringify(sent) })
            : await orderRequest(`/api/orders/${encodeURIComponent(id)}`, {
              method: 'PUT', body: JSON.stringify({ order: sent, baseSeq: sent._seq })
            });
          if (status === 410) {
            sync.dirty.delete(id);
            serverOrders.current.delete(id);
            setOrders(previous => previous.filter(order => order.id !== id));
            setOrderSyncError(`El pedido #${sent.orderNumber} fue eliminado en otro dispositivo.`);
          } else if (status === 409) {
            sync.dirty.delete(id);
            serverOrders.current.set(id, body.order);
            setOrders(previous => previous.map(order => order.id === id ? body.order : order));
            setOrderSyncError(`El pedido #${body.order.orderNumber} se modificó en otro dispositivo. Se cargó la última versión: revísalo y repite tu cambio.`);
          } else {
            const confirmed = body.order;
            serverOrders.current.set(id, confirmed);
            const current = ordersRef.current.find(order => order.id === id);
            if (!current) sync.removed.add(id);
            if (current === sent) sync.dirty.delete(id);
            // Keep edits made while the request was in flight; they go out on the next pass.
            setOrders(previous => previous.map(order => order.id !== id ? order
              : order === sent ? confirmed
              : { ...order, orderNumber: confirmed.orderNumber, _seq: confirmed._seq }));
            if (current !== sent) flushAgain.current = true;
          }
          saveOrderSync();
        }
      } while (flushAgain.current);
      setOrderSyncError(previous => previous.startsWith('Sin conexión') ? '' : previous);
    } catch (error) {
      setOrderSyncError(`Sin conexión: hay pedidos guardados solo en este dispositivo. Se enviarán automáticamente (${error.message}).`);
      retryTimer.current = setTimeout(() => flushOrders(), 5000);
    } finally {
      flushing.current = false;
    }
  };

  const pollOrders = async () => {
    if (!orderSync.current || document.visibilityState === 'hidden') return;
    try {
      const { body } = await orderRequest(`/api/orders?since=${orderSync.current.cursor}`);
      orderSync.current.cursor = body.cursor;
      applyServerOrders(body.orders, body.deleted);
    } catch {
      // The next poll retries; pending sends report connection problems.
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/state').then(async response => {
        if (!response.ok) {
          const details = await response.json().catch(() => null);
          throw new Error(details?.error || 'No se pudo abrir la base de datos');
        }
        return response.json();
      }),
      orderRequest('/api/orders?since=0').then(({ body }) => body)
    ])
      .then(([saved, remote]) => {
        if (!active) return;
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem(ORDER_SYNC_KEY)); } catch { stored = null; }
        const sync = {
          dirty: new Set(stored?.dirty || []),
          removed: new Set(stored?.removed || []),
          cursor: remote.cursor
        };
        const remoteById = new Map(remote.orders.map(order => [order.id, order]));
        let localOrders = ordersRef.current;
        // First run after the update: changes that never reached the server under the old
        // whole-state saving are still in this browser, so send them now.
        if (!stored) {
          const lastChange = order => String(order.updatedAt || order.createdAt || '');
          localOrders = localOrders.map(order => {
            const server = remoteById.get(order.id);
            if (!server) {
              sync.dirty.add(order.id);
              return order;
            }
            if (lastChange(order) <= lastChange(server)) return order;
            sync.dirty.add(order.id);
            return { ...order, orderNumber: server.orderNumber, _seq: server._seq };
          });
        }
        const localPending = localOrders.filter(order => sync.dirty.has(order.id));
        const pendingIds = new Set(localPending.map(order => order.id));
        serverOrders.current = new Map(remote.orders.map(order => [order.id, order]));
        orderSync.current = sync;
        setOrders(sortOrders([
          ...remote.orders.filter(order => !pendingIds.has(order.id) && !sync.removed.has(order.id)),
          ...localPending
        ]));
        saveOrderSync();
        if (saved) {
          dbRevision.current = saved._revision;
          setUsers(saved.users);
          setCustomers(saved.customers);
          setMenu(saved.menu);
          setCremas(saved.cremas);
          setSettings({ ...DEFAULT_SETTINGS, ...saved.settings });
          setCategories(saved.categories);
          setExpenses(saved.expenses);
          setGreetingTemplate(saved.greetingTemplate);
          setCurrentUser(previous => saved.users.find(user => user.id === previous?.id) || null);
        } else {
          setCurrentUser(null);
        }
        setDbReady(true);
      })
      .catch(error => { if (active) setDbError(error.message); });
    return () => { active = false; };
  }, []);

  // One debounced write per state change. Reading the API never writes back in a loop.
  useEffect(() => {
    if (!dbReady) return;
    const timer = setTimeout(() => {
      writeQueue.current = writeQueue.current.catch(() => {}).then(() => fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _revision: dbRevision.current, users, customers, menu, cremas, settings, categories, expenses, greetingTemplate })
      }).then(response => {
        if (!response.ok) return response.json().then(data => { throw new Error(data.error || 'Error al guardar'); });
        return response.json();
      }).then(result => {
        dbRevision.current = result.revision;
        setDbError('');
      }).catch(error => setDbError(`Los cambios solo están en este navegador: ${error.message}`)));
    }, 300);
    return () => clearTimeout(timer);
  }, [dbReady, users, customers, menu, cremas, settings, categories, expenses, greetingTemplate]);

  // Every local change to an order marks it pending and sends it.
  useEffect(() => {
    const sync = orderSync.current;
    if (!dbReady || !sync) return;
    const ids = new Set();
    for (const order of orders) {
      ids.add(order.id);
      if (serverOrders.current.get(order.id) !== order) sync.dirty.add(order.id);
    }
    for (const id of serverOrders.current.keys()) {
      if (!ids.has(id)) sync.removed.add(id);
    }
    for (const id of sync.dirty) {
      if (!ids.has(id)) sync.dirty.delete(id);
    }
    saveOrderSync();
    if (sync.dirty.size || sync.removed.size) flushOrders();
  }, [dbReady, orders]);

  // Other devices' orders show up within a few seconds.
  useEffect(() => {
    if (!dbReady) return;
    const refresh = () => { flushOrders(); pollOrders(); };
    const timer = setInterval(pollOrders, 5000);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [dbReady]);

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

  const createFirstAdmin = (name, pin) => {
    if (users.length || !/^\d{4}$/.test(pin) || !name.trim()) return false;
    const admin = { id: `usr-${crypto.randomUUID()}`, name: name.trim(), role: 'admin', pin, avatar: '👩‍🍳' };
    setUsers([admin]);
    setCurrentUser(admin);
    return true;
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
      id: `usr-${crypto.randomUUID()}`,
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
    const createdAt = new Date().toISOString();
    const newOrder = {
      id: `PED-${crypto.randomUUID()}`,
      orderNumber,
      date: today,
      createdAt,
      status: 'recibido',
      payment: null,
      ...orderData,
      statusHistory: [{ status: 'recibido', at: createdAt }]
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
        return withOrderStatus(order, newStatus);
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
          const paidAt = new Date().toISOString();
          return {
            ...withOrderStatus(order, 'entregado', paidAt),
            openAccount: false,
            payment: {
              ...paymentData,
              paidAt
            }
          };
        }
        return order;
      });

      // Update customer stats if linked
      if (paidOrderTarget && !paidOrderTarget.payment) {
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

  const markOrderAsDebt = (orderId, debtorName, debtorPhone = '') => {
    const order = orders.find(item => item.id === orderId);
    const name = debtorName?.trim();
    if (!order || order.status !== 'listo' || order.payment || order.debt ||
        !name || name.toLowerCase() === 'cliente al paso') return false;
    const now = new Date().toISOString();
    setOrders(previous => previous.map(item => item.id === orderId ? {
      ...withOrderStatus(item, 'entregado', now), customerName: name, customerPhone: debtorPhone.trim(),
      openAccount: false,
      debt: { createdAt: now }, debtPayments: []
    } : item));
    setCustomers(previous => previous.map(customer => customer.id === order.customerId ? {
      ...customer,
      totalOrders: (customer.totalOrders || 0) + 1,
      totalSpent: (customer.totalSpent || 0) + (order.total || 0),
      lastVisit: getLocalDateString()
    } : customer));
    return true;
  };

  const recordDebtPayment = (orderId, amount, method) => {
    const order = orders.find(item => item.id === orderId);
    const cents = Math.round(Number(amount) * 100);
    const balanceCents = Math.round(debtBalance(order || {}) * 100);
    if (!order?.debt || !Number.isSafeInteger(cents) || cents <= 0 || cents > balanceCents ||
        !['efectivo', 'yape', 'plin', 'tarjeta', 'otro'].includes(method)) return false;
    const now = new Date().toISOString();
    setOrders(previous => previous.map(item => {
      if (item.id !== orderId) return item;
      const debtPayments = [...(item.debtPayments || []), {
        id: `abono-${crypto.randomUUID()}`, amount: cents / 100, method, paidAt: now
      }];
      return {
        ...item, debtPayments, updatedAt: now,
        payment: debtBalance({ ...item, debtPayments }) === 0 ? {
          method, amountPaid: item.total, change: 0, paidAt: now
        } : null
      };
    }));
    return true;
  };

  const cancelOrder = (orderId) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return withOrderStatus(order, 'cancelado');
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
    setCustomers(prev => prev.map(c => (c.id === customerId ? { ...c, ...updatedData } : c)));
  };

  const deleteCustomer = (customerId) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  // Expenses
  const addExpense = (description, amount) => {
    const newExpense = {
      id: `EXP-${crypto.randomUUID()}`,
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
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
        dbError,
        orderSyncError,
        pendingOrders,
        updateGreetingTemplate,
        resetGreetingTemplate,
        activeOrdersCount,
        addOrder,
        appendToOpenAccount,
        updateOrderStatus,
        payOrder,
        markOrderAsDebt,
        recordDebtPayment,
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
