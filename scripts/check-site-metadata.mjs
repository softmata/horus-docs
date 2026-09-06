#!/usr/bin/env node
/**
 * The site's own advertising, checked against the thing it advertises.
 *
 * `app/layout.tsx` carries the site-wide metadata and a JSON-LD
 * `SoftwareApplication` block. Search engines read that block directly, so a
 * wrong value there is not a typo on a page a reader might skim past — it is
 * what Google is told HORUS *is*.
 *
 * Nothing checked it, and both fields it asserts had drifted:
 *
 *   softwareVersion: '0.1.7'                 while the crate shipped 0.4.1
 *   programmingLanguage: ['Rust', 'Python']  while C++ has a crate, 18 API
 *                                            pages and its own CI workflow
 *
 * Neither is reachable by the other checkers: `check-links` walks routes,
 * `check-claims` pins performance figures, and every code checker reads
 * `content/`. `app/` is not content, so it had no oracle at all.
 *
 * Both facts have a source of truth in the repo, so this asserts against those
 * rather than against a second hardcoded copy:
 *   - the version comes from the horus checkout's `horus_manager/Cargo.toml`
 *   - the languages come from which `content/docs/<lang>/api` sections exist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const horus = process.env.HORUS_DIR || path.resolve(root, '../horus');
const layoutPath = path.join(root, 'app/layout.tsx');
const layout = fs.readFileSync(layoutPath, 'utf8');

const problems = [];

// ── version ───────────────────────────────────────────────────────────────
const advertised = layout.match(/softwareVersion:\s*'([^']+)'/)?.[1];
if (!advertised) {
  problems.push('app/layout.tsx no longer declares a softwareVersion — the JSON-LD block lost the field this check exists for');
} else {
  const manifest = path.join(horus, 'horus_manager/Cargo.toml');
  if (!fs.existsSync(manifest)) {
    console.log(
      `SKIP — no horus checkout at ${path.relative(root, manifest)}; ` +
        `set HORUS_DIR to check the advertised version (${advertised}).`
    );
  } else {
    const shipped = fs.readFileSync(manifest, 'utf8').match(/^version\s*=\s*"([^"]+)"/m)?.[1];
    if (!shipped) {
      problems.push(`could not read a version from ${path.relative(root, manifest)}`);
    } else if (shipped !== advertised) {
      problems.push(
        `app/layout.tsx advertises softwareVersion '${advertised}', but horus ships '${shipped}'. ` +
          `That string is JSON-LD: it is what search engines are told the current version is.`
      );
    }
  }
}

// ── languages ─────────────────────────────────────────────────────────────
// A language earns its place by having an API section a reader can open.
const LANGS = [
  { dir: 'rust', label: 'Rust' },
  { dir: 'python', label: 'Python' },
  { dir: 'cpp', label: 'C++' },
];
const shipped = LANGS.filter((l) => fs.existsSync(path.join(root, 'content/docs', l.dir, 'api')));
const declared = layout.match(/programmingLanguage:\s*\[([^\]]*)\]/)?.[1];
if (declared === undefined) {
  problems.push('app/layout.tsx no longer declares programmingLanguage in its JSON-LD block');
} else {
  for (const lang of shipped) {
    if (!declared.includes(`'${lang.label}'`)) {
      problems.push(
        `content/docs/${lang.dir}/api exists, so the site documents ${lang.label}, ` +
          `but programmingLanguage does not list it. A language the docs cover and the ` +
          `metadata omits is invisible to anyone searching for it.`
      );
    }
  }
  // The prose claims have to agree with the structured data.
  for (const lang of shipped) {
    const claims = layout.match(/[Mm]ulti-language support \(([^)]*)\)/g) || [];
    for (const claim of claims) {
      if (!claim.includes(lang.label)) {
        problems.push(`"${claim}" omits ${lang.label}, which the docs cover under content/docs/${lang.dir}/`);
      }
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} site-metadata claim(s) disagree with what HORUS ships:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nThis block is the site advertising itself. Fix app/layout.tsx.');
  process.exit(1);
}

console.log(
  `OK — the advertised version matches the shipped crate and the JSON-LD lists every ` +
    `language the docs document (${shipped.map((l) => l.label).join(', ')}).`
);
