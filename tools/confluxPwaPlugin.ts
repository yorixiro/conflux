import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';

// Only explicitly public files and Rollup-generated assets can enter the shell cache.
const publicPaths = [
  'manifest.webmanifest',
  'icons/polaris-icon-180.png',
  'icons/polaris-icon-192.png',
  'icons/polaris-icon-512.png',
  'startup/polaris-startup-wallpaper.jpg'
];

export function confluxPwaPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'conflux-pwa-shell',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) { config = resolved; },
    generateBundle(_options, bundle) {
      const template = readFileSync(resolve(config.publicDir, 'sw.js'), 'utf8');
      const generatedPaths = Object.keys(bundle)
        .filter((name) => name === 'index.html' || (name.startsWith('assets/') && !name.endsWith('.map')))
        .sort();
      const hash = createHash('sha256').update(template).update(config.base);
      for (const name of generatedPaths) {
        const item = bundle[name];
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const name of publicPaths) {
        hash.update(name).update(readFileSync(resolve(config.publicDir, name)));
      }
      const source = template
        .replace('"__CONFLUX_BUILD_VERSION__"', JSON.stringify(hash.digest('hex')))
        .replace('["__CONFLUX_PRECACHE__"]', JSON.stringify([...generatedPaths, ...publicPaths]));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    }
  };
}
