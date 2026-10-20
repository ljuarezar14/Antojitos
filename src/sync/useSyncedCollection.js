import { useEffect, useRef, useState } from 'react';

export const SESSION_EXPIRED = 'antojitos:session-expired';

// Resolves with 403/409/410 bodies too, since the sync handles those; other failures throw.
// A 401 means the session ended: the app is told so it can ask for the PIN again.
export const syncRequest = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
  const body = await response.json().catch(() => null);
  if (response.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED));
  if (!response.ok && ![403, 409, 410].includes(response.status)) {
    throw new Error(body?.error || `Error ${response.status}`);
  }
  return { status: response.status, body };
};

const readStored = key => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const lastChange = item => String(item.updatedAt || item.createdAt || '');

export const OFFLINE_PREFIX = 'Sin conexión';

// Keeps one collection (orders, customers, menu...) in React state and saves each record
// on its own. `serverItems` holds the last version the server confirmed for each id; any
// local object that differs from it is pending. Pending ids survive reloads and lost signal.
//
// path: the API base, e.g. /api/orders or /api/data/customers.
// bodyKey: the field the API expects the record under when updating ('order' or 'item').
// describe: how a record is named in conflict messages.
export function useSyncedCollection({
  storageKey, syncKey = `${storageKey}__sync`, path, bodyKey = 'item', fallback, describe, sort = list => list
}) {
  const storedList = useRef(readStored(storageKey));
  const [list, setList] = useState(() => storedList.current ?? fallback);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const serverItems = useRef(new Map());
  const sync = useRef(null);
  const listRef = useRef(list);
  listRef.current = list;
  const flushing = useRef(false);
  const flushAgain = useRef(false);
  const retryTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  }, [list]);

  const saveSync = () => {
    const state = sync.current;
    setPending(state.dirty.size + state.removed.size);
    try {
      localStorage.setItem(syncKey, JSON.stringify({ dirty: [...state.dirty], removed: [...state.removed] }));
    } catch (e) {
      console.error(e);
    }
  };

  // Called once with the server's full list. Returns the merged list.
  // seed: send this browser's records even if the server never had them (empty database).
  const init = (remote, { seed = false } = {}) => {
    const stored = readStored(syncKey);
    const state = { dirty: new Set(stored?.dirty || []), removed: new Set(stored?.removed || []) };
    const remoteById = new Map(remote.map(item => [item.id, item]));
    let local = listRef.current;
    // First run of this browser with per-record saving: send whatever it holds that the
    // server is missing or has older, so nothing kept only on this device is lost.
    if (!stored && (storedList.current || seed)) {
      local = local.map(item => {
        const server = remoteById.get(item.id);
        if (!server) {
          state.dirty.add(item.id);
          return item;
        }
        if (lastChange(item) <= lastChange(server)) return item;
        state.dirty.add(item.id);
        return { ...item, orderNumber: server.orderNumber, _seq: server._seq };
      });
    }
    const localPending = local.filter(item => state.dirty.has(item.id));
    const pendingIds = new Set(localPending.map(item => item.id));
    serverItems.current = new Map(remote.map(item => [item.id, item]));
    sync.current = state;
    const merged = sort([
      ...remote.filter(item => !pendingIds.has(item.id) && !state.removed.has(item.id)),
      ...localPending
    ]);
    setList(merged);
    setReady(true);
    saveSync();
    return merged;
  };

  // Starts from this browser's copy when the server cannot be reached. Returns false if
  // this browser never synced, since then it cannot tell what the server already has.
  const initOffline = () => {
    const stored = readStored(syncKey);
    if (!stored || !storedList.current) return false;
    const state = { dirty: new Set(stored.dirty), removed: new Set(stored.removed) };
    serverItems.current = new Map(listRef.current.filter(item => !state.dirty.has(item.id)).map(item => [item.id, item]));
    sync.current = state;
    setReady(true);
    saveSync();
    return true;
  };

  // Puts server versions into the list, leaving records with unsent local changes alone.
  const applyServer = (incoming, deletedIds = []) => {
    const state = sync.current;
    if (!state) return;
    const replacements = new Map();
    const previousVersions = new Map();
    for (const item of incoming) {
      if (state.dirty.has(item.id) || state.removed.has(item.id)) continue;
      previousVersions.set(item.id, serverItems.current.get(item.id));
      serverItems.current.set(item.id, item);
      replacements.set(item.id, item);
    }
    const gone = new Set(deletedIds.filter(id => !state.dirty.has(id)));
    gone.forEach(id => serverItems.current.delete(id));
    if (!replacements.size && !gone.size) return;
    setList(previous => {
      const added = new Map(replacements);
      const next = previous.filter(item => !gone.has(item.id)).map(item => {
        if (!added.has(item.id)) return item;
        const replacement = added.get(item.id);
        added.delete(item.id);
        // An edit made in this instant stays; it is sent and resolved as a conflict.
        return item === previousVersions.get(item.id) ? replacement : item;
      });
      return added.size ? sort([...next, ...added.values()]) : next;
    });
  };

  const flush = async () => {
    const state = sync.current;
    if (!state) return;
    if (flushing.current) { flushAgain.current = true; return; }
    flushing.current = true;
    clearTimeout(retryTimer.current);
    try {
      do {
        flushAgain.current = false;
        for (const id of [...state.removed]) {
          const { status, body } = await syncRequest(`${path}/${encodeURIComponent(id)}`, { method: 'DELETE' });
          state.removed.delete(id);
          if (status === 403) {
            const kept = serverItems.current.get(id);
            if (kept) setList(previous => sort([...previous, kept]));
            setError(body.error);
          } else {
            serverItems.current.delete(id);
          }
          saveSync();
        }
        for (const id of [...state.dirty]) {
          const sent = listRef.current.find(item => item.id === id);
          if (!sent) { state.dirty.delete(id); saveSync(); continue; }
          const { status, body } = sent._seq == null
            ? await syncRequest(path, { method: 'POST', body: JSON.stringify(sent) })
            : await syncRequest(`${path}/${encodeURIComponent(id)}`, {
              method: 'PUT', body: JSON.stringify({ [bodyKey]: sent, baseSeq: sent._seq })
            });
          const confirmed = body?.[bodyKey];
          if (status === 403) {
            // Not allowed for this user: go back to what the server has.
            state.dirty.delete(id);
            const kept = serverItems.current.get(id);
            setList(previous => kept ? previous.map(item => item.id === id ? kept : item) : previous.filter(item => item.id !== id));
            setError(body.error);
          } else if (status === 410) {
            state.dirty.delete(id);
            serverItems.current.delete(id);
            setList(previous => previous.filter(item => item.id !== id));
            setError(`${describe(sent)} se eliminó en otro dispositivo.`);
          } else if (status === 409) {
            state.dirty.delete(id);
            serverItems.current.set(id, confirmed);
            setList(previous => previous.map(item => item.id === id ? confirmed : item));
            setError(`${describe(confirmed)} se modificó en otro dispositivo. Se cargó la última versión: revísalo y repite tu cambio.`);
          } else {
            serverItems.current.set(id, confirmed);
            const current = listRef.current.find(item => item.id === id);
            if (!current) state.removed.add(id);
            if (current === sent) state.dirty.delete(id);
            // Keep edits made while the request was in flight; they go out on the next pass.
            const serverFields = confirmed.orderNumber === undefined
              ? { _seq: confirmed._seq }
              : { _seq: confirmed._seq, orderNumber: confirmed.orderNumber };
            setList(previous => previous.map(item => item.id !== id ? item
              : item === sent ? confirmed
              : { ...item, ...serverFields }));
            if (current !== sent) flushAgain.current = true;
          }
          saveSync();
        }
      } while (flushAgain.current);
      setError(previous => previous.startsWith(OFFLINE_PREFIX) ? '' : previous);
    } catch (e) {
      setError(`${OFFLINE_PREFIX}: hay cambios guardados solo en este dispositivo. Se enviarán automáticamente (${e.message}).`);
      retryTimer.current = setTimeout(() => flush(), 5000);
    } finally {
      flushing.current = false;
    }
  };

  // Every local change marks the record pending and sends it.
  useEffect(() => {
    const state = sync.current;
    if (!ready || !state) return;
    const ids = new Set();
    for (const item of list) {
      ids.add(item.id);
      if (serverItems.current.get(item.id) !== item) state.dirty.add(item.id);
    }
    for (const id of serverItems.current.keys()) {
      if (!ids.has(id)) state.removed.add(id);
    }
    for (const id of state.dirty) {
      if (!ids.has(id)) state.dirty.delete(id);
    }
    saveSync();
    if (state.dirty.size || state.removed.size) flush();
  }, [ready, list]);

  return { list, setList, init, initOffline, applyServer, flush, pending, error, clearError: () => setError('') };
}
