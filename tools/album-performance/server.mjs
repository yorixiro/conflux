// Opt-in, isolated fixture server. No app storage and no production instrumentation.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
import {relative, resolve} from 'node:path';
const root = process.cwd();
const baseline = process.argv.find(a => a.startsWith('--baseline='))?.slice(11);
if (baseline && !/^[a-f0-9]{7,40}$/.test(baseline)) throw new Error('--baseline must be a commit SHA');
const revision = baseline ? execFileSync('git', ['rev-parse', '--verify', `${baseline}^{commit}`], {encoding:'utf8'}).trim() : 'working-tree';
export const server = await createServer({
  configFile: false,
  define: {__ALBUM_REVISION__: JSON.stringify(revision)},
  plugins: [{
    name: 'album-performance-fixture', enforce: 'pre',
    resolveId(id, importer) {
      if (importer?.endsWith('/ArchiveFolio.tsx') && id.endsWith('/assetStore')) return '\0album-fixture-assets';
    },
    load(id) {
      if (id === '\0album-fixture-assets') return `export async function getAssetPreviewBlob(id) {
        await new Promise(r => setTimeout(r, 100));
        return new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#8cb1c5"/><circle cx="512" cy="512" r="300" fill="#f2d7ad"/><text x="250" y="550" font-size="80">'+id+'</text></svg>'], {type:'image/svg+xml'});
      } export const getAssetBlob = getAssetPreviewBlob;`;
      if (baseline && id.startsWith(resolve(root, 'src') + '/')) return execFileSync('git', ['show', `${revision}:${relative(root,id)}`], {encoding:'utf8'});
    },
    transform(code, id) {
      // Permit the fixture on software WebGL too; the report identifies the renderer.
      if (id.endsWith('/sasshi/support.ts')) return 'export const canRender3d = () => true;';
      if (id.endsWith('/bag/addon.ts')) return code.replace('return addon;', 'window.dispatchEvent(new CustomEvent("album-pouch", {detail:addon})); return addon;');
      if (!id.endsWith('/sasshi/scene.ts')) return;
      return code.replace('const font = fonts.sans;', `const font = fonts.sans;
        window.dispatchEvent(new CustomEvent('album-renderer', {detail: renderer}));`)
        .replace('for (const a of addons) adopt(a);', `for (const a of addons) adopt(a);
        window.dispatchEvent(new CustomEvent('album-studio', {detail: {scene, camera}}));`)
        .replace('function tick(ms: number) {', 'function tick(ms: number) { window.dispatchEvent(new CustomEvent("album-frame-start", {detail: ms}));')
        .replace('else lastT = 0;\n  }', 'else lastT = 0; window.dispatchEvent(new Event("album-frame-end"));\n  }');
    },
  }, react()],
  server: {host: '127.0.0.1', port: 5179, strictPort: true},
});
await server.listen();
console.log('Album fixture: http://localhost:5179/tools/album-performance/index.html');
