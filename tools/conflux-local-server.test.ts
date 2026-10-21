import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startLocalServer } from './conflux-local-server';

let folder: string;
let app: Awaited<ReturnType<typeof startLocalServer>>;
let port: number;
function call(path: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }>((done, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method: options.method || 'GET', headers: options.headers }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => done({ status: res.statusCode!, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end(options.body);
  });
}
beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'conflux-local-'));
  const dist = join(folder, 'dist');
  await mkdir(dist);
  await writeFile(join(dist, 'index.html'), '<title>Conflux</title>');
  await writeFile(join(dist, 'sw.js'), '// built worker');
  await writeFile(join(dist, 'manifest.webmanifest'), '{"name":"Conflux"}');
  await writeFile(join(folder, 'private.txt'), 'not-public');
  await symlink(join(folder, 'private.txt'), join(dist, 'escape.txt'));
  app = await startLocalServer({ port: 0, root: dist });
  port = (app.server.address() as { port: number }).port;
});
afterAll(async () => {
  await app?.close();
  if (folder) await rm(folder, { recursive: true, force: true });
});

describe('Termux local entrypoint', () => {
  it('serves only built files with manifest/SW MIME and revalidation', async () => {
    expect((await call('/')).body).toContain('<title>Conflux</title>');
    expect((await call('/manifest.webmanifest')).headers['content-type']).toBe('application/manifest+json');
    expect((await call('/sw.js')).headers['cache-control']).toBe('no-cache');
    expect((await call('/sw.js', { method: 'HEAD' })).body).toBe('');
    for (const path of ['/../private.txt', '/%2e%2e%2fprivate.txt', '/escape.txt', '/.env', '/missing.js']) {
      expect((await call(path)).status).toBe(404);
    }
  });
  it('rejects foreign Host/Origin and form posts before invoking provider handlers', async () => {
    expect((await call('/', { headers: { Host: 'attacker.example' } })).status).toBe(403);
    expect((await call('/api/provider-relay', { headers: { Origin: 'https://attacker.example' } })).status).toBe(403);
    expect((await call('/api/provider-relay', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' })).status).toBe(415);
    expect((await call('/api/provider-relay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
  });
  it('reaches the real relay handler, keeps its upstream boundary and never serves HTML for unknown APIs', async () => {
    expect((await call('/api/provider-relay')).status).toBe(405);
    const response = await call('/api/provider-relay', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: `http://127.0.0.1:${port}` },
      body: JSON.stringify({ endpoint: 'https://127.0.0.1/v1/chat/completions', headers: {}, body: {} }),
    });
    expect(response.status).toBe(400);
    expect(JSON.parse(response.body).error.type).toBe('invalid_upstream');
    expect(response.headers['cache-control']).toBe('no-store');
    expect((await call('/api/provider-models')).status).toBe(501);
    expect(JSON.parse((await call('/api/health')).body).mode).toBe('pwa');
  });
});
