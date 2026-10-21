import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const origin = 'https://conflux.example';
const precache = ['index.html', 'assets/main.js', 'assets/lazy.js', 'manifest.webmanifest'];

function cacheStorage() {
  const key = (input: string | Request) => new URL(typeof input === 'string' ? input : input.url, origin).href;
  const fetch = vi.fn(async (_input: string | Request) => new Response('network response'));
  function createCache() {
    const entries = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (input: string | Request) => entries.get(key(input))?.clone()),
      put: vi.fn(async (input: string | Request, response: Response) => { entries.set(key(input), response); }),
      addAll: vi.fn(async (_inputs: Request[]) => {})
    };
    return { entries, cache };
  }
  const stores = new Map<string, ReturnType<typeof createCache>>();
  const cacheFor = (name: string) => {
    if (!stores.has(name)) stores.set(name, createCache());
    return stores.get(name)!;
  };
  const caches = {
    has: vi.fn(async (name: string) => stores.has(name)),
    open: vi.fn(async (name: string) => cacheFor(name).cache),
    keys: vi.fn(async () => [...stores.keys()]),
    delete: vi.fn(async (name: string) => stores.delete(name))
  };
  return { caches, fetch, cacheFor };
}

function worker(scopePath = '/', buildVersion = 'test-version', storage = cacheStorage(), paths = precache) {
  const listeners: Record<string, (event: any) => void> = {};
  const { caches, fetch } = storage;
  const cacheName = `conflux-static:${encodeURIComponent(scopePath)}:${buildVersion}`;
  const skipWaiting = vi.fn();
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
    .replace('"__CONFLUX_BUILD_VERSION__"', JSON.stringify(buildVersion))
    .replace('["__CONFLUX_PRECACHE__"]', JSON.stringify(paths));
  vm.runInNewContext(source, {
    self: {
      location: { origin }, registration: { scope: `${origin}${scopePath}` },
      addEventListener: (type: string, listener: (event: any) => void) => { listeners[type] = listener; },
      skipWaiting, clients: { claim: vi.fn() }
    }, caches, fetch, URL, Request, Response, Set, Promise
  });
  return {
    get entries() { return storage.cacheFor(cacheName).entries; },
    get cache() { return storage.cacheFor(cacheName).cache; },
    caches, fetch, skipWaiting,
    request(path: string, mode = 'cors', options: RequestInit = {}) {
      let response: Promise<Response> | undefined;
      listeners.fetch({
        request: { url: new URL(path, origin).href, method: options.method ?? 'GET', mode,
          headers: new Headers(options.headers) },
        respondWith: (value: Promise<Response>) => { response = value; }
      });
      return response;
    },
    async activate() {
      let pending: Promise<void> | undefined;
      listeners.activate({ waitUntil: (value: Promise<void>) => { pending = value; } });
      await pending;
    },
    async install() {
      let pending: Promise<void> | undefined;
      listeners.install({ waitUntil: (value: Promise<void>) => { pending = value; } });
      await pending;
    }
  };
}

describe('Conflux Service Worker privacy boundary', () => {
  it('precaches the exact build with safe Request options and does not force activation', async () => {
    const sw = worker();
    await sw.install();
    const requests = sw.cache.addAll.mock.calls[0][0];
    expect(requests.map((r) => r.url)).toEqual(precache.map((path) => `${origin}/${path}`));
    for (const request of requests) {
      expect(request.credentials).toBe('omit');
      expect(request.redirect).toBe('error');
      expect(request.cache).toBe('reload');
    }
    expect(sw.skipWaiting).not.toHaveBeenCalled();
  });

  it.each([false, true])('failed installation deletes only a newly created cache (existed=%s)', async (existed) => {
    const sw = worker();
    sw.caches.has.mockResolvedValue(existed);
    sw.cache.addAll.mockRejectedValue(new Error('precache failed'));
    await expect(sw.install()).rejects.toThrow('precache failed');
    expect(sw.caches.delete.mock.calls).toEqual(existed ? [] : [['conflux-static:%2F:test-version']]);
    expect(sw.skipWaiting).not.toHaveBeenCalled();
  });

  it('does not intercept private, unknown, authenticated, ranged, query or non-GET resources', () => {
    const sw = worker();
    for (const path of ['/api/private', '/assets/private.json', '/icons/private.png', '/assets/main.js?token=private', 'https://other.example/assets/main.js']) {
      expect(sw.request(path)).toBeUndefined();
    }
    for (const path of ['/api/private', '/documents/private.html', '/chatbox-converter.html', '/?private=1']) {
      expect(sw.request(path, 'navigate')).toBeUndefined();
    }
    expect(sw.request('/assets/main.js', 'cors', { method: 'POST' })).toBeUndefined();
    expect(sw.request('/assets/main.js', 'cors', { headers: { authorization: 'Bearer private' } })).toBeUndefined();
    expect(sw.request('/assets/main.js', 'cors', { headers: { range: 'bytes=0-4' } })).toBeUndefined();
  });

  it.each(['/', '/conflux/'])('uses matching cached HTML and assets at %s; network recovery never writes cache', async (scope) => {
    const sw = worker(scope, 'A');
    sw.entries.set(`${origin}${scope}index.html`, new Response('release A HTML'));
    sw.entries.set(`${origin}${scope}assets/lazy.js`, new Response('release A chunk'));
    for (const path of [scope, `${scope}index.html`]) {
      expect(await (await sw.request(path, 'navigate')!).text()).toBe('release A HTML');
    }
    expect(await (await sw.request(`${scope}assets/lazy.js`)!).text()).toBe('release A chunk');
    expect(sw.fetch).not.toHaveBeenCalled();
    if (scope !== '/') expect(sw.request('/', 'navigate')).toBeUndefined();
    sw.entries.clear();
    for (const [path, mode] of [[scope, 'navigate'], [`${scope}assets/lazy.js`, 'cors']]) {
      expect(await (await sw.request(path, mode)!).text()).toBe('network response');
    }
    expect(sw.entries.size).toBe(0);
    expect(sw.cache.put).not.toHaveBeenCalled();
    sw.fetch.mockRejectedValue(new Error('offline'));
    expect((await sw.request(scope, 'navigate')!).type).toBe('error');
  });

  it.each(['/', '/conflux/'])('activation cleans only old caches belonging to %s', async (scope) => {
    const sw = worker(scope);
    const prefix = `conflux-static:${encodeURIComponent(scope)}:`;
    const retained = ['unrelated', 'conflux-static:%2Fother%2F:old',
      `conflux-static:${encodeURIComponent(scope + '-other/')}:old`, `${prefix}test-version`];
    sw.caches.keys.mockResolvedValue([...retained, `${prefix}old`, 'conflux-static-v1']);
    await sw.activate();
    expect(sw.caches.delete.mock.calls.flat().sort()).toEqual(
      (scope === '/' ? [`${prefix}old`, 'conflux-static-v1'] : [`${prefix}old`]).sort()
    );
  });
});
