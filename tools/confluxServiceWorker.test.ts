import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const origin = 'https://conflux.example';
const precache = ['index.html', 'assets/main.js', 'assets/lazy.js', 'manifest.webmanifest'];

function cacheStorage() {
  const key = (input: string | Request) => new URL(typeof input === 'string' ? input : input.url, origin).href;
  const fetch = vi.fn(async (input: string | Request) => {
    const response = new Response(key(input).endsWith('/index.html')
      ? '<script src="/assets/main.js"></script>' : 'public build asset');
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  });
  function createCache() {
    const entries = new Map<string, Response>();
    const cache = {
      keys: vi.fn(async () => [...entries.keys()]),
      match: vi.fn(async (input: string | Request) => entries.get(key(input))?.clone()),
      put: vi.fn(async (input: string | Request, response: Response) => { entries.set(key(input), response); }),
      addAll: vi.fn(async (inputs: (string | Request)[]) => {
        // Like Cache.addAll, commit nothing until every fetch has succeeded.
        const responses = await Promise.all(inputs.map(async (input) => {
          const response = await fetch(input);
          if (!response.ok) throw new Error('Precache failed');
          return [key(input), response] as const;
        }));
        for (const [url, response] of responses) entries.set(url, response);
      })
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
  it('precache includes lazy chunks and never forces activation over a running app', async () => {
    const sw = worker();
    await sw.install();
    expect([...sw.entries.keys()]).toContain(`${origin}/assets/lazy.js`);
    expect(sw.skipWaiting).not.toHaveBeenCalled();
  });

  it('fails installation if a lazy chunk cannot be cached, deleting only the failed release', async () => {
    const sw = worker();
    sw.fetch.mockImplementation(async (input) => {
      if (String(typeof input === 'string' ? input : input.url).endsWith('/assets/lazy.js')) {
        throw new Error('offline');
      }
      return new Response('public');
    });
    await expect(sw.install()).rejects.toThrow('offline');
    expect(sw.caches.delete).toHaveBeenCalledExactlyOnceWith('conflux-static:%2F:test-version');
    expect(await sw.caches.keys()).toEqual([]);
    expect(sw.skipWaiting).not.toHaveBeenCalled();
  });

  it.each(['network', 'http'])('preserves active A and waiting B on a failed rollback to A (%s)', async (failure) => {
    const storage = cacheStorage();
    const active = worker('/', 'A', storage);
    storage.fetch.mockImplementation(async (input) => new Response(`A:${typeof input === 'string' ? input : input.url}`));
    await active.install();
    await active.activate();
    const waiting = worker('/', 'B', storage);
    storage.fetch.mockImplementation(async (input) => new Response(`B:${typeof input === 'string' ? input : input.url}`));
    await waiting.install();
    const readCache = async (name: string) => {
      const cache = await storage.caches.open(name);
      return Promise.all((await cache.keys()).map(async (url) => [url, await (await cache.match(url))!.text()]));
    };
    const activeName = 'conflux-static:%2F:A';
    const waitingName = 'conflux-static:%2F:B';
    const activeContents = await readCache(activeName);
    const waitingContents = await readCache(waitingName);
    expect(activeContents).toEqual(precache.map((path) => [`${origin}/${path}`, `A:${origin}/${path}`]));
    expect(waitingContents).toEqual(precache.map((path) => [`${origin}/${path}`, `B:${origin}/${path}`]));

    const rollback = worker('/', 'A', storage);
    storage.fetch.mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/assets/lazy.js')) {
        if (failure === 'network') throw new Error('offline');
        return new Response('unavailable', { status: 503 });
      }
      return new Response(`rollback:${url}`);
    });
    await expect(rollback.install()).rejects.toThrow(failure === 'network' ? 'offline' : 'Precache failed');
    expect(await readCache(activeName)).toEqual(activeContents);
    expect(await readCache(waitingName)).toEqual(waitingContents);
    expect((await storage.caches.keys()).sort()).toEqual([activeName, waitingName]);
    expect(storage.caches.delete).not.toHaveBeenCalled();
    expect(rollback.skipWaiting).not.toHaveBeenCalled();
    storage.fetch.mockRejectedValue(new Error('offline'));
    expect(await (await active.request('/', 'navigate')!).text()).toBe(`A:${origin}/index.html`);
  });

  it('never intercepts unknown, authenticated, ranged, query or non-GET resources', () => {
    const sw = worker();
    for (const path of ['/api/private', '/assets/private.json', '/icons/private.png', '/assets/main.js?token=private', 'https://other.example/assets/main.js']) {
      expect(sw.request(path)).toBeUndefined();
    }
    expect(sw.request('/assets/main.js', 'cors', { method: 'POST' })).toBeUndefined();
    expect(sw.request('/assets/main.js', 'cors', { headers: { authorization: 'Bearer private' } })).toBeUndefined();
    expect(sw.request('/assets/main.js', 'cors', { headers: { range: 'bytes=0-4' } })).toBeUndefined();
  });

  it.each(['/', '/conflux/'])('pins online navigation to active A while distinct release B waits at %s', async (scope) => {
    const storage = cacheStorage();
    const aLazy = 'assets/lazy-a-111aaa.js';
    const bLazy = 'assets/lazy-b-222bbb.js';
    const aHtml = `<script type="module">import('./${aLazy}')</script>`;
    const bHtml = `<script type="module">import('./${bLazy}')</script>`;
    storage.fetch.mockImplementation(async (input) => new Response(
      (typeof input === 'string' ? input : input.url).endsWith('/index.html') ? aHtml : 'release A chunk'
    ));
    const active = worker(scope, 'A', storage, ['index.html', aLazy]);
    await active.install();
    await active.activate();
    storage.fetch.mockImplementation(async (input) => new Response(
      [origin + scope, `${origin}${scope}index.html`].includes(typeof input === 'string' ? input : input.url)
        ? bHtml : 'release B chunk'
    ));
    const waiting = worker(scope, 'B', storage, ['index.html', bLazy]);
    await waiting.install();
    expect(await (await waiting.cache.match(`${origin}${scope}index.html`))!.text()).toBe(bHtml);
    expect(waiting.entries.has(`${origin}${scope}${bLazy}`)).toBe(true);
    expect(active.entries.has(`${origin}${scope}${bLazy}`)).toBe(false);
    expect(waiting.skipWaiting).not.toHaveBeenCalled();
    storage.fetch.mockClear();

    for (const entry of [scope, `${scope}index.html`]) {
      expect(await (await active.request(entry, 'navigate')!).text()).toBe(aHtml);
    }
    expect(storage.fetch).not.toHaveBeenCalled();
    storage.fetch.mockRejectedValue(new Error('offline'));
    expect(await (await active.request(`${scope}${aLazy}`)!).text()).toBe('release A chunk');
    expect(active.request(`${scope}${bLazy}`)).toBeUndefined();
    expect(active.cache.put).not.toHaveBeenCalled();
    expect(waiting.cache.put).not.toHaveBeenCalled();

    // Only after the old clients close does B activate with its own shell/allowlist.
    await waiting.activate();
    expect(await (await waiting.request(scope, 'navigate')!).text()).toBe(bHtml);
    expect(await (await waiting.request(`${scope}${bLazy}`)!).text()).toBe('release B chunk');
    expect(await storage.caches.keys()).toEqual([`conflux-static:${encodeURIComponent(scope)}:B`]);
  });

  it('serves only the build shell rather than online private runtime HTML', async () => {
    const sw = worker();
    await sw.install();
    sw.fetch.mockResolvedValue(new Response('private runtime HTML'));
    expect(await (await sw.request('/', 'navigate')!).text()).toContain('<script');
    expect(sw.fetch).toHaveBeenCalledTimes(precache.length);
    sw.fetch.mockRejectedValue(new Error('offline'));
    expect(await (await sw.request('/', 'navigate')!).text()).toContain('<script');
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it('uses network recovery only when its cached shell is absent, without caching runtime HTML', async () => {
    const sw = worker();
    sw.fetch.mockResolvedValue(new Response('uncached recovery HTML'));
    expect(await (await sw.request('/', 'navigate')!).text()).toBe('uncached recovery HTML');
    expect(sw.cache.put).not.toHaveBeenCalled();
    expect(sw.entries.size).toBe(0);
    sw.fetch.mockRejectedValue(new Error('offline'));
    expect((await sw.request('/index.html', 'navigate')!).type).toBe('error');
    expect(sw.cache.put).not.toHaveBeenCalled();
    expect(sw.entries.size).toBe(0);
  });

  it('cleans only this scope and the legacy root cache', async () => {
    const sw = worker();
    sw.caches.keys.mockResolvedValue(['unrelated', 'conflux-static:%2Fother%2F:old', 'conflux-static:%2F:old', 'conflux-static:%2F:test-version', 'conflux-static-v1']);
    await sw.activate();
    expect(sw.caches.delete.mock.calls.flat().sort()).toEqual(['conflux-static-v1', 'conflux-static:%2F:old']);
  });

  it.each([
    ['/', '/-other/'],
    ['/conflux/', '/conflux/-other/']
  ])('activation for %s preserves the cache for %s', async (scope, otherScope) => {
    const storage = cacheStorage();
    const sw = worker(scope, 'test-version', storage);
    const other = worker(otherScope, 'test-version', storage);
    await sw.install();
    await other.install();
    const names = await storage.caches.keys();
    await sw.activate();
    expect(sw.caches.delete).not.toHaveBeenCalled();
    expect(await storage.caches.keys()).toEqual(names);
  });

  it('uses its registration scope for offline fallback on nested deployments', async () => {
    const sw = worker('/conflux/');
    await sw.install();
    sw.fetch.mockRejectedValue(new Error('offline'));
    expect(await (await sw.request('/conflux/', 'navigate')!).text()).toContain('<script');
    expect(sw.request('/', 'navigate')).toBeUndefined();
    sw.caches.keys.mockResolvedValue(['conflux-static:%2Fconflux%2F:old', 'conflux-static:%2F:old', 'conflux-static-v1']);
    await sw.activate();
    expect(sw.caches.delete).toHaveBeenCalledExactlyOnceWith('conflux-static:%2Fconflux%2F:old');
  });

  it('does not intercept API, user-file or unrelated HTML navigations', async () => {
    const sw = worker();
    for (const path of ['/api/private', '/documents/private.html', '/chatbox-converter.html']) {
      expect(sw.request(path, 'navigate')).toBeUndefined();
    }
    expect(sw.cache.put).not.toHaveBeenCalled();
  });
});
