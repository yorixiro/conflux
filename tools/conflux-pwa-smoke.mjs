import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

// Fresh, disposable browser context: never touches the user's browser profile or app data.
const root = resolve('dist');
const base = process.argv[2] || '/';
assert.ok(base.startsWith('/') && base.endsWith('/'), 'Expected an absolute base pathname');
let workerSource = await readFile(resolve(root, 'sw.js'), 'utf8');
assert.ok(!workerSource.includes('__CONFLUX_'), 'Build-time SW placeholders must be replaced');
const version = workerSource.match(/const BUILD_VERSION = "([a-f0-9]{64})"/)[1];
const precache = JSON.parse(workerSource.match(/const PRECACHE_PATHS = (\[[^\n]+\]);/)[1]);
const originalWorkerSource = workerSource;
const aHtml = await readFile(resolve(root, 'index.html'), 'utf8');
let shellHtml = aHtml;
let deployedB = false;
// Explicit upgrade fixture, not a second application build: keep the real built shell
// and assets, but give B different HTML and a unique content-hashed lazy module.
const bLazySource = 'export const release = "conflux-pwa-smoke-release-B-fixture";\n';
const bLazyFile = `assets/pwa-smoke-release-B-${createHash('sha256').update(bLazySource).digest('hex').slice(0, 12)}.js`;
assert.ok(!precache.includes(bLazyFile), 'Release B module must not exist in A');
const bTitle = 'Conflux — release B fixture';
const bHtml = aHtml.replace('<title>Conflux</title>', `<title>${bTitle}</title>`).replace('</head>', `
    <meta name="conflux-pwa-smoke-release" content="B" />
    <script type="module">window.__confluxSmokeImportReleaseB = () => import(${JSON.stringify(`${base}${bLazyFile}`)});</script>
  </head>`);
assert.ok(bHtml.includes(`<title>${bTitle}</title>`) && bHtml !== aHtml, 'Fixture B must have different HTML');
const bVersion = createHash('sha256').update(originalWorkerSource).update(bHtml).update(bLazySource).digest('hex');
const bPrecache = [...precache, bLazyFile];
const bWorkerSource = originalWorkerSource.replace(version, bVersion)
  .replace(/const PRECACHE_PATHS = \[[^\n]+\];/, `const PRECACHE_PATHS = ${JSON.stringify(bPrecache)};`);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith(base)) { res.writeHead(404).end(); return; }
    const relative = pathname.slice(base.length) || 'index.html';
    res.setHeader('Cache-Control', 'no-store');
    if (relative === 'sw.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(workerSource); return; }
    if (relative === 'index.html') { res.setHeader('Content-Type', 'text/html'); res.end(shellHtml); return; }
    if (deployedB && relative === bLazyFile) { res.setHeader('Content-Type', 'text/javascript'); res.end(bLazySource); return; }
    if (['api/pwa-smoke', 'assets/private.json', 'documents/private.html'].includes(relative)) {
      res.setHeader('Content-Type', relative.endsWith('.html') ? 'text/html' : 'application/json');
      res.end(relative.endsWith('.html') ? '<p>private-smoke-sentinel</p>' : '{"private":"private-smoke-sentinel"}');
      return;
    }
    const file = resolve(root, relative);
    if (!file.startsWith(`${root}${sep}`)) { res.writeHead(403).end(); return; }
    const content = await readFile(file);
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(content);
  } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const lazyFile = (await readdir(resolve(root, 'assets'))).find((name) => /^GroupWorld-.*\.js$/.test(name));
assert.ok(lazyFile, 'Expected a real lazy module');
const lazyUrl = `${origin}${base}assets/${lazyFile}`;
// GroupWorld has a 1.2s app preload. Preserve its original first-use check before
// update installation, then probe a separate real on-demand A chunk while B waits.
const aUpgradeLazyFile = (await readdir(resolve(root, 'assets'))).find((name) => /^ThinkingSheet-.*\.js$/.test(name));
assert.ok(aUpgradeLazyFile, 'Expected a real on-demand A module for the waiting-update probe');
const aUpgradeLazyUrl = `${origin}${base}assets/${aUpgradeLazyFile}`;
const bLazyUrl = `${origin}${base}${bLazyFile}`;
await mkdir(resolve('tmp'), { recursive: true });
const profile = await mkdtemp(resolve('tmp/conflux-pwa-browser-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: true, channel: process.env.CONFLUX_BROWSER_CHANNEL || undefined
  });
  const errors = [];
  const lazyPageRequests = [];
  const aUpgradeLazyPageRequests = [];
  const bLazyPageRequests = [];
  const observePage = (page) => {
    page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
    // Page requests exclude the worker's installation/precache fetches. Only a
    // client-side request would invalidate the claim of a first-use lazy import.
    page.on('request', (request) => {
      if (request.url() === lazyUrl) lazyPageRequests.push(request.url());
      if (request.url() === aUpgradeLazyUrl) aUpgradeLazyPageRequests.push(request.url());
      if (request.url() === bLazyUrl) bLazyPageRequests.push(request.url());
    });
  };
  context.on('page', observePage);
  for (const existingPage of context.pages()) observePage(existingPage);
  const page = await context.newPage();
  await page.goto(`${origin}${base}`);
  await page.waitForSelector('#root button');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const keys = await page.evaluate(async () => {
    const names = await caches.keys();
    return (await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((r) => r.url)))).flat();
  });
  assert.equal(keys.length, precache.length);
  for (const path of precache) assert.ok(keys.includes(`${origin}${base}${path}`), `Missing precache: ${path}`);
  const manifest = await page.evaluate(async () => {
    const url = document.querySelector('link[rel="manifest"]').href;
    return { url, data: await (await fetch(url)).json() };
  });
  assert.equal(new URL(manifest.data.start_url, manifest.url).href, `${origin}${base}`);
  assert.equal(new URL(manifest.data.scope, manifest.url).href, `${origin}${base}`);
  const cdp = await context.newCDPSession(page);
  const appManifest = await cdp.send('Page.getAppManifest');
  assert.deepEqual(appManifest.errors, [], 'Chromium must parse the built PWA manifest');
  const installability = await cdp.send('Page.getInstallabilityErrors');
  assert.deepEqual(installability.installabilityErrors, [], 'PWA must meet Chromium installability checks');

  // Private fetches and HTML navigations must not poison the public offline shell.
  await page.evaluate(async (base) => {
    await fetch(`${base}api/pwa-smoke`);
    await fetch(`${base}assets/private.json`);
  }, base);
  const privatePage = await context.newPage();
  await privatePage.goto(`${origin}${base}documents/private.html`);
  assert.ok((await privatePage.textContent('body')).includes('private-smoke-sentinel'));
  await privatePage.close();
  assert.equal(await page.evaluate(async () => !!(await caches.match(location.origin + new URL('api/pwa-smoke', location.href).pathname))), false);
  assert.equal(await page.evaluate(async () => !!(await caches.match(location.origin + new URL('assets/private.json', location.href).pathname))), false);
  assert.ok(!(await page.evaluate(async () => (await (await caches.match(new URL('index.html', location.href).href)).text()))).includes('private-smoke-sentinel'));

  assert.deepEqual(lazyPageRequests, [], 'GroupWorld must not be requested by any page before going offline');
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('#root button');
  assert.equal(await page.title(), 'Conflux');
  assert.deepEqual(lazyPageRequests, [], 'Offline shell reload must not eagerly request GroupWorld');
  const exports = await page.evaluate(async (url) => Object.keys(await import(url)), lazyUrl);
  assert.ok(exports.includes('GroupWorld'), 'Lazy module must load on first use offline');
  assert.deepEqual(lazyPageRequests, [lazyUrl], 'First GroupWorld page request must occur in the offline import');

  // Deploy explicitly different B HTML/chunk while A still controls this client.
  // B's complete cache must wait; an ONLINE reload must not mix B HTML with A's allowlist.
  await context.setOffline(false);
  deployedB = true;
  shellHtml = bHtml;
  workerSource = bWorkerSource;
  assert.equal(await (await fetch(`${origin}${base}`)).text(), bHtml, 'Server must actually deploy B HTML');
  await page.evaluate(async () => {
    window.__smokeRegistration = await navigator.serviceWorker.getRegistration();
    await window.__smokeRegistration.update();
  });
  await page.waitForFunction(() => window.__smokeRegistration.waiting?.state === 'installed');
  const aCacheName = `conflux-static:${encodeURIComponent(base)}:${version}`;
  const bCacheName = `conflux-static:${encodeURIComponent(base)}:${bVersion}`;
  const releases = await page.evaluate(async ({ aCacheName, bCacheName, bLazyUrl }) => {
    const aCache = await caches.open(aCacheName);
    const bCache = await caches.open(bCacheName);
    const shellUrl = new URL('index.html', location.href).href;
    return { names: (await caches.keys()).sort(),
      aHtml: await (await aCache.match(shellUrl)).text(),
      bHtml: await (await bCache.match(shellUrl)).text(),
      aHasBChunk: !!(await aCache.match(bLazyUrl)),
      bChunk: await (await bCache.match(bLazyUrl)).text(),
      bKeys: (await bCache.keys()).map((request) => request.url).sort() };
  }, { aCacheName, bCacheName, bLazyUrl });
  assert.deepEqual(releases.names, [aCacheName, bCacheName].sort());
  assert.equal(releases.aHtml, aHtml);
  assert.equal(releases.bHtml, bHtml);
  assert.equal(releases.aHasBChunk, false);
  assert.equal(releases.bChunk, bLazySource);
  assert.deepEqual(releases.bKeys, bPrecache.map((path) => `${origin}${base}${path}`).sort());
  await page.reload();
  await page.waitForSelector('#root button');
  assert.equal(await page.title(), 'Conflux', 'Online reload under A must keep release A HTML while B waits');
  assert.equal(await page.locator('meta[name="conflux-pwa-smoke-release"]').count(), 0, 'B HTML must not reach an A-controlled page');
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting?.state), 'installed');
  assert.deepEqual(bLazyPageRequests, [], 'A-controlled pages must not request the B-only chunk');

  assert.deepEqual(aUpgradeLazyPageRequests, [], 'No page may request the waiting-update A probe before going offline');
  await context.setOffline(true);
  const aExports = await page.evaluate(async (url) => Object.keys(await import(url)), aUpgradeLazyUrl);
  assert.ok(aExports.includes('ThinkingSheet'), 'Matching A lazy module must load on first use offline while B waits');
  assert.deepEqual(aUpgradeLazyPageRequests, [aUpgradeLazyUrl], 'First A probe page request must occur in the offline import');

  const workers = context.serviceWorkers();
  let updatedWorker;
  for (const candidate of workers) {
    if (await candidate.evaluate(() => BUILD_VERSION) === bVersion) updatedWorker = candidate;
  }
  assert.ok(updatedWorker, 'Expected the installed update worker');
  await page.close();
  // Wait with no controlled tabs before opening another client; otherwise that navigation
  // can keep the old worker alive. Poll the worker itself, not an async RAF predicate.
  await updatedWorker.evaluate(async (bCacheName) => {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const names = await caches.keys();
      if (names.length === 1 && names[0] === bCacheName) return;
      await new Promise((done) => setTimeout(done, 50));
    }
    throw new Error('Updated worker did not activate and clean its old cache');
  }, bCacheName);
  const nextPage = await context.newPage();
  // Still offline: B's matching shell and first-use B-only lazy module must both load.
  await nextPage.goto(`${origin}${base}`);
  await nextPage.waitForSelector('#root button');
  assert.equal(await nextPage.title(), bTitle);
  assert.equal(await nextPage.locator('meta[name="conflux-pwa-smoke-release"]').getAttribute('content'), 'B');
  assert.deepEqual(await nextPage.evaluate(() => caches.keys()), [bCacheName]);
  await nextPage.waitForFunction(() => typeof window.__confluxSmokeImportReleaseB === 'function');
  assert.deepEqual(bLazyPageRequests, [], 'B-only module must not be requested before offline first use');
  assert.equal(await nextPage.evaluate(async () => (await window.__confluxSmokeImportReleaseB()).release),
    'conflux-pwa-smoke-release-B-fixture', 'Explicit B fixture module must import offline after activation');
  assert.deepEqual(bLazyPageRequests, [bLazyUrl]);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', base, precached: precache.length,
    offlineReload: true, firstUseLazyModule: lazyFile, privateCacheIsolation: true,
    firstUseLazyModuleWhileUpdateWaits: aUpgradeLazyFile,
    upgradeFixture: { distinctHtml: true, contentHashedLazyModule: bLazyFile },
    onlineReloadPinnedToActiveRelease: true, activatedReleaseOfflineFirstUse: true,
    waitingUpdateAndCleanup: true, browserErrors: errors }, null, 2));
  await context.close();
} finally {
  await context?.close();
  await new Promise((done) => server.close(done));
  await rm(profile, { recursive: true, force: true });
}
