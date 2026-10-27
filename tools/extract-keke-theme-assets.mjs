/**
 * One-time extraction of visual assets from the user-supplied Claude HTML prototype.
 * Usage: node tools/extract-keke-theme-assets.mjs /absolute/path/to/prototype.html
 * The prototype is an input only; no mock chat implementation is copied into Conflux.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw new Error('Provide the source HTML path');
const html = readFileSync(source, 'utf8');
const output = resolve('public/theme-assets/keke');
mkdirSync(output, { recursive: true });

const cssAssets = new Map([
  ['--pi-bg', 'pois-background.jpg'],
  ['--im-doodle', 'doodle-background.jpg'],
  ['--pi-fish', 'pois-fish.png'],
  ['--pi-folder', 'pois-folder.png'],
  ['--pi-flower', 'pois-flower.png'],
  ['--pi-bubble', 'pois-bubble.png'],
  ['--pi-heart', 'pois-heart.png'],
  ['--pi-mail', 'pois-mail.png'],
  ['--pi-cloud', 'pois-cloud.png'],
  ['--pi-s1', 'pois-sticker-1.png'],
  ['--pi-s2', 'pois-sticker-2.png'],
  ['--pi-s3', 'pois-sticker-3.png'],
  ['--pi-s4', 'pois-sticker-4.png'],
  ['--pi-s5', 'pois-sticker-5.png'],
  ['--pi-s6', 'pois-sticker-6.png']
]);
const artAssets = new Map([
  ['charm', 'doodle-charm.webp'],
  ['bar', 'doodle-hanger.webp'],
  ['disc', 'doodle-disc.webp'],
  ['stp', 'doodle-decoration.webp'],
  ['cat', 'doodle-cat.webp'],
  ['barg', 'pois-hanger.webp'],
  ['discg', 'pois-disc.webp'],
  ['stpg', 'pois-decoration.webp'],
  ['charmg', 'pois-charm.webp']
]);
const doodlePaperArt = new Map([
  ['--kbun', 'doodle-paper-bunny.webp'],
  ['--kcat', 'doodle-paper-cat.webp']
]);

function extractAll(pattern, names) {
  const found = new Set();
  for (const match of html.matchAll(pattern)) {
    const name = names.get(match[1]);
    if (!name || found.has(name)) continue;
    const data = Buffer.from(match[3], 'base64');
    if (!data.length) throw new Error(`Empty asset ${name}`);
    writeFileSync(resolve(output, name), data);
    found.add(name);
  }
  const missing = [...names.values()].filter(name => !found.has(name));
  if (missing.length) throw new Error(`Missing assets: ${missing.join(', ')}`);
  console.log(`Extracted ${found.size} assets: ${[...found].join(', ')}`);
}

extractAll(/(--[\w-]+):url\(data:image\/(\w+);base64,([A-Za-z0-9+/=]+)\)/g, cssAssets);
extractAll(/"([a-z0-9]+)":\s*"data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)"/g, artAssets);
extractAll(/setProperty\('(\-\-k(?:bun|cat))','url\(data:image\/(webp);base64,([A-Za-z0-9+/=]+)\)'\)/g, doodlePaperArt);
