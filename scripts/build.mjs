// "Build" = copy the static site into ./dist, minus tooling. There is no
// bundler: the site is plain HTML + one runtime script, so dist/ is deployable
// to any static host (Netlify, Vercel, GitHub Pages, S3).
import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const SKIP = new Set(['dist', 'node_modules', 'scripts', 'package.json', 'package-lock.json', 'README.md', '.git', '.DS_Store']);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const entry of await readdir(root)) {
  if (SKIP.has(entry)) continue;
  await cp(path.join(root, entry), path.join(dist, entry), { recursive: true });
}
console.log('built → dist/');
