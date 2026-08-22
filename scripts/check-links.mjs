#!/usr/bin/env node
/**
 * Resolve every internal documentation link against the routes that exist.
 *
 * Why this exists
 * ---------------
 * `app/[...slug]/page.tsx` sets `dynamicParams = false` and builds its route
 * list from the `.mdx` files under `content/docs`. A link to a slug with no
 * file behind it is therefore a hard 404 — not a redirect, not a soft landing.
 *
 * Four links in the project README pointed at exactly that: `/recipes` and
 * `/tutorials` 404'd because those directories had no `index.mdx`,
 * `/learn/coming-from-ros2` had no page at all, and
 * `/concepts/execution-classes` — the page the README's own Quick Start defers
 * the timing concepts to — did not exist either. Inside the docs tree,
 * `rt-config.mdx` linked to `#horus-setup-rt---real-time-setup` while the
 * heading id `lib/mdx.tsx` generates is `horus-setup-rt-real-time-setup`: runs
 * of punctuation collapse to a single dash, so the three-dash spelling matched
 * nothing.
 *
 * Nothing checked any of it. The Rust-side `docs_contract` tests check the
 * navigation components (sidebar, footer, breadcrumb) and stop there; links in
 * prose, and `#fragment` targets anywhere, were unguarded.
 *
 * What it checks
 * --------------
 *   - every `](/path)` and `href="/path"` in content/**\/*.mdx and components/
 *   - absolute links to the documentation's own hosts, which are the same
 *     routes written the long way
 *   - the `#fragment`, against the heading ids the site actually renders
 *   - both route spellings lib/mdx.tsx accepts: `x.mdx` and `x/index.mdx`
 *
 * Other external URLs, mailto:, and bare anchors on the same page are checked
 * for the fragment only where the page is known.
 *
 * Run: node scripts/check-links.mjs
 *      node scripts/check-links.mjs ../horus/README.md   # extra files to check
 *
 * The extra-file form is how the project README gets covered: its
 * `https://docs.horusrobotics.dev/...` links are routes on this site, and four
 * of them were dead with nothing to notice.
 *
 * Exit status is 1 when something does not resolve, so CI can gate on it.
 */

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const contentDir = path.join(root, 'content', 'docs');
const componentsDir = path.join(root, 'components');

/**
 * The slug transform in lib/mdx.tsx, duplicated deliberately.
 *
 * Importing it would mean running TypeScript through a loader for a check that
 * has to work from a bare `node scripts/...`. If the two ever disagree the
 * anchors this script blesses stop matching the rendered ids — so the rule is
 * stated in both places and this comment is the pointer between them.
 */
function headingId(text) {
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return id && /^[0-9]/.test(id) ? `section-${id}` : id;
}

/** Strip inline markdown so a heading slugs the way its rendered text does. */
function headingText(raw) {
  return raw
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/&rarr;|&middot;|&nbsp;/g, ' ')
    .trim();
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// ─── The routes that exist, and the anchors each one offers ─────────────────

const routes = new Map(); // "/concepts/goals" -> Set of heading ids

for (const file of walk(contentDir)) {
  if (!file.endsWith('.mdx')) continue;
  const rel = path.relative(contentDir, file).replace(/\\/g, '/').replace(/\.mdx$/, '');
  const route = '/' + (rel.endsWith('/index') ? rel.slice(0, -'/index'.length) : rel);

  const anchors = new Set();
  let inFence = false;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (t.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(t);
    if (m) anchors.add(headingId(headingText(m[2])));
  }
  routes.set(route, anchors);
}

// ─── Every internal link, and where it was written ──────────────────────────

// The hosts this site is served from. A link written the long way is still a
// link to a route here, and is the form the project README uses.
const OWN_HOSTS = [
  'https://docs.horusrobotics.dev',
  'https://docs.horus-registry.dev',
  'http://docs.horusrobotics.dev',
  'http://docs.horus-registry.dev',
];

const extra = process.argv.slice(2).map((p) => path.resolve(root, p));
for (const f of extra) {
  if (!fs.existsSync(f)) {
    console.error(`extra file not found: ${f}`);
    process.exit(2);
  }
}

const sources = [
  ...walk(contentDir).filter((f) => f.endsWith('.mdx')),
  ...walk(componentsDir).filter((f) => f.endsWith('.tsx')),
  // `app/` too: the installed-app manifest's shortcut menu pointed at
  // `/basic-examples`, a route that has never existed, and nothing looked at it
  // because it is a `url:` field rather than an `href`.
  ...walk(path.join(root, 'app')).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts')),
  ...extra,
];

const dead = [];
let checked = 0;

for (const file of sources) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    const patterns = [
      /\]\((\/[^)\s]*)\)/g,
      /href=["'](\/[^"']*)["']/g,
      // `url: '/x'` — how the web-app manifest names its shortcut targets.
      /\burl:\s*["'](\/[^"']*)["']/g,
      // Absolute links to this site, in markdown or in an href.
      new RegExp(`(?:\\]\\(|href=["'])(${OWN_HOSTS.join('|')})([^)"'\\s]*)`, 'g'),
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(line)) !== null) {
        // The absolute pattern captures host and path separately; a bare host
        // with no path is the site root.
        const href = m[2] !== undefined ? m[2] || '/' : m[1];
        // A template literal's target is not known until render time.
        if (href.includes('${') || href.includes('`')) continue;
        // `//host` is protocol-relative and external; `/_next` and `/api` are
        // not documentation routes.
        if (href.startsWith('//') || href.startsWith('/_') || href.startsWith('/api/')) continue;
        const [slug, fragment] = href.split('#');
        // A bare `#fragment` link resolves within the page it is written on.
        const target = slug === '' ? '/' + path.relative(contentDir, file)
          .replace(/\\/g, '/')
          .replace(/\.mdx$/, '')
          .replace(/\/index$/, '') : slug;
        checked += 1;

        // Assets under public/ are served at the site root and are not routes.
        if (fs.existsSync(path.join(root, 'public', target.slice(1)))) continue;

        const anchors = routes.get(target === '/' ? '/getting-started/installation' : target);
        if (!anchors) {
          dead.push(`${rel}:${i + 1}: ${href} — no page`);
          continue;
        }
        if (fragment && !anchors.has(fragment)) {
          dead.push(`${rel}:${i + 1}: ${href} — page exists, #${fragment} does not`);
        }
      }
    }
  });
}

// A pass that examined nothing is not a pass.
if (routes.size < 100) {
  console.error(`only ${routes.size} routes found — the content walk is broken`);
  process.exit(2);
}
if (checked < 100) {
  console.error(`only ${checked} links examined — the link extractor is broken`);
  process.exit(2);
}

if (dead.length) {
  console.error(`${dead.length} internal link(s) resolve to nothing:\n`);
  for (const d of dead) console.error(`  ${d}`);
  console.error(
    '\nRoutes come from content/docs/**/*.mdx; anchors come from the headings on ' +
      'the target page. Fix the link, or add the page.'
  );
  process.exit(1);
}

console.log(`OK — ${checked} internal links across ${routes.size} routes all resolve.`);
