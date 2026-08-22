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
 * cannot see: `app/`, `components/`, `lib/`, and the Markdown alongside them.
 *
 * What it checks
 * --------------
 *   1. The retracted ratios (575x, 550x, 585x, 875x) appear nowhere.
 *   2. "87ns" / "87 ns" appears nowhere: it is the phantom latency figure that
 *      travelled with the 575x claim. The measured medians are 63 ns
 *      same-process and 151 ns cross-process.
 *   3. A line that names ROS 2 *and* says "measured"/"benchmark" *and* carries a
 *      three-digit-or-larger ratio is flagged — the shape of the original
 *      defect, which was asserting a measurement that had not been taken.
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
const SCAN_DIRS = ['app', 'components', 'lib', 'content'];
const SCAN_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mdx', '.md'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'out', 'dist']);

/** Ratios the repository cannot support. From perf_claims_contract.rs. */
const RETRACTED_RATIOS = ['575x', '550x', '585x', '875x', '575 x'];

/**
 * Highest per-message speedup any benchmark in the HORUS repository produces
 * (CmdVel 16B, 67x). Chart data above this is not a measurement.
 */
const SPEEDUP_CEILING = 100;

/** The latency figure that travelled with them and exists in no benchmark. */
const PHANTOM_LATENCY = [/\b87\s?ns\b/i, /\b87\s?nanoseconds\b/i];

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

const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d))).filter((f) =>
  SCAN_EXTENSIONS.includes(path.extname(f))
);

const violations = [];
let scanned = 0;

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  // This file names the retracted claims in order to ban them.
  if (rel === 'scripts/check-claims.mjs') continue;
  scanned += 1;

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const trimmed = line.trim();

    // A source comment naming a retracted claim is usually the comment that
    // explains why it was retracted — the codebase writes those. Comments are
    // not served to anyone, so what matters is the string literals and the
    // prose around them.
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('<!--')
    ) {
      return;
    }

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

    // The sharpest form: asserting that a comparison was measured when nothing
    // in the repository measures ROS 2 without `-F dds` and a DDS install.
    const namesRos2 = lower.includes('ros2') || lower.includes('ros 2');
    const claimsMeasured = lower.includes('measured') || lower.includes('benchmark');
    const bigRatio = /\b[1-9]\d{2,}\s?x\b/.test(line);
    if (namesRos2 && claimsMeasured && bigRatio) {
      violations.push(
        `${at}: presents a large ROS 2 ratio as measured. ROS 2 is not measured ` +
          `in this project; its figures are published references.\n      ${line.trim()}`
      );
    }
  });
}

// A scan that read nothing passes trivially. It must not be able to.
if (scanned < 50) {
  console.error(`only ${scanned} files scanned — the walk is broken and this check is vacuous`);
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

console.log(`OK — ${scanned} files carry no retracted performance claim.`);
