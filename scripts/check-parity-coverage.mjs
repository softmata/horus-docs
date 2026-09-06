#!/usr/bin/env node
/**
 * Which kinds of claim in these docs are machine-checked, and which are not.
 *
 * Why this exists
 * ---------------
 * On 2026-08-29 an audit of all 166 pages raised 155 findings. At that moment
 * the repositories already held roughly 190 automated checks between them —
 * `check-links`, `check-claims`, the three `verify:*` compilers, and eleven
 * `docs_*` contract suites on the Rust side. Every one of them was green.
 *
 * They were green because each asserts something specific and true. What none
 * of them could say is what was *not* being asserted. A reader of the test
 * suite could not have answered "is anything checking that a documented default
 * matches the constant?" without reading all 190 and noticing an absence, which
 * is not a thing people notice. So the gap stayed invisible until someone read
 * every page by hand.
 *
 * This file exists to make the gap visible instead. It does not check the
 * documentation. It checks that every class of claim the documentation makes
 * has been *classified* — either a named check enforces it, or someone wrote
 * down why a machine cannot.
 *
 * How the classes were chosen
 * ---------------------------
 * Not by imagination. Each of the 155 findings was labelled with the oracle
 * that could have caught it, and the classes below are the six that fell out:
 *
 *     39  existence    set membership against an inventory
 *     30  consistency  the same fact stated twice, once wrongly
 *     17  value        a documented value against the constant
 *     14  structure    a parser
 *     11  compiles     a compiler
 *     44  behaviour    a reader, and nothing else
 *
 * 71% of what went wrong is reachable by a machine. The remaining 28% is not,
 * and saying so plainly is the point: a suite that quietly implies full cover
 * is worse than one that names what it cannot reach.
 *
 * The strictness
 * --------------
 * An `enforced` entry is not taken at its word. The named file must exist and
 * must contain the named check, so a renamed or deleted test turns into a
 * failure here rather than a line of documentation that stopped being true. A
 * `manual` entry must carry a reason. A class with neither fails.
 *
 * Run: node scripts/check-parity-coverage.mjs [--verbose]
 */

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const horus = process.env.HORUS_DIR || path.resolve(root, '../horus');
const verbose = process.argv.includes('--verbose');

/**
 * Every class of factual claim these docs make.
 *
 * `where` names where the check lives: a path under this repo, or under the
 * HORUS repo for the Rust-side contract suites. `needle` is a string that must
 * appear in it — the function name, so a rename is caught.
 */
const CLASSES = [
  // ── existence: a named thing is claimed to exist ────────────────────────
  {
    class: 'existence/route',
    what: 'every internal link and #anchor resolves to a page and heading',
    enforced: { where: 'scripts/check-links.mjs', needle: 'internal link(s) resolve to nothing' },
    direction: 'both',
  },
  {
    class: 'existence/navigation',
    what: 'every page is reachable from the sidebar, and every sidebar entry has a page',
    enforced: { where: 'scripts/check-links.mjs', needle: 'are not in the sidebar' },
    direction: 'both',
  },
  {
    class: 'existence/search',
    what: 'the committed search index covers exactly the pages that exist',
    enforced: { where: 'scripts/check-links.mjs', needle: 'missing from the search index' },
    direction: 'both',
  },
  {
    class: 'existence/cli-command',
    what: 'every documented command resolves, and every visible command is documented',
    enforced: {
      where: 'horus:horus_manager/tests/docs_cli_contract.rs',
      needle: 'every_visible_command_has_a_section_in_the_cli_reference',
    },
    direction: 'both',
  },
  {
    class: 'existence/cli-flag',
    what: 'every documented flag is accepted by the command it is documented under',
    enforced: {
      where: 'horus:horus_manager/tests/docs_cli_contract.rs',
      needle: 'every_documented_flag_is_accepted',
    },
    // Honest about the half that is missing: a flag added to HORUS and never
    // written up is not caught by anything. See the note at the bottom.
    direction: 'docs->code',
  },
  {
    class: 'existence/env-var',
    what: 'documented variables are read, and variables the code reads are documented',
    // Two facts, not one: the test exists, and the docs-contract workflow
    // actually runs it with `--ignored`. Asserting only the first is what let
    // this class sit in `manual` while the case was written but never executed.
    enforced: [
      { where: 'horus:horus_manager/tests/docs_parity.rs', needle: 'fn every_env_var_the_code_reads_is_documented' },
      { where: 'horus:.github/workflows/docs-contract.yml', needle: '--test docs_parity' },
    ],
    direction: 'both',
  },
  {
    class: 'existence/manifest-key',
    what: 'every horus.toml key documented exists, and every schema key is documented',
    enforced: { where: 'horus:horus_manager/tests/docs_contract.rs', needle: 'undocumented' },
    direction: 'both',
  },
  {
    class: 'existence/python-symbol',
    what: 'every `from horus import X` and `horus.X` names something horus_py exports',
    enforced: { where: 'scripts/verify_python_api.py', needle: 'horus exports no' },
    direction: 'docs->code',
  },
  {
    class: 'existence/benchmark-binary',
    what: 'every benchmark the docs tell a reader to run exists',
    // Two facts, not one: the test exists, and the docs-contract workflow
    // actually runs it with `--ignored`. Asserting only the first is what let
    // this class sit in `manual` while the case was written but never executed.
    enforced: [
      { where: 'horus:horus_manager/tests/docs_parity.rs', needle: 'fn documented_benchmark_binaries_exist' },
      { where: 'horus:.github/workflows/docs-contract.yml', needle: '--test docs_parity' },
    ],
    direction: 'docs->code',
  },
  {
    class: 'existence/version-pin',
    what: 'a documented `horus = "x.y"` can resolve to the crate this repo ships',
    // Two facts, not one: the test exists, and the docs-contract workflow
    // actually runs it with `--ignored`. Asserting only the first is what let
    // this class sit in `manual` while the case was written but never executed.
    enforced: [
      { where: 'horus:horus_manager/tests/docs_parity.rs', needle: 'fn documented_horus_version_pins_resolve_to_this_crate' },
      { where: 'horus:.github/workflows/docs-contract.yml', needle: '--test docs_parity' },
    ],
    direction: 'both',
  },

  // ── compiles: a sample is claimed to work ───────────────────────────────
  {
    class: 'compiles/rust',
    what: 'self-contained Rust samples compile against the real crate',
    enforced: { where: 'scripts/verify-rust-local.mjs', needle: 'Rust documentation verification' },
    direction: 'docs->code',
  },
  {
    class: 'compiles/cpp',
    what: 'C++ samples type-check against horus_cpp/include',
    enforced: { where: 'scripts/verify-cpp-local.mjs', needle: 'C++ documentation verification' },
    direction: 'docs->code',
  },
  {
    class: 'compiles/python-syntax',
    what: 'Python samples are valid Python',
    enforced: { where: 'scripts/verify-python-local.mjs', needle: 'Python documentation verification' },
    direction: 'docs->code',
  },
  {
    class: 'compiles/python-api',
    what: 'Python keyword arguments name real parameters',
    enforced: { where: 'scripts/verify_python_api.py', needle: 'not a parameter of' },
    direction: 'docs->code',
  },

  // ── structure: the page renders ─────────────────────────────────────────
  {
    class: 'structure/mdx',
    what: 'every page compiles — fences, tables and JSX',
    enforced: { where: '.github/workflows/verify-docs.yml', needle: 'npm run extract:code' },
    direction: 'n/a',
    // This says compiles, not renders. It used to claim both, with a note that
    // `next build` was "the real oracle". A green build proves the MDX parsed;
    // it proves nothing about what reaches the screen, which is why all 17
    // diagrams on the site could render nothing while this class read enforced.
    // structure/rendered-output is the class that actually covers that.
  },
  {
    class: 'structure/mdx-expression',
    what: 'a `{...}` an author wrote is still in the compiled output',
    enforced: { where: 'scripts/check-mdx-props.mjs', needle: 'did not survive compilation' },
    direction: 'docs->code',
    // next-mdx-remote 6's `blockJS` default deletes every expression node. It
    // took `chart={`...`}` off all 17 <MermaidDiagram> tags and no check moved.
  },
  {
    class: 'structure/rendered-output',
    what: 'a page in a browser shows what its source says it shows',
    enforced: { where: 'scripts/check-rendered.mjs', needle: 'did not render as written' },
    direction: 'docs->code',
    // The class nothing covered. Every other check reads source or served HTML;
    // this one opens the page. It found the blank diagrams, three hydration
    // mismatches and six code blocks with no Copy button on its first run.
  },
  {
    class: 'structure/shell-fence',
    what: 'every ```bash block is shell and parses',
    enforced: { where: 'scripts/check_shell_fences.py', needle: 'Every shell block parses' },
    direction: 'n/a',
    // 592 bash blocks and nothing opened one. docs_cli_contract checks that a
    // documented command and its flags exist, not that the fence contains
    // shell. Three blocks carried a Rust or Python line appended to a recipe
    // under "# Or from code" — which a reader cannot paste, and which
    // verify:rust never sees, because it is inside a ```bash fence. Three more
    // were sample output. This does not check that a recipe does what the prose
    // says; that needs a fixture project, and the recipes found broken by hand
    // (an install landing where the next command does not look) are evidence
    // the class is worth one.
  },
  {
    class: 'structure/toml-fence',
    what: 'every TOML block parses, and every manifest example agrees with the schema this site publishes',
    enforced: { where: 'scripts/check_toml_fences.py', needle: 'agrees with the published schema' },
    direction: 'both',
    // compiles/rust|cpp|python cover 1,256 of roughly 2,000 fenced blocks. TOML
    // was in the uncovered half, which mattered because
    // public/schema/horus.toml.schema.json is served at a stable URL and
    // configuration.mdx tells readers to point their editor at it — so a
    // manifest example the schema rejects shows up as an error on a line the
    // reader copied from us. The same check re-derives the schema with
    // `horus schema` and fails when the published copy has drifted from it.
  },
  {
    class: 'structure/diagram-legibility',
    what: 'a mermaid diagram that renders is also readable: no HTML escaped into a subgraph title, no hardcoded fill its own text fails contrast against',
    enforced: { where: 'scripts/check-diagrams.mjs', needle: 'which mermaid escapes' },
    direction: 'n/a',
    // structure/rendered-output proves a diagram produced an <svg>. It cannot
    // see a diagram that renders perfectly and is wrong on the screen. A
    // <small> in a subgraph title drew its own tags as visible text, and three
    // diagrams paired white labels with 500-weight fills at 2.15:1 and 2.54:1 —
    // valid SVG, clean render, unreadable picture.
  },
  {
    class: 'structure/route-uniqueness',
    what: 'no two app routes can match the same URL',
    enforced: { where: 'scripts/check-routes.mjs', needle: 'can match the same URL' },
    direction: 'n/a',
    // Four page routes overlapped, so `next dev` 404'd every English page after
    // its first request while the prerendered production build looked fine.
  },
  {
    class: 'existence/anchor',
    what: 'a `#fragment` link points at a heading that exists',
    enforced: { where: 'scripts/check-links.mjs', needle: 'page exists, #' },
    direction: 'docs->docs',
    // Bare `#anchor` links matched none of the extractor's patterns, so four
    // dead ones sat on /development/cli-reference and /development/static-analysis
    // while the checker reported every link resolving.
  },

  // ── value: a documented value matches the source ────────────────────────
  {
    class: 'value/rust-signature',
    what: 'a Rust signature printed in the API reference is the one the crate declares',
    // Handing eight agents nothing but these docs produced 78 recorded guesses,
    // almost all of the form "no page prints this signature, so I inferred it
    // from the call sites". `DurationExt` was guessed nine times. Publishing a
    // signature makes it a second copy of something in the crate, so the copies
    // are diffed rather than trusted.
    enforced: { where: 'scripts/check-rust-signatures.mjs', needle: 'no longer match the crate' },
    direction: 'both',
  },
  {
    class: 'existence/agent-entrypoint',
    what: 'llms.txt lists every documentation page, with the description the page carries',
    // Generated from the same frontmatter the site renders, so a new or renamed
    // page cannot go missing from it; the check fails when the committed copy is
    // stale. Without this the only machine-readable artifact was
    // search-index.json, which truncates every page to 2000 characters.
    enforced: { where: 'scripts/build-llms-txt.mjs', needle: 'is out of date' },
    direction: 'both',
  },
  {
    class: 'value/site-metadata',
    what: "the site's own JSON-LD advertises the version HORUS ships and every language it documents",
    // `app/` is not `content/`, so no code or link checker ever looked at it.
    // Both fields it asserts had drifted: softwareVersion said 0.1.7 against a
    // shipped 0.4.1, and programmingLanguage omitted C++ while the docs carry
    // 18 C++ API pages. Search engines read this block directly.
    enforced: { where: 'scripts/check-site-metadata.mjs', needle: 'is what search engines are told' },
    direction: 'both',
  },
  {
    class: 'value/performance-figure',
    what: 'headline latencies agree with the page that measures them, and retracted ones stay gone',
    enforced: { where: 'scripts/check-claims.mjs', needle: 'agree with benchmarks.mdx' },
    direction: 'both',
  },
  {
    class: 'value/default',
    what: 'a documented default equals the constant it describes',
    manual:
      'No inventory of defaults exists to diff against. Nine findings were of this ' +
      'shape — BudgetPolicy::Enforce trips at 2x not 1x, lethal_cost is 254 not 253, ' +
      'HORUS_NODE_NAME falls back to "Scheduler" not the binary name. Each default ' +
      'lives in a different form (a const, a serde attribute, an unwrap_or, a clap ' +
      'default_value), so catching these needs `horus inventory --json` to emit them ' +
      'first. That is the highest-value thing not yet built.',
  },

  // ── consistency: the same fact, stated twice ────────────────────────────
  {
    class: 'consistency/cross-page',
    what: 'a fact stated on more than one page is stated the same way',
    manual:
      'The largest single category — 30 findings — and only partly reachable. ' +
      'check-claims pins the five headline latency figures to benchmarks.mdx and, ' +
      'since a range needs only one real number to look sourced, also requires both ' +
      'bounds of any cross-process latency range to appear on performance.mdx. That ' +
      'second rule was added after "151-304ns p50 cross-process" shipped on two ' +
      'pages: 151 is the SpscShm 1P1C median and 304 is the byte size of the Imu ' +
      'message. Both are single-sourcing done by hand for one fact family. The ' +
      'general form needs facts to be transcluded from one place rather than ' +
      'retyped, which is a content-model change, not a test. Until then a reader is ' +
      'the only oracle for the rest: two pages disagreeing about what .watchdog() ' +
      'does are each individually plausible.',
  },

  // ── behaviour: what the system does ─────────────────────────────────────
  {
    class: 'behaviour/runtime-semantics',
    what: 'what the docs say happens is what happens',
    enforced: { where: 'horus:horus_manager/tests/docs_behavior.rs', needle: 'Behavioural contracts' },
    direction: 'docs->code',
    partial:
      'Covers the promises someone thought to write a test for. It cannot cover the ' +
      'ones nobody thought of, which is where 44 of the 155 findings were: four pages ' +
      'still described a critical-node escalation that safety_monitor.rs had ' +
      'deliberately removed, and every sentence was self-consistent and wrong.',
  },
];

// ─── Enforce the manifest ───────────────────────────────────────────────────

function resolve(where) {
  return where.startsWith('horus:') ? path.join(horus, where.slice('horus:'.length)) : path.join(root, where);
}

const problems = [];
const missingCheck = [];
let enforced = 0;
let manual = 0;

for (const entry of CLASSES) {
  if (!entry.class || !entry.what) {
    problems.push(`an entry is missing class or what: ${JSON.stringify(entry).slice(0, 80)}`);
    continue;
  }
  if (entry.enforced) {
    // One check, or several that must ALL hold.
    //
    // A class whose check is a test in the horus repo needs two separate facts,
    // and this file used to be able to state only the first: that the test
    // exists, and that something runs it. That gap is not hypothetical -- the
    // three docs_parity classes below sat in `manual` for exactly it, because
    // the test existed while every one of its cases was `#[ignore]`d and no
    // workflow named the target. An all-ignored binary exits 0 reporting
    // "0 passed; 3 ignored", which reads as coverage from the outside.
    const checks = Array.isArray(entry.enforced) ? entry.enforced : [entry.enforced];
    let satisfied = true;
    for (const check of checks) {
      const file = resolve(check.where);
      if (!fs.existsSync(file)) {
        missingCheck.push(`${entry.class} — ${check.where} does not exist`);
        satisfied = false;
        break;
      }
      const text = fs.readFileSync(file, 'utf8');
      if (!text.includes(check.needle)) {
        missingCheck.push(
          `${entry.class} — ${check.where} no longer contains "${check.needle}"`
        );
        satisfied = false;
        break;
      }
    }
    if (!satisfied) continue;
    enforced += 1;
  } else if (entry.manual) {
    manual += 1;
  } else {
    problems.push(`${entry.class} is neither enforced nor explained`);
  }
}

if (problems.length) {
  console.error(`${problems.length} class(es) are unclassified:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(
    '\nEvery class of claim needs either an `enforced` check or a `manual` reason. ' +
      'An unclassified class is exactly the blind spot this file exists to prevent.'
  );
  process.exit(1);
}

if (missingCheck.length) {
  console.error(`${missingCheck.length} claimed check(s) are gone or renamed:\n`);
  for (const m of missingCheck) console.error(`  ${m}`);
  console.error(
    '\nThis manifest says these classes are enforced. They are not. Restore the ' +
      'check, or move the class to `manual` and say why.'
  );
  process.exit(1);
}

if (verbose) {
  console.log('enforced:');
  for (const e of CLASSES.filter((c) => c.enforced)) {
    const arrow = { both: '<->', 'docs->code': '-->', 'code->docs': '<--', 'n/a': '   ' }[e.direction] || '   ';
    const where = (Array.isArray(e.enforced) ? e.enforced : [e.enforced])
      .map((c) => c.where)
      .join(' + ');
    console.log(`  ${arrow} ${e.class.padEnd(32)} ${where}`);
  }
  console.log('\nleft to a reader:');
  for (const e of CLASSES.filter((c) => c.manual)) console.log(`  --- ${e.class}`);
}

const oneWay = CLASSES.filter((c) => c.enforced && c.direction === 'docs->code').length;
console.log(
  `OK — ${CLASSES.length} claim classes classified: ${enforced} enforced ` +
    `(${oneWay} in one direction only), ${manual} left to a reader.`
);
