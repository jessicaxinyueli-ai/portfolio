// Downloads every remote dependency into ./vendor and rewrites the HTML/JS to
// point at the local copies. Run once: `npm run vendor`. Requires Node 18+.
// Idempotent — safe to re-run. Nothing about the design changes; only URLs.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const vendorDir = path.join(root, 'vendor');
const fontsDir = path.join(vendorDir, 'fonts');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36';

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500;1,600&family=Archivo+Expanded:wght@500;600;700;800;900&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Noto+Sans+SC:wght@400;500;700&family=Caveat:wght@500;600;700&family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Mulish:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Work+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';

const SCRIPTS = [
  ['https://unpkg.com/react@18.3.1/umd/react.production.min.js', 'react.production.min.js'],
  ['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
  ['https://unpkg.com/@babel/standalone@7.29.0/babel.min.js', 'babel.min.js'],
  ['https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js', 'motion.js'],
  ['https://esm.sh/cobe@0.6.4?bundle', 'cobe.mjs'],
];

async function get(url, asText = true) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
}

async function main() {
  await mkdir(fontsDir, { recursive: true });

  for (const [url, name] of SCRIPTS) {
    const body = await get(url, false);
    await writeFile(path.join(vendorDir, name), body);
    console.log('vendored', name);
  }

  // Google Fonts: fetch the woff2 stylesheet, pull down each font file, rewrite.
  let css = await get(GOOGLE_FONTS_URL);
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [])];
  for (const u of urls) {
    const file = u.split('/').slice(-2).join('-').replace(/[^\w.-]/g, '_');
    await writeFile(path.join(fontsDir, file), await get(u, false));
    css = css.split(u).join(`./fonts/${file}`);
  }
  await writeFile(path.join(vendorDir, 'fonts.css'), css);
  console.log('vendored', urls.length, 'font files');

  // Rewrite references in the shipped files.
  const rewrites = [
    [/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*/g, ''],
    [/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin="">\s*/g, ''],
    [/https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/g, 'vendor/fonts.css'],
    ['https://cdn.jsdelivr.net/npm/motion@11.11.17/dist/motion.js', 'vendor/motion.js'],
    ['https://esm.sh/cobe@0.6.4', './vendor/cobe.mjs'],
    ['https://unpkg.com/react@18.3.1/umd/react.production.min.js', './vendor/react.production.min.js'],
    ['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', './vendor/react-dom.production.min.js'],
    ['https://unpkg.com/@babel/standalone@7.29.0/babel.min.js', './vendor/babel.min.js'],
  ];
  for (const file of ['Jess Li - Portfolio.dc.html', 'Jess Li - Design System.dc.html', 'support.js']) {
    const p = path.join(root, file);
    let src;
    try { src = await readFile(p, 'utf8'); } catch { continue; }
    let out = src;
    for (const [find, replace] of rewrites) {
      out = typeof find === 'string' ? out.split(find).join(replace) : out.replace(find, replace);
    }
    if (out !== src) { await writeFile(p, out); console.log('rewrote', file); }
  }
  console.log('\nDone — the site now runs fully offline.');
}

main().catch((e) => { console.error(e); process.exit(1); });
