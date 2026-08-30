#!/usr/bin/env node
/**
 * The pages must actually render. Nothing else here checks that.
 *
 * Every other check in this repository reads source or served HTML. None of them
 * loads a page. That gap is not theoretical: all 17 mermaid diagrams on the site
 * rendered nothing for as long as next-mdx-remote 6 was installed, because its
 * `blockJS` default deleted the `chart` prop before the component ever saw it.
 * The pages returned 200, the HTML still carried the <figure> and its caption,
 * no request failed and no error was logged. ~190 checks stayed green. The only
 * way to see it was to open the page.
 *
 * So this one opens every page in a real browser and asserts what the source
 * says should be there is on the screen:
 *
 *   - every <MermaidDiagram> in the .mdx renders an <svg>, with no diagram
 *     stuck on "Loading diagram..." and no "Diagram Error"
 *   - nothing logs a console error or throws
 *   - every fenced code block gets its Copy button
 *   - every in-page #anchor has a target
 *   - the page has prose in it
 *
 * It builds and serves the site itself, so `npm run check:rendered` is the whole
 * command. Point it at a running server with DOCS_URL to skip that.
 *
 * Usage: node scripts/check-rendered.mjs [--verbose] [--routes a,b,c]
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');
const routesArg = (() => {
  const i = process.argv.indexOf('--routes');
  return i === -1 ? null : (process.argv[i + 1] || '').split(',').filter(Boolean);
})();
const PORT = Number(process.env.DOCS_PORT || 3210);
const CONCURRENCY = Number(process.env.DOCS_CONCURRENCY || 4);

function mdxRoutes(dir) {
  const out = [];
  (function walk(d, base) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(p, [...base, entry.name]); continue; }
      if (!entry.name.endsWith('.mdx')) continue;
      const stem = entry.name.replace(/\.mdx$/, '');
      const segments = stem === 'index' ? base : [...base, stem];
      if (segments.length === 0) continue;
      const source = fs.readFileSync(p, 'utf8');
      out.push({
        route: '/' + segments.join('/'),
        diagrams: (source.match(/<MermaidDiagram\b/g) || []).length,
      });
    }
  })(dir, []);
  return out;
}

/**
 * Every documentation route, and how many diagrams its source asks for.
 *
 * All 160 English pages, then the localized ones. The 960 locale routes are not
 * all worth a browser each -- 954 of them fall back to the English file and
 * render the same MDX -- but the localized path is not the English one: it adds
 * LocaleSync and TranslationNotice, and it is where a fallback's canonical tag
 * is decided. So each locale contributes its translated page (real translated
 * MDX, its own diagrams) and one fallback page that carries diagrams, which is
 * the combination that would break silently.
 */
function corpus() {
  const english = mdxRoutes(path.join(root, 'content', 'docs'));
  const localesDir = path.join(root, 'content', 'locales');
  const localized = [];

  if (fs.existsSync(localesDir)) {
    for (const locale of fs.readdirSync(localesDir)) {
      const docs = path.join(localesDir, locale, 'docs');
      if (!fs.existsSync(docs)) continue;
      for (const page of mdxRoutes(docs)) {
        localized.push({ route: `/${locale}${page.route}`, diagrams: page.diagrams });
      }
      // One English fallback served under this locale, chosen for its diagrams.
      const fallback = english.find(p => p.diagrams > 0);
      if (fallback) localized.push({ route: `/${locale}${fallback.route}`, diagrams: fallback.diagrams });
    }
  }

  const seen = new Set();
  return [...english, ...localized]
    .filter(p => (seen.has(p.route) ? false : seen.add(p.route)))
    .sort((a, b) => a.route.localeCompare(b.route));
}

/** What the browser reports back about one page. */
const PROBE = `(() => {
  const anchors = Array.from(document.querySelectorAll('a[href^="#"]'))
    .map(a => decodeURIComponent(a.getAttribute('href').slice(1)))
    .filter(id => id.length > 0);
  const pres = Array.from(document.querySelectorAll('article pre'));
  const main = document.querySelector('main');
  const text = document.body.innerText;
  return {
    svgs: document.querySelectorAll('.mermaid-svg-container svg').length,
    stuck: text.split('Loading diagram').length - 1,
    diagramErrors: Array.from(document.querySelectorAll('div'))
      .filter(d => d.textContent.startsWith('Diagram Error'))
      .map(d => d.textContent.slice(0, 200)),
    preCount: pres.length,
    preWithoutCopy: pres.filter(p => !(p.parentElement && p.parentElement.querySelector('button'))).length,
    deadAnchors: anchors.filter(id => !document.getElementById(id)).slice(0, 5),
    mainLength: main ? main.innerText.trim().length : 0,
  };
})()`;

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

const pages = routesArg
  ? corpus().filter(p => routesArg.includes(p.route))
  : corpus();

if (pages.length === 0) {
  console.error('No routes to check.');
  process.exit(1);
}

let base = process.env.DOCS_URL;
let server = null;
if (!base) {
  base = `http://127.0.0.1:${PORT}`;
  if (!fs.existsSync(path.join(root, '.next', 'BUILD_ID'))) {
    console.error(`No production build found. Run \`npm run build\` first, or set DOCS_URL.`);
    process.exit(1);
  }
  console.log(`Serving the build on ${base} ...`);
  server = spawn('npx', ['next', 'start', '-p', String(PORT)], { cwd: root, stdio: 'ignore' });
}

const stop = () => { if (server && !server.killed) server.kill('SIGTERM'); };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

if (!await waitForServer(`${base}${pages[0].route}`, 120_000)) {
  console.error(`Server never became ready at ${base}.`);
  stop();
  process.exit(1);
}

const browser = await chromium.launch();
const failures = [];
const queue = pages.slice();
let done = 0;

async function worker() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const noise = [];
  page.on('console', m => { if (m.type() === 'error') noise.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => noise.push(`uncaught: ${String(e).slice(0, 200)}`));

  while (queue.length) {
    const item = queue.shift();
    noise.length = 0;
    const problems = [];
    try {
      const response = await page.goto(base + item.route, { waitUntil: 'load', timeout: 45_000 });
      if (!response || !response.ok()) problems.push(`HTTP ${response ? response.status() : 'no response'}`);

      if (item.diagrams > 0) {
        // Diagrams import mermaid and render after hydration, so wait for them
        // rather than sampling at an arbitrary moment.
        await page.waitForFunction(
          `document.querySelectorAll('.mermaid-svg-container svg').length >= ${item.diagrams}`,
          { timeout: 30_000 },
        ).catch(() => { /* reported by the assertions below */ });
      }

      const r = await page.evaluate(PROBE);
      if (r.svgs !== item.diagrams) problems.push(`${item.diagrams} <MermaidDiagram> in the source, ${r.svgs} rendered`);
      if (r.stuck > 0) problems.push(`${r.stuck} diagram(s) still on "Loading diagram..."`);
      for (const e of r.diagramErrors) problems.push(`mermaid refused the chart: ${e}`);
      if (r.preWithoutCopy > 0) problems.push(`${r.preWithoutCopy} of ${r.preCount} code blocks have no Copy button`);
      if (r.deadAnchors.length) problems.push(`#anchors with no target: ${r.deadAnchors.join(', ')}`);
      if (r.mainLength < 200) problems.push(`only ${r.mainLength} characters of text — the page is empty`);
      problems.push(...noise);
    } catch (err) {
      problems.push(`threw: ${String(err).split('\n')[0].slice(0, 200)}`);
    }

    done++;
    if (problems.length) failures.push({ route: item.route, problems });
    else if (verbose) console.log(`  ok  ${item.route}`);
  }
  await context.close();
}

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));
await browser.close();
stop();

const diagramTotal = pages.reduce((n, p) => n + p.diagrams, 0);
console.log(`Opened ${done} pages; ${diagramTotal} diagrams expected from the source.`);

if (failures.length) {
  console.error(`\n${failures.length} page${failures.length === 1 ? '' : 's'} did not render as written:\n`);
  for (const f of failures) {
    console.error(`  ${f.route}`);
    for (const p of f.problems) console.error(`      ${p}`);
  }
  process.exit(1);
}

console.log('Every page renders what its source says.');
