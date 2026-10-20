import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { build } from 'vite';
import type { RollupOutput } from 'rollup';
import { confluxPwaPlugin } from './confluxPwaPlugin';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = process.env.TMPDIR && !/^\/(tmp|var\/tmp)$/.test(process.env.TMPDIR)
  ? process.env.TMPDIR : resolve(repo, 'tmp');
mkdirSync(scratch, { recursive: true });
const root = mkdtempSync(resolve(scratch, 'conflux-pwa-test-'));
writeFileSync(resolve(root, 'index.html'), '<script type="module" src="/main.js"></script>');
writeFileSync(resolve(root, 'main.js'), "import('./lazy.js').then(console.log);");
writeFileSync(resolve(root, 'lazy.js'), 'export const publicValue = 1;');
afterAll(() => rmSync(root, { recursive: true, force: true }));

async function compile(base = '/') {
  const output = await build({
    configFile: false, root, base, publicDir: resolve(repo, 'public'), logLevel: 'silent',
    plugins: [confluxPwaPlugin()], build: { write: false, sourcemap: true }
  }) as RollupOutput;
  const worker = output.output.find((item) => item.fileName === 'sw.js');
  if (!worker || worker.type !== 'asset') throw new Error('No generated Service Worker');
  const source = String(worker.source);
  return { source, output: output.output,
    paths: JSON.parse(source.match(/const PRECACHE_PATHS = (\[[^\n]+\]);/)![1]) as string[],
    version: source.match(/const BUILD_VERSION = "([a-f0-9]{64})"/)![1] };
}

describe('Conflux Vite PWA build', () => {
  it('emits a fully versioned build allowlist including lazy chunks but excluding sourcemaps', async () => {
    const result = await compile();
    expect(result.source).not.toContain('__CONFLUX_');
    expect(result.paths).toContain('index.html');
    expect(result.paths.some((name) => /^assets\/lazy-.*\.js$/.test(name))).toBe(true);
    for (const item of result.output.filter((item) => item.fileName.startsWith('assets/') && !item.fileName.endsWith('.map'))) {
      expect(result.paths).toContain(item.fileName);
    }
    expect(result.paths.some((name) => name.endsWith('.map'))).toBe(false);
    expect(result.paths).not.toContain('sw.js');
    expect(readFileSync(resolve(repo, 'public/sw.js'), 'utf8')).toContain('__CONFLUX_BUILD_VERSION__');
    const same = await compile();
    expect(same.version).toBe(result.version);
    writeFileSync(resolve(root, 'index.html'), '<title>New public shell</title><script type="module" src="/main.js"></script>');
    const changed = await compile();
    expect(changed.version).not.toBe(result.version);
    const nested = await compile('/conflux/');
    expect(nested.version).not.toBe(changed.version);
    expect(nested.paths).toContain('index.html');
  });
});
