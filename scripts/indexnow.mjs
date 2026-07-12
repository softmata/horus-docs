#!/usr/bin/env node
// IndexNow submitter for docs.horusrobotics.dev (Bing/Yandex instant indexing). Bing powers ChatGPT
// search, Copilot, and DuckDuckGo retrieval, so pinging IndexNow the moment docs change means those AI
// answer engines pick up HORUS docs in minutes instead of waiting for a crawl. The docs site has real
// traffic today, so this is the highest-value place to have it.
//
// Auto-discovers the key from public/<key>.txt (served at docs.horusrobotics.dev/<key>.txt). Docs have no
// basePath: content/docs/{path}.mdx -> docs.horusrobotics.dev/{path}; index.mdx -> the directory path;
// content/i18n/{locale}/{path}.mdx -> docs.horusrobotics.dev/{locale}/{path}.
//
// Usage:
//   node scripts/indexnow.mjs --files content/docs/learn.mdx content/i18n/zh/learn.mdx
//   node scripts/indexnow.mjs --url https://docs.horusrobotics.dev/learn --dry-run

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HOST = 'docs.horusrobotics.dev';
const BASE = `https://${HOST}`;
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function findKey() {
  const dir = path.join(ROOT, 'public');
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((x) => /^[a-f0-9]{8,}\.txt$/i.test(x));
  return f ? f.replace(/\.txt$/, '') : null;
}

// content/docs/{path}.mdx -> /{path}  (index -> dir);  content/i18n/{locale}/{path}.mdx -> /{locale}/{path}
function fileToUrl(file) {
  const f = file.replace(/\\/g, '/');
  let rel = null;
  let m = f.match(/content\/docs\/(.+)\.mdx$/);
  if (m) rel = m[1];
  else if ((m = f.match(/content\/i18n\/([a-z]{2})\/(.+)\.mdx$/))) rel = `${m[1]}/${m[2]}`;
  if (rel === null) return null;
  rel = rel.replace(/\/index$/, '').replace(/^index$/, ''); // index.mdx -> directory path (or root)
  return rel ? `${BASE}/${rel}` : BASE;
}

function collectUrls() {
  const urls = new Set();
  const fi = args.indexOf('--files');
  if (fi >= 0) for (let i = fi + 1; i < args.length && !args[i].startsWith('--'); i++) {
    const u = fileToUrl(args[i]);
    if (u) urls.add(u);
  }
  let ui = args.indexOf('--url');
  while (ui >= 0) { if (args[ui + 1]) urls.add(args[ui + 1]); ui = args.indexOf('--url', ui + 1); }
  return [...urls];
}

async function main() {
  const key = findKey();
  const urlList = collectUrls();
  if (!key) { console.error('[indexnow] no key file in public/ — cannot submit.'); process.exit(1); }
  if (!urlList.length) { console.log('[indexnow] no URLs to submit.'); return; }

  const payload = { host: HOST, key, keyLocation: `${BASE}/${key}.txt`, urlList };
  console.log(`[indexnow] ${DRY_RUN ? '(dry-run) would submit' : 'submitting'} ${urlList.length} URL(s):`);
  urlList.forEach((u) => console.log('  ' + u));
  if (DRY_RUN) return;

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  console.log(`[indexnow] response: ${res.status} ${res.statusText}`);
  if (!res.ok) { console.error('[indexnow] submission failed:', (await res.text()).slice(0, 200)); process.exit(1); }
}

main().catch((e) => { console.error('[indexnow] failed:', e.message); process.exit(1); });
