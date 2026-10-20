/* Conflux PWA shell cache. Keep AI/API responses, credentials and user data out of CacheStorage. */
const CACHE_NAME = 'conflux-static-v1';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/polaris-icon-192.png',
  '/icons/polaris-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS);

    // Vite adds hashed entry assets to index.html. Cache those on install,
    // otherwise the first offline launch would have HTML but no JavaScript.
    const html = await (await cache.match('/index.html')).text();
    const entryPaths = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"'?#]+(?:\.js|\.css))["']/g)]
      .map((match) => match[1]);
    await Promise.allSettled([...new Set(entryPaths)].map((path) => cache.add(path)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => name.startsWith('conflux-static-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation is network-first, then falls back to the offline app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(async (response) => {
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', response.clone());
        }
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Strict allowlist: never cache /api, provider endpoints, user files or request bodies.
  const staticResource = url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/manifest.webmanifest';
  if (!staticResource) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }))
  );
});
