#!/usr/bin/env node
/**
 * Keep the site's performance claims traceable to a benchmark.
 *
 * Why this exists
 * ---------------
 * "575x faster than ROS2" was the project's headline for a long time, and it is
 * backed by nothing: no benchmark in the HORUS repository produces it, no report
 * contains it, and the only ROS 2 latency the repository holds at all is REP
 * 2014's ~5,000 ns, quoted as literature by `dds_comparison_benchmark`. The
 * README was corrected and `horus_manager/tests/perf_claims_contract.rs` was
 * written to keep it corrected — but that test scans
 * `horus-docs/content/docs/**\/*.mdx` and nothing else.
 *
 * Everything outside that glob kept serving the retracted number: the `<title>`
 * and OG card of all 152 documentation pages (`app/[...slug]/page.tsx`), the
 * site metadata (`app/page.tsx`), the installed-app manifest (`app/manifest.ts`),
 * and a bar chart of five unsourced ROS 2 speedups in
 * `components/BenchmarkCharts.tsx`. The claim was retracted in one file and
 * live on every page.
 *
 * This is the docs-side half of that contract, over the files the Rust test
 * cannot see: `app/`, `components/`, `lib/`, `scripts/`, `public/`, and the
 * Markdown alongside them.
 *
 * What it checks
 * --------------
 *   1. The retracted ratios appear nowhere. The list is every bar the
 *      `SpeedupChart` used to draw (575x, 940x, 750x, 167x) plus the three the
 *      blog's retracted post printed (550x, 585x, 875x).
 *   2. "87ns" / "87 ns" appears nowhere: it is the phantom latency figure that
 *      travelled with the 575x claim. The measured medians are 63 ns
 *      same-process and 151 ns cross-process.
 *   3. A line naming a competitor and carrying a ratio at or above the ceiling
 *      is flagged. The measured spread against the ROS 2 reference is 24x-79x,
 *      so a three-digit competitor ratio is fabricated by construction.
 *   4. Chart data: a `speedup:` datum at or above the ceiling, and a competitor
 *      series (`tf2:`, `ros2:`, `dds:`, `reference:`) drawn in a component that
 *      states no provenance for it.
 *   5. A component that admits "Not measured" and asserts an "Nx faster" ratio
 *      in the same breath.
 *
 * It does not check whether any surviving number is correct. It checks that the
 * numbers we know to be unsupported do not come back.
 *
 * Run: node scripts/check-claims.mjs
 * Exit status is 1 on a violation, so CI can gate on it.
 */

import fs from 'fs';
import path from 'path';

const root = process.cwd();

// Directories whose contents are ours to keep honest. `content/docs` is left to
// perf_claims_contract.rs, which already walks it from the Rust side; scanning
// it here too is harmless and catches the case where that job is not run.
//
// `scripts/` and `public/` were outside the walk, and both serve claims:
// `build-search-index.js` writes the blob the site search reads, and
// `public/og-image.svg` IS the share card. `''` is the repository root, whose
// `README.md` is the first thing a visitor to the GitHub mirror reads. The
// original defect was a claim retracted in one directory and live in the one
// next to it, so a scan that stops at a directory boundary reproduces it.
const SCAN_DIRS = ['app', 'components', 'lib', 'content', 'scripts', 'public', ''];
const SCAN_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.mdx', '.md', '.svg', '.json'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'out', 'dist']);

// Generated artefacts. `search-index.json` and `extracted-code-blocks.json` are
// built from `content/`, which is scanned directly — flagging the derived copy
// would report the same claim twice and point at a file nobody edits.
const SKIP_FILES = new Set([
  'scripts/check-claims.mjs',
  'public/search-index.json',
  'extracted-code-blocks.json',
  'package-lock.json',
]);

/**
 * Ratios the repository cannot support.
 *
 * 575/940/750/167 are the four bars `SpeedupChart` drew under the heading
 * "HORUS Speedup vs ROS2"; 550/585/875 are the three the blog's retracted
 * benchmarking post tabulated. Only 575 was ever on a ban list, which is the
 * shape of the whole defect: the number that got famous was guarded and the
 * four sitting beside it in the same array were not.
 */
const RETRACTED_RATIOS = ['575x', '575 x', '940x', '750x', '167x', '550x', '585x', '875x'];

/**
 * Highest per-message speedup any benchmark in the HORUS repository produces
 * (CmdVel 16B, 67x). A competitor ratio above this is not a measurement.
 */
const SPEEDUP_CEILING = 100;

/** The latency figure that travelled with them and exists in no benchmark. */
const PHANTOM_LATENCY = [/\b87\s?ns\b/i, /\b87\s?nanoseconds\b/i];

/**
 * Names that make a number a competitor comparison rather than a HORUS figure.
 *
 * Word-bounded on purpose: a bare `includes('dds')` also fires on "adds" and
 * "odds", and a rule that cries wolf on an English word is a rule someone
 * deletes.
 */
const COMPETITORS = /\b(?:ros ?2|tf2|cyclonedds|fastdds|iceoryx2?|dds)\b/i;

/** Chart series keys that hold a competitor's numbers rather than HORUS's. */
const COMPETITOR_SERIES = /^\s*(?:const\s+)?.*\b(tf2|ros2|dds|reference)\s*:\s*(\d[\d_.]*)/;

/**
 * Wording that tells the reader where a number came from.
 *
 * A chart may draw a competitor series it did not measure — that is what a
 * published reference figure is for — but it may not draw one silently. This
 * is the marker set the corrected charts already use.
 */
const PROVENANCE = /not measured|no source|published reference|literature|measured on|REP\s?2014|no TF2 comparison/i;

/** An assertion of the form "Nx faster" or "N-Mx faster". */
const FASTER_RATIO = /(\d[\d,]*(?:\.\d+)?)\s*(?:-|–|to)?\s*(\d[\d,]*(?:\.\d+)?)?\s*x\s*(?:faster|speedup)/gi;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/**
 * The root entry of SCAN_DIRS means "root-level files only" — walking it would
 * re-walk every directory above and double-report.
 */
function filesIn(dir) {
  if (dir === '') {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.join(root, e.name));
  }
  return walk(path.join(root, dir));
}

const files = SCAN_DIRS.flatMap(filesIn).filter((f) =>
  SCAN_EXTENSIONS.includes(path.extname(f))
);

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

/**
 * Blank out block comments, keeping every newline so line numbers still line up.
 *
 * This used to be a per-line test, and it had the defect in both directions.
 *
 * Too eager: `*` counted as a comment marker everywhere, and in Markdown `*` is
 * a bullet — so `* HORUS is 575x faster than ROS2.`, a claim in a list on a
 * page, was read as a JSDoc continuation and skipped, while the same sentence
 * with a `-` bullet was caught.
 *
 * Not eager enough: only the FIRST line of a JSX comment starts with `{/*`. The
 * body of a `{/* ... *\/}` block — which is how this codebase records what a
 * retracted claim used to say, right where it used to say it — reads as served
 * prose, so writing down the defect reintroduced it as far as this check was
 * concerned.
 *
 * A block-level strip gets both right. End-of-line `//` is deliberately left
 * alone: a `//` inside a URL in a string literal would swallow the rest of the
 * line, and hiding a claim is the failure that matters here.
 */
function stripBlockComments(text, ext) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  if (CODE_EXTENSIONS.includes(ext)) {
    return text.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, blank);
  }
  if (ext === '.mdx' || ext === '.md') {
    // JSX comments (MDX) and HTML comments. A bare `/* */` in Markdown is
    // ordinary text or a C code sample, so it is not stripped here.
    return text
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
      .replace(/<!--[\s\S]*?-->/g, blank);
  }
  return text;
}

/**
 * Is this line a whole-line comment rather than something a reader is served?
 *
 * Block comments are already gone by the time this runs; what is left is the
 * `//` and `<!--` forms that start a line.
 */
function isCommentLine(trimmed, ext) {
  if (trimmed.startsWith('//')) return true;
  if (trimmed.startsWith('<!--')) return true;
  return false;
}

/** Largest ratio asserted on a line, or 0. Handles "10-100x faster". */
function largestFasterRatio(line) {
  let max = 0;
  for (const m of line.matchAll(FASTER_RATIO)) {
    for (const g of [m[1], m[2]]) {
      if (g === undefined) continue;
      const n = Number(g.replace(/,/g, ''));
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return max;
}

const violations = [];
let scanned = 0;

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  // This file names the retracted claims in order to ban them.
  if (SKIP_FILES.has(rel)) continue;
  const ext = path.extname(file);
  scanned += 1;

  const lines = stripBlockComments(fs.readFileSync(file, 'utf8'), ext).split('\n');
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const trimmed = line.trim();

    // A source comment naming a retracted claim is usually the comment that
    // explains why it was retracted — the codebase writes those. Comments are
    // not served to anyone, so what matters is the string literals and the
    // prose around them.
    if (isCommentLine(trimmed, ext)) return;

    const lower = line.toLowerCase();

    for (const ratio of RETRACTED_RATIOS) {
      if (lower.includes(ratio)) {
        violations.push(
          `${at}: claims "${ratio}" — no benchmark in the HORUS repository produces ` +
            `that ratio. The measured cross-process median is 151 ns against a ~5 us ` +
            `ROS 2 reference, i.e. ~33x.\n      ${line.trim()}`
        );
      }
    }

    for (const re of PHANTOM_LATENCY) {
      if (re.test(line)) {
        violations.push(
          `${at}: claims "87 ns" — that figure appears in no benchmark or source. ` +
            `Measured: 63 ns same-process, 151 ns cross-process.\n      ${line.trim()}`
        );
      }
    }

    // Chart data is the sibling path the string rules cannot see. The retracted
    // claim's most visible instance was `{ name: 'CmdVel', speedup: 575 }` in a
    // bar-chart array — a bare number, no ratio suffix, no "ROS 2" on the line,
    // so every rule above misses it while the rendered chart says 575x as
    // loudly as any sentence. The measured spread is 10x-67x, so a chart datum
    // in the hundreds is the fabricated kind by construction.
    const chartRatio = line.match(/\bspeedup:\s*(\d+(?:\.\d+)?)/);
    if (chartRatio && Number(chartRatio[1]) >= SPEEDUP_CEILING) {
      violations.push(
        `${at}: chart datum speedup: ${chartRatio[1]} exceeds anything the ` +
          `benchmarks produce (measured spread is 10x-67x). A bar chart states ` +
          `a ratio as plainly as prose does.\n      ${line.trim()}`
      );
    }

    // The sharpest form, generalised.
    //
    // This rule used to require the line to say "measured" or "benchmark" as
    // well, on the theory that the defect was asserting a measurement. It was
    // not — the defect was publishing a ratio nothing produces, and the word
    // "measured" is the part an editor drops first. `HORUS moves CmdVel 940x
    // faster than ROS2.` passed every rule in this file. Against the ~5 us ROS 2
    // reference the measured spread is 24x-79x, so any competitor ratio at or
    // above SPEEDUP_CEILING is fabricated whatever the sentence around it says.
    const namesCompetitor = COMPETITORS.test(line);
    const ratio = largestFasterRatio(line);
    if (namesCompetitor && ratio >= SPEEDUP_CEILING) {
      violations.push(
        `${at}: claims ${ratio}x against a competitor. Nothing in this project ` +
          `measures one above 79x; ROS 2 and DDS figures here are published ` +
          `references, not measurements.\n      ${line.trim()}`
      );
    }
  });
}

/**
 * Per-component rules.
 *
 * The two defects below cannot be seen one line at a time, because both are a
 * disagreement between two lines of the same component.
 */
const componentFiles = files.filter(
  (f) => ['.tsx', '.jsx'].includes(path.extname(f)) && !SKIP_FILES.has(path.relative(root, f))
);

for (const file of componentFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = stripBlockComments(fs.readFileSync(file, 'utf8'), path.extname(file));
  // Split on exported component boundaries. Crude, and right for this file
  // shape: one exported chart per block, data array and caption inside it.
  const blocks = text.split(/^export function /m);
  let lineBase = 1;
  for (const [index, block] of blocks.entries()) {
    const name = index === 0 ? '(module scope)' : block.slice(0, block.indexOf('(')).trim();
    const blockLines = block.split('\n');
    const startLine = lineBase;
    lineBase += blockLines.length - 1;

    const body = blockLines
      .filter((l) => !isCommentLine(l.trim(), path.extname(file)))
      .join('\n');
    const hasProvenance = PROVENANCE.test(body);

    // A component that says "Not measured. These values have no source." and
    // then prints "HORUS Python is 10-40x faster than traditional Python IPC"
    // four lines below it is worse than either half alone: the disclaimer is
    // what makes the ratio a knowing assertion. Both live instances of this
    // were produced by correcting a chart's caption and leaving the summary
    // line under the same chart untouched — the sibling path, inside one
    // function.
    const admitsUnmeasured = /not measured|no source/i.test(body);
    if (admitsUnmeasured) {
      for (const [offset, l] of blockLines.entries()) {
        if (isCommentLine(l.trim(), path.extname(file))) continue;
        const r = largestFasterRatio(l);
        if (r > 0) {
          violations.push(
            `${rel}:${startLine + offset}: ${name} states "not measured" and asserts ` +
              `a ${r}x speedup in the same component. A disclaimer above the chart ` +
              `does not cover a ratio printed below it.\n      ${l.trim()}`
          );
        }
      }
    }

    // A competitor series drawn with no word about where it came from. The
    // TF2 curve in TransformFrameConcurrentChart was five invented numbers for
    // the exact row /concepts/transform-frame says carries no TF2 comparison,
    // in the one chart of three on that subject that nobody had corrected.
    if (!hasProvenance) {
      for (const [offset, l] of blockLines.entries()) {
        if (isCommentLine(l.trim(), path.extname(file))) continue;
        const m = l.match(COMPETITOR_SERIES);
        if (m) {
          violations.push(
            `${rel}:${startLine + offset}: ${name} plots a "${m[1]}" series with no ` +
              `provenance note. Competitor figures in this project are published ` +
              `references, and a chart that does not say so reads as a measurement.` +
              `\n      ${l.trim()}`
          );
        }
      }
    }
  }
}

// A scan that read nothing passes trivially. It must not be able to.
if (scanned < 50) {
  console.error(`only ${scanned} files scanned — the walk is broken and this check is vacuous`);
  process.exit(2);
}

// A count is a weak guard: a walk that lost `components/` still reads 180 files
// from `content/` and passes. Name the files that carried the original defect,
// so a rename or a re-rooted walk fails loudly instead of going quiet.
// components/BenchmarkCharts.tsx was here, and is gone. All thirteen of its
// charts were unused by every page while still registered into the MDX scope,
// and each carried hardcoded performance data naming no benchmark — a 200-node
// scaling curve the suite sweeps to 20, a 0% deadline-miss claim nothing
// measures. It is the file the four retracted ratios below came from. The
// entry is not simply deleted: it is recorded here so that re-adding a chart
// component without a named benchmark is a decision someone has to make
// deliberately rather than a file quietly reappearing.
const MUST_SCAN = [
  'app/[...slug]/page.tsx',
  'content/docs/performance/benchmarks.mdx',
  'scripts/build-search-index.js',
];

// The charts must not come back unsourced. If components/ grows a file with
// chart data again, it has to be scanned, so fail if one appears and MUST_SCAN
// has not been updated to name it.
const chartFiles = files
  .map((f) => path.relative(root, f).replace(/\\/g, '/'))
  .filter((f) => f.startsWith('components/') && /Chart|chartData|recharts/.test(fs.readFileSync(path.join(root, f), 'utf8')));
if (chartFiles.length) {
  console.error(
    `chart component(s) reappeared without being named in MUST_SCAN: ${chartFiles.join(', ')}. ` +
      `Every series needs a benchmark that produces it; add the file to MUST_SCAN once it does.`
  );
  process.exit(2);
}
const relFiles = new Set(files.map((f) => path.relative(root, f).replace(/\\/g, '/')));
const missed = MUST_SCAN.filter((f) => !relFiles.has(f));
if (missed.length) {
  console.error(
    `the walk did not reach ${missed.join(', ')} — every claim these files ` +
      `carried would pass unseen. Fix the walk, or update MUST_SCAN if the file moved.`
  );
  process.exit(2);
}

if (violations.length) {
  console.error(`${violations.length} unsupported performance claim(s):\n`);
  for (const v of violations) console.error(`  ${v}\n`);
  console.error(
    'If a claim is real, add the benchmark that produces it and cite it next to ' +
      'the number. The number alone is not evidence.'
  );
  process.exit(1);
}

// ─── The surviving numbers have to agree with each other ────────────────────
//
// Everything above answers "is this claim retracted?". Nothing answered "do the
// pages that quote a real figure quote the same one?", and they had drifted:
// what-is-horus said 125 ns cross-process and "~40ns to ~85ns" backend paths,
// goals said 30x, and two comparison tables put the 75 ns *send-only* CmdVel
// median against ROS 2's end-to-end 5 µs — the exact like-for-like error the
// benchmarks page warns about two sections earlier. None of it tripped a check,
// because every one of those numbers is individually plausible.
//
// benchmarks.mdx is the source. CANONICAL restates the figures other pages are
// allowed to quote, and the check runs both ways: each figure must still be on
// the benchmarks page (so a re-measurement cannot silently orphan the quotes),
// and the superseded spellings must not come back anywhere.
const benchmarksPage = path.join(root, 'content/docs/performance/benchmarks.mdx');
const benchmarksText = fs.readFileSync(benchmarksPage, 'utf8');

const CANONICAL = [
  { figure: '63 ns', what: 'same-process (CrossThread-1P1C) median' },
  { figure: '151 ns', what: 'cross-process 1:1 one-way median' },
  { figure: '191 ns', what: 'cross-process 1-to-many (PodShm) median' },
  { figure: '20 ns', what: 'same-thread median' },
  { figure: '75 ns', what: 'CmdVel 16 B send-only median' },
];

const orphaned = CANONICAL.filter((c) => !benchmarksText.includes(c.figure));
if (orphaned.length) {
  console.error(
    'these figures are quoted elsewhere in the docs but no longer appear on ' +
      'content/docs/performance/benchmarks.mdx:\n'
  );
  for (const o of orphaned) console.error(`  ${o.figure} — ${o.what}`);
  console.error(
    '\nIf the benchmarks were re-run, update the pages that quote them and this ' +
      'list together. A figure with no source page is how the last set drifted.'
  );
  process.exit(1);
}

// Spellings that were wrong and are easy to reintroduce, because each reads
// like a rounding of a real number rather than a different measurement.
const SUPERSEDED = [
  { re: /\b125\s?ns\b/, why: 'cross-process one-way is 151 ns, not 125 ns' },
  {
    re: /~40ns to ~85ns|~40 ns to ~85 ns/,
    why: 'the backend fast paths are 20/63/74 ns, not a 40-85 ns range',
  },
  {
    re: /0\.075\s?µs[^|\n]*\|[^|\n]*(?:ROS|DDS|REP 2014)/,
    why: '0.075 µs is the send-only CmdVel median; comparing it to ROS 2\'s ' +
      'end-to-end 5 µs is the like-for-like error benchmarks.mdx warns about — ' +
      'use the 151 ns cross-process row',
  },
  {
    re: /(?:roughly|about|~)\s*30x lower/,
    why: 'the ratio against the REP 2014 reference is ~33x, not ~30x',
  },
  {
    re: /sub-200ns end-to-end/,
    why: 'the 151 ns figure is one-way, not end-to-end',
  },
];

const drift = [];
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  // This file states the superseded spellings in order to search for them.
  if (rel === 'scripts/check-claims.mjs') continue;
  const text = fs.readFileSync(file, 'utf8');
  // Skip source comments, where these spellings appear as prose about the bug.
  // Only in code: a Markdown line very often starts with `**`, and treating
  // that as a comment blinded this check to every bolded claim in the docs.
  const isMarkdown = /\.mdx?$/.test(rel);
  text.split('\n').forEach((line, i) => {
    const t = line.trimStart();
    if (!isMarkdown && (t.startsWith('//') || t.startsWith('*'))) return;
    for (const s of SUPERSEDED) {
      if (s.re.test(line)) drift.push(`${rel}:${i + 1} — ${s.why}\n      ${line.trim().slice(0, 140)}`);
    }
  });
}
if (drift.length) {
  console.error(`${drift.length} superseded performance figure(s):\n`);
  for (const d of drift) console.error(`  ${d}\n`);
  process.exit(1);
}

// ─── send() enqueue cost must not be resold as end-to-end latency ───────────
//
// robotics_messages_benchmark times `tx.send()` and nothing else. A cross-thread
// consumer drains in the background and no sample waits for delivery. The binary
// says so three times per run -- in the run banner, in its summary header
// ("SUMMARY BY MESSAGE TYPE — send() ENQUEUE COST, not end-to-end latency"), and
// in its real-time block, which additionally prints "gate not discriminating" on
// every control-period comparison so that a pass by four orders of magnitude
// cannot be read as a result.
//
// benchmarks.mdx quoted those figures under a column headed "Median", added a
// "Headroom" column dividing a control period by them, and concluded "75 ns
// median latency supports 1000Hz+ control loops with over 12,000x headroom".
// The binary's own caveat was already on the page -- 200 lines further down, in
// the "Expected Output" block -- so the page contradicted itself and the
// summary won.
//
// Two guards, both cheap and both aimed at the specific way this comes back.
const enqueueCaveat = /not end-to-end/i.test(benchmarksText);
if (!enqueueCaveat) {
  console.error(
    'content/docs/performance/benchmarks.mdx no longer says that its send()\n' +
      'figures are not end-to-end latencies.\n\n' +
      'The binary prints that caveat on every run. A page that quotes the\n' +
      'numbers without it is telling the reader they are control-loop\n' +
      'latencies, which they are not.'
  );
  process.exit(1);
}

// "12,140x headroom" and friends. The benchmark grades p99 send() cost against a
// whole control period, which is why it labels every such comparison "gate not
// discriminating" -- the ratio measures the absence of a bottleneck, not the
// presence of headroom, because the receive side, node compute and scheduler
// jitter are all unmeasured.
const HEADROOM_RATIO = /\b\d[\d,]*\s*x\s+headroom\b/i;
const headroomClaims = [];
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (rel === 'scripts/check-claims.mjs') continue;
  const text = fs.readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (HEADROOM_RATIO.test(line)) {
      headroomClaims.push(`${rel}:${i + 1} — ${line.trim().slice(0, 140)}`);
    }
  });
}
if (headroomClaims.length) {
  console.error(
    `${headroomClaims.length} headroom multiplier(s) derived from send() cost:\n`
  );
  for (const h of headroomClaims) console.error(`  ${h}\n`);
  console.error(
    'The benchmark prints "gate not discriminating" for exactly these\n' +
      'comparisons. Say what the enqueue cost is; do not divide a control\n' +
      'period by it and present the quotient as headroom.'
  );
  process.exit(1);
}

// A latency RANGE whose bounds are not both published.
//
// `CANONICAL` above asserts that each headline figure still exists on
// benchmarks.mdx. It cannot catch a range, because a range is two numbers and
// only one of them has to be real for the sentence to look sourced. Two pages
// said "151-304ns p50 cross-process": 151 is the SpscShm 1P1C median, and 304
// is the byte size of the `Imu` message, which the docs quote that way in
// fifteen other places. A byte count had been transposed into nanoseconds.
// Another said "~200-300ns", which understates the floor and overstates the
// ceiling of a table it never cites.
//
// Both bounds of a cross-process range must appear as a latency on
// performance.mdx, which is the page that publishes the topology table every
// such sentence is summarising. This is the `consistency/cross-page` class:
// each page was individually plausible and only disagreed with the source.
const CROSS_PROCESS_CONTEXT = /cross-process|between separate processes|across processes/i;
const NS_RANGE = /\b(\d{2,4})\s?[–-]\s?(\d{2,4})\s?ns\b/g;
const perfPage = path.join(root, 'content/docs/performance/performance.mdx');
const rangeProblems = [];
if (fs.existsSync(perfPage)) {
  const perfText = fs.readFileSync(perfPage, 'utf8');
  const published = new Set(
    [...perfText.matchAll(/\b(\d{2,4})\s?ns\b/g)].map((m) => m[1])
  );
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel === 'scripts/check-claims.mjs') continue;
    if (!rel.endsWith('.mdx')) continue;
    const text = fs.readFileSync(file, 'utf8');
    text.split('\n').forEach((line, i) => {
      if (!CROSS_PROCESS_CONTEXT.test(line)) return;
      for (const m of line.matchAll(NS_RANGE)) {
        const unpublished = [m[1], m[2]].filter((v) => !published.has(v));
        if (unpublished.length) {
          rangeProblems.push(
            `${rel}:${i + 1} — "${m[0]}" quotes ${unpublished.join(' and ')} ns, ` +
              `which performance.mdx does not publish`
          );
        }
      }
    });
  }
}
if (rangeProblems.length) {
  console.error(
    `${rangeProblems.length} cross-process latency range(s) cite a figure that is not published:\n`
  );
  for (const r of rangeProblems) console.error(`  ${r}`);
  console.error(
    '\nEvery bound has to come off the topology table on ' +
      'content/docs/performance/performance.mdx. If the benchmarks were re-run, ' +
      'update that page first and these ranges with it.'
  );
  process.exit(1);
}

console.log(
  `OK — ${scanned} files carry no retracted performance claim, the ` +
    `${CANONICAL.length} headline figures agree with benchmarks.mdx, and the ` +
    `send()-cost figures carry their not-end-to-end caveat.`
);
