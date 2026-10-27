#!/usr/bin/env node
// Local-only dev server: serves the site like `serve` did (including the
// clean-URL fallback to index.html that client-side routing relies on),
// plus one extra endpoint — POST /api/save-text — that the in-page text
// editor (see the inline-editor script near the end of
// "Jess Li - Portfolio.dc.html") calls to write edited copy straight back
// into that source file. Never deployed; this is dev tooling only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_FILE = path.join(ROOT, 'Jess Li - Portfolio.dc.html');
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Replaces exactly one occurrence of `oldText` with `newText` inside a
// backtick/quote-delimited string literal in `content`. Refuses (returns
// null) unless `oldText` appears exactly once in the whole file, so a
// non-unique or already-changed snippet is reported back, never guessed at.
function applyEdit(content, oldText, newText) {
  if (oldText === newText) return { content, status: 'unchanged' };
  if (!oldText.trim()) return { content, status: 'skipped', reason: 'empty source text' };
  const count = content.split(oldText).length - 1;
  if (count === 0) return { content, status: 'skipped', reason: 'not found (file may have changed)' };
  if (count > 1) return { content, status: 'skipped', reason: `ambiguous — appears ${count} times` };
  const idx = content.indexOf(oldText);
  const next = content.slice(0, idx) + newText + content.slice(idx + oldText.length);
  return { content: next, status: 'applied' };
}

async function handleSaveText(req, res) {
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: 'invalid JSON body' });
  }
  const edits = Array.isArray(payload.edits) ? payload.edits : [];
  if (!edits.length) return sendJson(res, 400, { error: 'no edits provided' });

  let content;
  try {
    content = fs.readFileSync(SRC_FILE, 'utf8');
  } catch (e) {
    return sendJson(res, 500, { error: 'could not read source file: ' + e.message });
  }

  const applied = [];
  const skipped = [];
  for (const { old: oldText, new: newText } of edits) {
    if (typeof oldText !== 'string' || typeof newText !== 'string') {
      skipped.push({ old: oldText, reason: 'malformed edit' });
      continue;
    }
    const result = applyEdit(content, oldText, newText);
    content = result.content;
    if (result.status === 'applied') applied.push({ old: oldText, new: newText });
    else if (result.status === 'skipped') skipped.push({ old: oldText, new: newText, reason: result.reason });
  }

  if (applied.length) {
    try {
      fs.writeFileSync(SRC_FILE, content, 'utf8');
    } catch (e) {
      return sendJson(res, 500, { error: 'could not write source file: ' + e.message });
    }
  }
  sendJson(res, 200, { applied, skipped });
}

// Mirrors serve.json's explicit route rewrites (the same ones the
// previous `serve`-based setup used) rather than a blanket SPA fallback,
// so an actually-unknown path still 404s.
let REWRITES = [];
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'serve.json'), 'utf8'));
  REWRITES = Array.isArray(cfg.rewrites) ? cfg.rewrites : [];
} catch {
  // No serve.json (or unparsable) — fall back to no rewrites.
}

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const rewrite = REWRITES.find((r) => r.source === urlPath);
  const targetPath = rewrite ? rewrite.destination : urlPath;
  const filePath = path.join(ROOT, targetPath);

  // Guard against path traversal outside the project root.
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send404(res);
    const ext = path.extname(filePath).toLowerCase();
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) return send404(res);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/save-text') {
    return handleSaveText(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end('Method not allowed');
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`dev-server listening on http://localhost:${PORT}`);
});
