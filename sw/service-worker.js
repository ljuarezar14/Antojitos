// Keeps the app openable without signal. The build (vite.config.js) replaces the two
// placeholders with this version's files, so each deploy installs a fresh cache.
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const APP_CACHE = `app-${VERSION}`;
const RUNTIME_CACHE = 'runtime';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(APP_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('app-') && key !== APP_CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Pages: always try the network so a new version or the Access login shows up; without
  // signal, open the copy of the app saved at install.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match('/', { ignoreSearch: true })) || Response.error()));
    return;
  }

  // Uploaded images (QR, logo) change URL when replaced, so a saved copy is always valid.
  if (url.pathname.startsWith('/api/files/')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }
  // Data always comes from the network; the app keeps its own copy for offline use.
  if (url.pathname.startsWith('/api/')) return;

  // Built files have a content hash in their name; anything else is refreshed when online.
  event.respondWith(url.pathname.startsWith('/assets/')
    ? cacheFirst(request, APP_CACHE)
    : fetch(request).then(response => {
      if (response.ok) caches.open(APP_CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error()));
});
