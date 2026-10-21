import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import providerRelay from '../api/provider-relay.js';
import embeddings from '../api/provider-embeddings.js';
import images from '../api/provider-images.js';
import audio from '../api/provider-audio.js';
import diagnostics from '../api/client-diagnostics.js';

// Local transport only: reuse the existing provider handlers and their validators.
// No provider selection, credentials, chat data, or migrations belong here.
const handlers: Record<string, typeof providerRelay> = {
  '/api/provider-relay': providerRelay,
  '/api/provider-embeddings': embeddings,
  '/api/provider-images': images,
  '/api/provider-audio': audio,
  '/api/client-diagnostics': diagnostics,
};
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.wasm': 'application/wasm',
};
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const maxBodyBytes = 32 * 1024 * 1024;

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

export async function startLocalServer({ dev = false, port = dev ? 5173 : 4173, root = resolve(repo, 'dist') }: {
  dev?: boolean; port?: number; root?: string;
} = {}) {
  const dist = dev ? root : await realpath(root);
  if (!dev) {
    const worker = await readFile(resolve(dist, 'sw.js'), 'utf8');
    if (worker.includes('__CONFLUX_')) throw new Error('请先运行 npm run build，生成完整 PWA。');
    await stat(resolve(dist, 'index.html'));
  }
  let vite: import('vite').ViteDevServer | undefined;
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const actualPort = (server.address() as { port: number }).port;
      const host = req.headers.host;
      if (host !== `127.0.0.1:${actualPort}` && host !== `localhost:${actualPort}`) {
        json(res, 403, { error: 'Only the local device may access this server.' }); return;
      }
      const url = new URL(req.url || '/', `http://${host}`);
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        if ((req.headers.origin && req.headers.origin !== `http://${host}`)
          || req.headers['sec-fetch-site'] === 'cross-site') {
          json(res, 403, { error: 'Same-origin requests only.' }); return;
        }
        if (url.pathname === '/api/health' && req.method === 'GET') {
          json(res, 200, { app: 'Conflux', mode: dev ? 'development' : 'pwa' }); return;
        }
        const handler = handlers[url.pathname];
        if (!handler) {
          json(res, 501, { error: { message: '此本地入口尚未提供该功能；聊天请使用设置中的自定义 Provider。', type: 'not_available_locally' } }); return;
        }
        if (req.method === 'POST' && !/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
          json(res, 415, { error: 'Expected application/json.' }); return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > maxBodyBytes) { json(res, 413, { error: 'Request is larger than 32 MiB.' }); return; }
          chunks.push(Buffer.from(chunk));
        }
        let body: unknown = {};
        try { if (size) body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
        catch { json(res, 400, { error: 'Invalid JSON.' }); return; }
        const apiRequest = Object.assign(req, { body }) as VercelRequest;
        const apiResponse = Object.assign(res, {
          status(code: number) { res.statusCode = code; return this; },
          json(value: unknown) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return this; },
          send(value: string | ArrayBuffer) { res.end(typeof value === 'string' ? value : Buffer.from(value)); return this; },
        }) as VercelResponse;
        res.setHeader('Cache-Control', 'no-store');
        await handler(apiRequest, apiResponse);
        return;
      }
      if (vite) { vite.middlewares(req, res); return; }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return;
      }
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      // Resolve symlinks too: only built public files may be served, never repository files.
      const file = await realpath(resolve(dist, relative));
      if (!file.startsWith(dist + sep) || relative.split('/').some((part) => part.startsWith('.'))) {
        res.writeHead(404).end(); return;
      }
      const info = await stat(file);
      if (!info.isFile()) { res.writeHead(404).end(); return; }
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
        'Content-Length': info.size,
      });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
    } catch {
      if (!res.headersSent) json(res, 404, { error: 'Resource unavailable.' });
      else res.end();
    }
  });
  try {
    if (dev) {
      const { createServer: createViteServer } = await import('vite');
      vite = await createViteServer({
        root: repo, server: { middlewareMode: true, hmr: { server }, host: '127.0.0.1' },
      });
    }
    await new Promise<void>((done, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => { server.off('error', reject); done(); });
    });
  } catch (error) {
    await vite?.close();
    throw error;
  }
  return {
    server,
    async close() {
      await vite?.close();
      await new Promise<void>((done) => { server.close(() => done()); server.closeIdleConnections(); });
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dev = process.argv.includes('--dev');
  try {
    const app = await startLocalServer({ dev });
    console.log(`Conflux ${dev ? '热开发' : 'PWA'}：http://127.0.0.1:${dev ? 5173 : 4173}`);
    console.log(dev ? '保存源码后自动更新。正式安装请运行 npm run termux:pwa。' : '用同一部手机的 Chrome 打开上述地址，再从菜单安装。');
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => { void app.close().then(() => process.exit(0)); });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : '启动失败。');
    process.exitCode = 1;
  }
}
