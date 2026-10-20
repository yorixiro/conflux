/* Build-time placeholders are replaced by confluxPwaPlugin; never cache runtime/user responses. */
const BUILD_VERSION = "__CONFLUX_BUILD_VERSION__";
const PRECACHE_PATHS = ["__CONFLUX_PRECACHE__"];
const SCOPE = self.registration.scope;
const CACHE_PREFIX = `conflux-static:${encodeURIComponent(new URL(SCOPE).pathname)}:`;
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_VERSION}`;
const SHELL_URL = new URL('index.html', SCOPE).href;
const STATIC_URLS = new Set(PRECACHE_PATHS.map((path) => new URL(path, SCOPE).href));

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // addAll is all-or-nothing, including transitive/lazy chunks. A failed install leaves
    // the old worker/cache intact instead of activating an HTML-only offline shell.
    const cacheExisted = await caches.has(CACHE_NAME);
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll([...STATIC_URLS].map((url) => new Request(url, {
        cache: 'reload', credentials: 'omit', redirect: 'error'
      })));
    } catch (error) {
      if (!cacheExisted) await caches.delete(CACHE_NAME);
      throw error;
    }
    // Do not skipWaiting: an in-use app keeps its matching assets until all tabs close.
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => (name.startsWith(CACHE_PREFIX) || (new URL(SCOPE).pathname === '/' && name === 'conflux-static-v1')) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('authorization') || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Only app entries use the shell; API/document/converter navigation is untouched.
    if (url.href !== SCOPE && url.href !== SHELL_URL) return;
    event.respondWith((async () => {
      // Pin HTML to this worker's asset allowlist while a newer release waits.
      // Network is recovery only; runtime HTML must never replace the cached shell.
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match(SHELL_URL)) || fetch(request).catch(() => Response.error());
    })());
    return;
  }

  // Exact build allowlist, no directory-wide caching and no runtime cache writes.
  if (!STATIC_URLS.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(url.href)) || fetch(request);
  })());
});
