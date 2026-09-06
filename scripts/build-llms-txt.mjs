#!/usr/bin/env node
/**
 * Generate `public/llms.txt` and `public/llms-full.txt` (llmstxt.org).
 *
 * Written after an experiment: eight agents were given this documentation and
 * nothing else, and asked to write a working HORUS program. All eight succeeded,
 * but every one of them had to find its way in by grepping 168 MDX files. There
 * was no entry point that says "here is what HORUS is and which page answers
 * which question", and the only machine-readable artifact — search-index.json —
 * truncates every page to 2000 characters, so cli-reference.mdx appears in it at
 * 2% of its length. It is a site-search index, not a corpus.
 *
 *   llms.txt        the map: one line per page, grouped, with its description.
 *   llms-full.txt   the territory: every page's full markdown, one fetch.
 *
 * Both are generated from the same frontmatter the site renders from, so neither
 * can drift from the pages. `check:llms` fails if the committed copies are stale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(root, 'content/docs');
const BASE = 'https://docs.horusrobotics.dev';

// Ordered so an agent reads them in the order it needs them, not alphabetically.
// Anything not listed still appears, under "Other", so a new directory cannot be
// silently dropped.
const SECTIONS = [
  ['getting-started', 'Start here'],
  ['concepts', 'Core concepts'],
  ['rust', 'Rust API reference'],
  ['rust-guide', 'Rust guide'],
  ['python', 'Python API reference'],
  ['python-guide', 'Python guide'],
  ['cpp', 'C++ API reference'],
  ['tutorials', 'Tutorials'],
  ['development', 'Building and configuring'],
  ['advanced', 'Advanced runtime'],
  ['operations', 'Operating a robot'],
  ['package-management', 'Packages and manifests'],
  ['performance', 'Performance'],
  ['plugins', 'Plugins'],
  ['recipes', 'Recipes'],
  ['examples', 'Examples'],
  ['stdlib', 'Standard library'],
  ['learn', 'Coming from other frameworks'],
  ['reference', 'Reference'],
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.mdx') || p.endsWith('.md')) out.push(p);
  }
  return out;
}

const pages = walk(DOCS).map((file) => {
  const rel = path.relative(DOCS, file).replace(/\\/g, '/');
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const base = rel.replace(/\.(mdx|md)$/, '');
  const slug = base.endsWith('/index') ? base.slice(0, -'/index'.length) : base;
  return {
    rel,
    slug: `/${slug}`,
    section: rel.includes('/') ? rel.split('/')[0] : '',
    title: data.title || path.basename(base),
    description: (data.description || '').replace(/\s+/g, ' ').trim(),
    order: typeof data.order === 'number' ? data.order : 9999,
    content: content.trim(),
  };
});

pages.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));

const known = new Set(SECTIONS.map(([k]) => k));
const grouped = new Map(SECTIONS.map(([k, label]) => [k, { label, items: [] }]));
grouped.set('', { label: 'Top level', items: [] });
grouped.set('__other', { label: 'Other', items: [] });
for (const p of pages) {
  const key = p.section === '' ? '' : known.has(p.section) ? p.section : '__other';
  grouped.get(key).items.push(p);
}

// ── llms.txt ────────────────────────────────────────────────────────────────
const lines = [];
lines.push('# HORUS');
lines.push('');
lines.push(
  '> A real-time robotics framework for Rust, Python and C++. Nodes exchange ' +
    'typed messages over shared-memory topics with a measured 151 ns one-way ' +
    'cross-process p50, scheduled by a tick loop with per-node rates, execution ' +
    'budgets and deadlines. Apache-2.0.'
);
lines.push('');
lines.push(
  'Writing a HORUS program means implementing the `Node` trait (`tick()` is called ' +
    'on a schedule), publishing and subscribing through `Topic<T>`, and adding the ' +
    'nodes to a `Scheduler`. Rust is the reference binding; Python and C++ share the ' +
    'same message types and shared-memory transport.'
);
lines.push('');
lines.push(
  'Two pages are worth reading before writing any code: **Quick Start** for the ' +
    'shape of a program, and **Common Mistakes** for the nine things that most often ' +
    'go wrong. `llms-full.txt` beside this file carries every page in full.'
);
lines.push('');

for (const [key, { label, items }] of grouped) {
  if (!items.length) continue;
  lines.push(`## ${label}`);
  lines.push('');
  for (const p of items) {
    lines.push(`- [${p.title}](${BASE}${p.slug})${p.description ? `: ${p.description}` : ''}`);
  }
  lines.push('');
}

const llms = lines.join('\n');

// ── llms-full.txt ───────────────────────────────────────────────────────────
const full = [
  '# HORUS documentation — full text',
  '',
  `Every page of ${BASE}, concatenated. Generated from the same sources the site`,
  'renders. See llms.txt for the index.',
  '',
]
  .concat(
    pages.flatMap((p) => [
      '',
      '---',
      '',
      `# ${p.title}`,
      '',
      `Source: ${BASE}${p.slug}`,
      p.description ? `\n${p.description}` : '',
      '',
      p.content,
      '',
    ])
  )
  .join('\n');

const outIndex = path.join(root, 'public/llms.txt');
const outFull = path.join(root, 'public/llms-full.txt');

if (process.argv.includes('--check')) {
  // llms.txt is committed, so it is checked unconditionally. llms-full.txt is
  // 2 MB of content that already lives in this repo as .mdx, so committing it
  // would store every page twice and rewrite the whole blob on each docs edit;
  // `npm run build` regenerates it into public/ before `next build`. It is only
  // checked when a build has produced it.
  const stale = [];
  if (!fs.existsSync(outIndex)) stale.push('public/llms.txt does not exist');
  else if (fs.readFileSync(outIndex, 'utf8') !== llms)
    stale.push('public/llms.txt is out of date');
  if (fs.existsSync(outFull) && fs.readFileSync(outFull, 'utf8') !== full)
    stale.push('public/llms-full.txt is out of date');
  if (stale.length) {
    console.error(`${stale.length} generated file(s) do not match the documentation:\n`);
    for (const s of stale) console.error(`  ${s}`);
    console.error('\nRun `npm run build:llms` and commit the result.');
    process.exit(1);
  }
  console.log(
    `OK — llms.txt and llms-full.txt are current (${pages.length} pages, ` +
      `${(full.length / 1048576).toFixed(1)} MB full text).`
  );
} else {
  fs.writeFileSync(outIndex, llms);
  fs.writeFileSync(outFull, full);
  console.log(
    `Wrote public/llms.txt (${pages.length} pages, ${(llms.length / 1024).toFixed(0)} KB) ` +
      `and public/llms-full.txt (${(full.length / 1048576).toFixed(1)} MB).`
  );
}
