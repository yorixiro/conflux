/**
 * One-time extraction of visual assets from the user-supplied Claude HTML prototype.
 * Usage: node tools/extract-keke-theme-assets.mjs /absolute/path/to/prototype.html
 * The prototype is an input only; no mock chat implementation is copied into Conflux.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

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
  ['trk', 'doodle-scroll-track.webp'],
  ['thm', 'doodle-scroll-thumb.webp'],
  ['stp', 'doodle-decoration.webp'],
  ['cat', 'doodle-cat.webp'],
  ['barg', 'pois-hanger.webp'],
  ['discg', 'pois-disc.webp'],
  ['stpg', 'pois-decoration.webp'],
  ['charmg', 'pois-charm.webp'],
  ['thmg', 'pois-scroll-thumb.webp']
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

// Lift the exact hand-drawn vector alphabet and its deterministic phrase pattern.
const letteringSource = html.match(/手写英文信纸：矢量笔画自己画[^\n]*\n\s*\{const G=(\{[^\n]+\});/);
if (!letteringSource) throw new Error('Original hand-lettering alphabet not found');
const glyphs = runInNewContext(`(${letteringSource[1]})`, {}, { timeout: 100 });
const phrases = ['good night', 'miss you ♡', 'still here', 'sweet dream', 'hello again', 'toujours la', 'today too', 'forever ✧', 'so close', 'little star', 'stay a bit', 'hold on ♡'];
let seed = 5;
const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
let letters = '';
for (let row = 0; row < 3; row += 1) for (let column = 0; column < 4; column += 1) {
  const phrase = phrases[row * 4 + column];
  const scale = .95 + random() * .25;
  const rotate = (random() - .5) * 7;
  const xStart = 8 + (row % 2) * 45 + column * 90;
  const y = 30 + row * 66 + (random() - .5) * 6;
  let paths = '';
  let x = 0;
  for (const character of phrase) {
    const glyph = glyphs[character];
    if (!glyph) continue;
    if (glyph[0]) paths += `<path d="${glyph[0]}" transform="translate(${x.toFixed(1)} ${((random() - .5) * .9).toFixed(2)}) rotate(${((random() - .5) * 8).toFixed(1)})"/>`;
    x += glyph[1] + .5;
  }
  for (const origin of [xStart, xStart - 360]) {
    letters += `<g transform="translate(${origin.toFixed(1)} ${y.toFixed(1)}) rotate(${rotate.toFixed(1)}) scale(${scale.toFixed(2)})">${paths}</g>`;
  }
}
writeFileSync(resolve(output, 'doodle-lettering.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="198"><g fill="none" stroke="rgb(150,114,122)" stroke-opacity=".34" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${letters}</g></svg>`);
