#!/usr/bin/env node
/**
 * No two app routes may match the same URL.
 *
 * The site used to have four page routes: `app/page.tsx`, `app/[...slug]`,
 * `app/[locale]` and `app/[locale]/[...slug]`. Next matches a named dynamic
 * segment ahead of a catch-all, so `/concepts/architecture` resolved as
 * `locale="concepts"`, `slug=["architecture"]`. Both routes set
 * `dynamicParams = false`, "concepts" is not in `lib/i18n.ts`'s locales, and the
 * request 404'd rather than falling through to the English route that owns it.
 *
 * Production hid it completely -- every page is prerendered to static HTML at
 * build time and served by path, so no matcher runs at request time and every
 * URL answered 200. Only `next dev`, which resolves per request, showed it: a
 * page answered once while it compiled and 404'd on every reload after. The
 * local authoring loop was broken for every English page on the site, which is
 * how 17 diagrams stayed blank without anyone noticing.
 *
 * A check that visits URLs would have to run a dev server to see this at all.
 * This one reads the route table instead: two patterns that can match one path
 * are the defect, whatever either of them then decides to do.
 *
 * Usage: node scripts/check-routes.mjs [--verbose]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

const LITERAL = 'literal';
const DYNAMIC = 'dynamic';      // [slug]      -- exactly one segment
const CATCH_ALL = 'catchAll';   // [...slug]   -- one or more segments
const OPTIONAL = 'optional';    // [[...slug]] -- zero or more segments

/** Route groups `(marketing)` and private folders `_lib` are not URL segments. */
function isUrlSegment(name) {
  return !(name.startsWith('(') && name.endsWith(')')) && !name.startsWith('@') && !name.startsWith('_');
}

function classify(name) {
  if (name.startsWith('[[...') && name.endsWith(']]')) return { kind: OPTIONAL, name };
  if (name.startsWith('[...') && name.endsWith(']')) return { kind: CATCH_ALL, name };
  if (name.startsWith('[') && name.endsWith(']')) return { kind: DYNAMIC, name };
  return { kind: LITERAL, name };
}

/** Every `page.*` under app/, as a list of URL segments. */
function routes(dir, segments = [], out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const next = isUrlSegment(entry.name) ? [...segments, classify(entry.name)] : segments;
      routes(path.join(dir, entry.name), next, out);
    } else if (/^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) {
      out.push({ file: path.relative(root, path.join(dir, entry.name)), segments });
    }
  }
  return out;
}

/**
 * Can some concrete path match both patterns?
 *
 * Segment kinds are compared pairwise; a catch-all may stand for any number of
 * segments, so it branches. Two literals only agree when they are the same word,
 * which is what keeps `/api/health` from colliding with everything.
 */
function overlaps(a, b) {
  if (a.length === 0 && b.length === 0) return true;
  if (a.length === 0) return b.every(s => s.kind === OPTIONAL);
  if (b.length === 0) return a.every(s => s.kind === OPTIONAL);

  const [x, ...ax] = a;
  const [y, ...by] = b;

  // A catch-all can swallow one segment and stay, or swallow it and finish.
  if (x.kind === CATCH_ALL || x.kind === OPTIONAL) {
    if (overlaps(a, by)) return true;      // consumes y, stays open
    if (overlaps(ax, by)) return true;     // consumes y, ends
    if (x.kind === OPTIONAL && overlaps(ax, b)) return true; // matches nothing
    return false;
  }
  if (y.kind === CATCH_ALL || y.kind === OPTIONAL) return overlaps(b, a);

  // Both single segments: dynamic matches anything, literals must be equal.
  const compatible = x.kind === DYNAMIC || y.kind === DYNAMIC || x.name === y.name;
  return compatible && overlaps(ax, by);
}

const found = routes(path.join(root, 'app'));
const show = r => '/' + r.segments.map(s => s.name).join('/');

if (verbose) {
  for (const r of found) console.log(`  ${show(r).padEnd(28)} ${r.file}`);
}

const collisions = [];
for (let i = 0; i < found.length; i++) {
  for (let j = i + 1; j < found.length; j++) {
    if (overlaps(found[i].segments, found[j].segments)) collisions.push([found[i], found[j]]);
  }
}

console.log(`Checked ${found.length} app routes for overlap.`);

if (collisions.length > 0) {
  console.error(`\n${collisions.length} pair${collisions.length === 1 ? '' : 's'} of routes can match the same URL:\n`);
  for (const [a, b] of collisions) {
    console.error(`  ${show(a)}  <->  ${show(b)}`);
    console.error(`      ${a.file}`);
    console.error(`      ${b.file}`);
  }
  console.error('\nNext picks one of them per request. With `dynamicParams = false` the loser');
  console.error('is a 404 in `next dev` even though the production build prerenders both.');
  process.exit(1);
}

console.log('No two routes can match the same URL.');
