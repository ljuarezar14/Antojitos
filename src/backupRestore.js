// Restores a backup (a downloaded file or one of the automatic copies) into the server.
// The data is sent in parts of a few hundred KB, so even years of orders fit the
// database's per-request limits: the first part replaces everything, the rest add to it.

const BACKUP_PREFIX = 'antojitos_miriam_';
const PART_BYTES = 500_000;

const post = async (path, body, failure) => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || failure);
  }
};

// Splits items into groups whose JSON stays under PART_BYTES; always at least one group.
export function inParts(items, size = item => JSON.stringify(item).length) {
  const parts = [[]];
  let bytes = 0;
  for (const item of items) {
    const itemBytes = size(item);
    if (parts.at(-1).length && bytes + itemBytes > PART_BYTES) {
      parts.push([]);
      bytes = 0;
    }
    parts.at(-1).push(item);
    bytes += itemBytes;
  }
  return parts;
}

// uploadImage(name, dataUrl) stores an image and returns the URL the settings keep.
// onProgress(text) reports each step.
export async function restoreBackup(parsed, { uploadImage, onProgress = () => {} }) {
  const data = parsed?.data || parsed;
  if (!data || !Object.keys(data).some(key => key.startsWith(BACKUP_PREFIX))) {
    throw new Error('El archivo no contiene datos válidos de Antojitos.');
  }
  const read = (suffix, fallback) => {
    try { return JSON.parse(data[`${BACKUP_PREFIX}${suffix}`]) ?? fallback; } catch { return fallback; }
  };
  const settings = read('settings', {});
  // Server backups carry the images apart; older ones inside the settings.
  for (const [key, name] of [['yapeQr', 'yape-qr'], ['logo', 'logo']]) {
    const image = parsed.files?.[name] || settings[key];
    if (String(image || '').startsWith('data:')) {
      onProgress('Subiendo imágenes…');
      settings[key] = await uploadImage(name, image);
    }
  }

  // Users and settings go in the first part, which replaces what the server has.
  const first = {
    users: read('users_list', []),
    config: [
      { id: 'settings', value: settings },
      { id: 'greeting', value: data[`${BACKUP_PREFIX}greeting`] || '' }
    ]
  };
  const rest = ['customers', 'categories', 'cremas', 'menu', 'expenses', 'closings']
    .flatMap(name => read(name, []).map(item => [name, item]));
  const recordParts = inParts(rest, ([, item]) => JSON.stringify(item).length);
  for (const [index, part] of recordParts.entries()) {
    onProgress(`Restaurando datos (${index + 1} de ${recordParts.length})…`);
    const collections = index === 0 ? { ...first } : {};
    for (const [name, item] of part) (collections[name] ||= []).push(item);
    await post('/api/data/import', { collections, reset: index === 0 }, 'No se pudo guardar el respaldo en la base de datos');
  }

  const orderParts = inParts(read('orders', []));
  for (const [index, orders] of orderParts.entries()) {
    onProgress(`Restaurando pedidos (${index + 1} de ${orderParts.length})…`);
    await post('/api/orders/import', { orders, reset: index === 0 }, 'No se pudieron guardar los pedidos del respaldo');
  }

  // This browser's copies are older than the restored data; it reloads from the server.
  Object.keys(localStorage)
    .filter(key => key.startsWith(BACKUP_PREFIX) && !['user', 'theme'].includes(key.slice(BACKUP_PREFIX.length)))
    .forEach(key => localStorage.removeItem(key));
}
