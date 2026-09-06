#!/usr/bin/env node
/**
 * Signatures published in the Rust API reference must still be the real ones.
 *
 * Handing eight agents nothing but this documentation and asking each to write a
 * working HORUS program produced 78 recorded guesses, and the same shape came up
 * over and over: "no page prints this signature, so I inferred it from ~20 call
 * sites". `DurationExt` was guessed nine times and `Frequency` six.
 *
 * Publishing a signature moves the failure mode rather than removing it: a
 * transcribed signature is a second copy that can drift from the crate. This
 * checks the copies.
 *
 * Each entry names a signature line exactly as the docs print it and the source
 * file that must contain it. Comparison is whitespace-normalised and ignores a
 * trailing `;` or ` {`, so the docs may end a listing with `;` where the crate
 * opens a body — but the name, parameters and return type have to agree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const horus = process.env.HORUS_DIR || path.resolve(root, '../horus');

// doc page -> [signature, crate-relative source file]
const SIGNATURES = [
  // The two types every rate and duration in the API is built from.
  ['fn ns(self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
  ['fn us(self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
  ['fn ms(self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
  ['fn secs(self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
  ['fn hz(self) -> Frequency', 'horus_core/src/core/duration_ext.rs'],
  ['pub trait DurationExt', 'horus_core/src/core/duration_ext.rs'],
  ['pub struct Frequency(f64)', 'horus_core/src/core/duration_ext.rs'],
  ['pub fn value(&self) -> f64', 'horus_core/src/core/duration_ext.rs'],
  ['pub fn period(&self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
  ['pub fn budget_default(&self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
  ['pub fn deadline_default(&self) -> Duration', 'horus_core/src/core/duration_ext.rs'],
];

// Which primitive types implement DurationExt decides whether `100.hz()`,
// `100_u64.hz()` and `2.5.hz()` all compile. The page says all three do, and
// that `u32` does not — which is only true while these impls are exactly these.
const IMPLS = ['u64', 'f64', 'i32'];
const IMPL_FILE = 'horus_core/src/core/duration_ext.rs';

const norm = (s) => s.replace(/\s+/g, ' ').replace(/[;{]\s*$/, '').trim();
const problems = [];

if (!fs.existsSync(horus)) {
  console.log(`SKIP — no horus checkout at ${horus}; set HORUS_DIR to check signatures.`);
  process.exit(0);
}

const cache = new Map();
const read = (rel) => {
  if (!cache.has(rel)) {
    const p = path.join(horus, rel);
    cache.set(rel, fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);
  }
  return cache.get(rel);
};

const docsText = fs.readFileSync(
  path.join(root, 'content/docs/rust/api/core.mdx'),
  'utf8'
);

for (const [sig, rel] of SIGNATURES) {
  // The docs must actually still print it — a signature deleted from the page
  // would otherwise pass this check by vacuity.
  if (!docsText.includes(sig)) {
    problems.push(`content/docs/rust/api/core.mdx no longer prints "${sig}"`);
    continue;
  }
  const src = read(rel);
  if (src === null) {
    problems.push(`${rel} does not exist in the horus checkout`);
    continue;
  }
  const found = src.split('\n').some((l) => norm(l) === norm(sig));
  if (!found) {
    problems.push(`"${sig}" is documented but no line of ${rel} matches it`);
  }
}

const implSrc = read(IMPL_FILE);
if (implSrc !== null) {
  const actual = [...implSrc.matchAll(/^impl DurationExt for (\w+)/gm)].map((m) => m[1]);
  const missing = IMPLS.filter((t) => !actual.includes(t));
  const extra = actual.filter((t) => !IMPLS.includes(t));
  if (missing.length || extra.length) {
    problems.push(
      `DurationExt impls have changed: docs say ${IMPLS.join('/')}, crate has ` +
        `${actual.join('/')}. The page tells a reader which literal spellings ` +
        `compile (100.hz(), 100_u64.hz(), 2.5.hz()) and which do not (u32).`
    );
  }
}

if (problems.length) {
  console.error(`${problems.length} published signature(s) no longer match the crate:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\nA signature in the docs is a copy of one in the crate. Update ' +
      'content/docs/rust/api/core.mdx and this list together.'
  );
  process.exit(1);
}

console.log(
  `OK — ${SIGNATURES.length} published Rust signatures match the crate, and ` +
    `DurationExt is implemented for exactly ${IMPLS.join(', ')}.`
);
