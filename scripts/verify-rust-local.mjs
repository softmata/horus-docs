#!/usr/bin/env node
/**
 * Verify Rust code blocks from extracted-code-blocks.json.
 *
 * Reads extracted blocks, filters for verifiable Rust code,
 * creates temporary Cargo projects, wraps snippets as needed,
 * runs `cargo check` on each, and reports pass/fail.
 *
 * Usage:
 *   node scripts/verify-rust-local.mjs --horus-path ../horus [--filter <pattern>] [--verbose]
 *
 * Output: JSON report to stdout (or --output file), summary to stderr.
 */

import fs from 'fs';
import path from 'path';
import { execSync, execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BLOCKS_FILE = path.join(__dirname, '..', 'extracted-code-blocks.json');

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    horusPath: null,
    blocksFile: DEFAULT_BLOCKS_FILE,
    filter: null,
    output: null,
    verbose: false,
    batchSize: 20,       // how many blocks per temp crate (batching speeds up cargo check)
    timeout: 120_000,    // ms per cargo check invocation
    syntaxOnly: false,   // only check syntax (no cargo check)
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--horus-path':
        options.horusPath = path.resolve(args[++i]);
        break;
      case '--blocks-file':
        options.blocksFile = path.resolve(args[++i]);
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--syntax-only':
        options.syntaxOnly = true;
        break;
      case '--help':
      case '-h':
        console.error(`
Usage: node verify-rust-local.mjs [options]

Options:
  --horus-path <path>    Path to horus workspace (required unless --syntax-only)
  --blocks-file <path>   Path to extracted-code-blocks.json (default: auto)
  --filter <pattern>     Filter block IDs by regex pattern (e.g., "tutorials")
  --output <file>        Write JSON report to file (default: stdout)
  -v, --verbose          Verbose output to stderr
  --batch-size <n>       Blocks per cargo check batch (default: 20)
  --timeout <ms>         Timeout per cargo check (default: 120000)
  --syntax-only          Only check Rust syntax (no cargo, no horus dep)
  -h, --help             Show this help
`);
        process.exit(0);
    }
  }

  return options;
}

// ─── Rust Code Wrapping ──────────────────────────────────────────────────────

/**
 * A block is a "simplified snippet" if its first non-empty line is `// simplified`
 * or its `flags` array contains "simplified". These blocks are illustrative API
 * shapes (often method signatures or partial bodies), not standalone programs,
 * and `cargo check` will reject them. We mark them skipped rather than failed.
 *
 * We also auto-detect three common illustrative patterns even when the
 * `// simplified` marker is missing, since hand-flagging every fragment is
 * tedious and the patterns are unambiguous:
 *
 *  1. A bare method body with `&self` / `&mut self` outside an `impl` block —
 *     fragments lifted out of an `impl Node` block to show one method.
 *  2. An external-package wildcard import like `use pid_controller::*` where
 *     the crate is not horus/std/serde/etc. — these are example registry
 *     packages, not bundled.
 *  3. A partial builder chain starting with `scheduler.add(...)` /
 *     `sched.add(...)` / `node.send(...)` etc. — assumes a previously-defined
 *     instance.
 */
const STDLIB_OR_HORUS_CRATE = /^(horus|horus_\w+|std|core|alloc|serde|serde_json|rand|tokio|libc|anyhow|thiserror|chrono|log|tracing|parking_lot|bytemuck|crossbeam|paste|memmap2)$/;
const PARTIAL_CHAIN_IDENTS = /^(scheduler|sched|node|topic|publisher|subscriber|client|server|sensor|controller|planner|estop|lidar_node|imu_node|cmd_pub|cmd_sub|tf|frame|bb|blackbox)\b/;

function isSimplifiedSnippet(code, flags) {
  if (Array.isArray(flags) && flags.includes('simplified')) return true;

  const lines = code.split('\n');
  const firstLine = lines.find(l => l.trim().length > 0) || '';
  if (/^\s*\/\/\s*simplified\b/i.test(firstLine)) return true;

  // Pattern 1: contains `fn X(&self ...)` / `fn X(&mut self ...)` but no `impl` block
  // wrapping it (top-level method body extracted from an impl).
  if (/\bfn\s+\w+\s*\(\s*&\s*(?:mut\s+)?self\b/.test(code) && !/^\s*(?:pub\s+)?impl\s+/m.test(code)) {
    return true;
  }

  // Pattern 2: external-package wildcard import
  const useMatches = code.matchAll(/^\s*use\s+(\w+)(?:::|\s*;)/gm);
  for (const m of useMatches) {
    const crate = m[1];
    if (!STDLIB_OR_HORUS_CRATE.test(crate)) {
      // Not a horus/std/known crate → external package example
      return true;
    }
  }

  // Pattern 3: partial builder chain — any non-comment, non-import line
  // calls `.method(...)` on a known instance identifier WITHOUT a corresponding
  // declaration (`let ident =` / `let mut ident =`) in the same block.
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('use ')) continue;
    const callMatch = line.match(/^(\w+)\.\w+\s*\(/);
    if (callMatch && PARTIAL_CHAIN_IDENTS.test(callMatch[1])) {
      const ident = callMatch[1];
      const declRe = new RegExp(`\\blet\\s+(?:mut\\s+)?${ident}\\b`);
      const argRe = new RegExp(`\\bfn\\s+\\w+\\s*\\([^)]*\\b${ident}\\b\\s*:`);
      if (!declRe.test(code) && !argRe.test(code)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determine if code already has `use horus::prelude::*;` or similar.
 */
function hasHorusImport(code) {
  return /use\s+horus(::|::prelude)/.test(code);
}

/**
 * Determine if code has a fn main().
 */
function hasMainFn(code) {
  return /fn\s+main\s*\(/.test(code);
}

/**
 * Determine if code is a standalone impl Node / struct / module definition
 * that shouldn't be wrapped in main().
 */
function isTopLevelDefinition(code) {
  // Struct or enum definition at top level
  if (/^(pub\s+)?(struct|enum|type|trait|const|static|mod)\s+/m.test(code)) return true;
  // impl block
  if (/^(pub\s+)?impl\s+/m.test(code)) return true;
  // node! macro
  if (/node!\s*\{/.test(code)) return true;
  // message! macro
  if (/message!\s*\{/.test(code)) return true;
  // service! or action! macro
  if (/service!\s*\{/.test(code) || /action!\s*\{/.test(code)) return true;
  // standard_action! macro
  if (/standard_action!\s*\(/.test(code)) return true;
  // #[test] function
  if (/\#\[test\]/.test(code)) return true;
  // fn definition (not main)
  if (/^(pub\s+)?fn\s+\w+/.test(code)) return true;
  return false;
}

/**
 * Determine if code uses the ? operator without a fn that returns Result.
 */
function usesTryOperator(code) {
  return /\?\s*[;\n}]/.test(code) && !hasMainFn(code);
}

/**
 * Wrap a Rust code snippet so it can be checked by cargo.
 * Returns the wrapped code or null if it should be skipped.
 */
function wrapRustCode(code, flags) {
  let wrapped = code;

  // Build auto-imports based on code content
  let autoImports = '#![allow(unused_imports, dead_code, unused_variables, unused_mut)]\n';

  if (!hasHorusImport(wrapped)) {
    autoImports += 'use horus::prelude::*;\n';
  }
  // Conditionally inject ecosystem-package imports when their types are
  // referenced. Since the 2026-04-04 decomposition, `horus::prelude` no
  // longer re-exports horus-robotics types (CmdVel, Imu, LaserScan, …) or
  // horus-tf types (TransformFrame, Transform, FrameId, …). Many doc
  // snippets reference them bare as if they were still in horus::prelude.
  // We add the imports only when we see the type names, to avoid bogus
  // unresolved-import errors in blocks that don't need them.
  const HOROBOTS_TYPES = /\b(CmdVel|Imu|LaserScan|Odometry|JointState|JointCommand|MotorCommand|ServoCommand|BatteryState|NavSatFix|MagneticField|Temperature|FluidPressure|Illuminance|RangeSensor|NavGoal|NavPath|Waypoint|PathPlan|OccupancyGrid|CostMap|GoalResult|VelocityObstacle|Heartbeat|DiagnosticStatus|DiagnosticReport|EmergencyStop|SafetyStatus|ResourceUsage|Detection|Detection3D|TrackedObject|Landmark|SegmentationMask|PlaneDetection|WrenchStamped|ForceCommand|ContactInfo|HapticFeedback|TactileArray|CompressedImage|CameraInfo|RegionOfInterest|StereoInfo|JoystickInput|KeyboardInput|AudioFrame|Clock|TimeReference)\b/;
  const HORUS_TF_TYPES = /\b(TransformFrame|TransformFrameConfig|TransformFrameStats|FrameId|FrameInfo|FrameBuilder|FrameSlot|FrameRegistry|TransformEntry|TransformQuery|TransformFramePublisher|NO_PARENT)\b/;
  if (HOROBOTS_TYPES.test(code)) {
    autoImports += 'use horus_robotics::prelude::*;\n';
  }
  if (HORUS_TF_TYPES.test(code)) {
    autoImports += 'use horus_tf::prelude::*;\n';
  }

  // Add serde derives if code uses Serialize/Deserialize
  if (/derive\(.*Serialize/.test(code) && !/use\s+serde/.test(code)) {
    autoImports += 'use serde::{Serialize, Deserialize};\n';
  }

  // Add rand if code uses rand::Rng or rng
  if (/rand::/.test(code) && !/use\s+rand/.test(code)) {
    autoImports += 'use rand::Rng;\n';
  }

  // Add std imports commonly needed
  if (/HashMap/.test(code) && !/use\s+std::collections/.test(code)) {
    autoImports += 'use std::collections::HashMap;\n';
  }

  wrapped = autoImports + '\n' + wrapped;

  // If it already has main, return as-is
  if (hasMainFn(wrapped)) {
    return wrapped;
  }

  // If it's a top-level definition (struct, impl, etc.), add a dummy main
  if (isTopLevelDefinition(code)) {
    wrapped += '\n\nfn main() {}\n';
    return wrapped;
  }

  // If it uses the ? operator, wrap in fn main() -> Result<()>
  if (usesTryOperator(code)) {
    const bodyLines = code.split('\n').filter(l => !l.trim().startsWith('use '));
    const extraUses = code.split('\n').filter(l => l.trim().startsWith('use '));
    let result = autoImports;
    if (extraUses.length > 0) result += extraUses.join('\n') + '\n';
    result += `\nfn main() -> Result<()> {\n    ${bodyLines.join('\n    ')}\n    Ok(())\n}\n`;
    return result;
  }

  // Otherwise: wrap in fn main() { ... }
  const bodyLines = code.split('\n').filter(l => !l.trim().startsWith('use '));
  const extraUses = code.split('\n').filter(l => l.trim().startsWith('use '));
  let result = autoImports;
  if (extraUses.length > 0) result += extraUses.join('\n') + '\n';
  result += `\nfn main() {\n    ${bodyLines.join('\n    ')}\n}\n`;
  return result;
}

// ─── Cargo Project Management ────────────────────────────────────────────────

/**
 * Create a temporary Cargo project that depends on horus.
 * Returns the path to the temp directory.
 */
function createTempCrate(horusPath, crateIndex) {
  const tmpDir = path.join(os.tmpdir(), `horus-docs-verify-${process.pid}-${crateIndex}`);

  // Clean up if exists from prior run
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });

  // Resolve absolute horus path for Cargo.toml
  const absHorus = path.resolve(horusPath);

  // Prefer local sibling checkouts of horus-tf and horus-robotics if they exist
  // (faster, easier to test in-progress changes); fall back to git deps otherwise.
  const horusParent = path.dirname(absHorus);
  const localTfPath = path.join(horusParent, 'horus-tf');
  const localRoboticsPath = path.join(horusParent, 'horus-robotics');
  const tfDep = fs.existsSync(path.join(localTfPath, 'Cargo.toml'))
    ? `horus-tf = { path = "${localTfPath}" }`
    : `horus-tf = { git = "https://github.com/softmata/horus-tf.git" }`;
  const roboticsDep = fs.existsSync(path.join(localRoboticsPath, 'Cargo.toml'))
    ? `horus-robotics = { path = "${localRoboticsPath}" }`
    : `horus-robotics = { git = "https://github.com/softmata/horus-robotics.git" }`;

  const cargoToml = `[package]
name = "horus-docs-verify-${crateIndex}"
version = "0.1.0"
edition = "2021"

[dependencies]
horus = { path = "${absHorus}/horus" }
horus_core = { path = "${absHorus}/horus_core" }
horus_types = { path = "${absHorus}/horus_types" }
horus_macros = { path = "${absHorus}/horus_macros" }
${tfDep}
${roboticsDep}
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rand = "0.8"

# horus-tf and horus-robotics reference horus_core / horus_types / horus_macros
# via relative paths in their own workspaces. Patch them to use the local horus
# checkout under test, mirroring the [patch] section of horus/Cargo.toml.
[patch."https://github.com/softmata/horus-tf.git"]
horus_core = { path = "${absHorus}/horus_core" }
horus_macros = { path = "${absHorus}/horus_macros" }

[patch."https://github.com/softmata/horus-robotics.git"]
horus_core = { path = "${absHorus}/horus_core" }
horus_types = { path = "${absHorus}/horus_types" }
horus_macros = { path = "${absHorus}/horus_macros" }

[workspace]
`;

  fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), cargoToml);
  fs.writeFileSync(path.join(tmpDir, 'src', 'main.rs'), 'fn main() {}\n');

  return tmpDir;
}

/**
 * Write a Rust source file and run cargo check.
 * Returns { success, error }.
 */
function cargoCheckCode(tmpDir, code, timeout) {
  const mainRs = path.join(tmpDir, 'src', 'main.rs');
  fs.writeFileSync(mainRs, code);

  try {
    execSync('cargo check --message-format=short 2>&1', {
      cwd: tmpDir,
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CARGO_TERM_COLOR: 'never',
        RUSTFLAGS: '-Awarnings',
      },
    });
    return { success: true, error: null };
  } catch (err) {
    const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
    // Extract just the error lines, skip warnings and notes
    const errorLines = output
      .split('\n')
      .filter(l => l.includes('error[') || l.includes('error:'))
      .slice(0, 5)
      .join('\n');
    return { success: false, error: errorLines || output.slice(0, 500) };
  }
}

/**
 * Clean up temp crate directory.
 */
function cleanupTempCrate(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures
  }
}

// ─── Main Verification Logic ─────────────────────────────────────────────────

function main() {
  const options = parseArgs();
  const log = (...args) => options.verbose && console.error(...args);

  // Validate inputs
  if (!options.syntaxOnly && !options.horusPath) {
    console.error('Error: --horus-path is required (or use --syntax-only)');
    process.exit(1);
  }

  if (options.horusPath && !fs.existsSync(path.join(options.horusPath, 'Cargo.toml'))) {
    console.error(`Error: horus workspace not found at ${options.horusPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(options.blocksFile)) {
    console.error(`Error: Blocks file not found: ${options.blocksFile}`);
    console.error('Run "npm run extract:code" first to generate extracted-code-blocks.json');
    process.exit(1);
  }

  // Load blocks
  log(`Loading blocks from ${options.blocksFile}...`);
  const data = JSON.parse(fs.readFileSync(options.blocksFile, 'utf8'));

  // Filter for verifiable Rust blocks
  let blocks = data.blocks.filter(b => b.language === 'rust' && b.verifiable);
  log(`Found ${blocks.length} verifiable Rust blocks out of ${data.totalBlocks} total`);

  // Apply user filter
  if (options.filter) {
    const regex = new RegExp(options.filter, 'i');
    blocks = blocks.filter(b => regex.test(b.id) || regex.test(b.file));
    log(`After filter "${options.filter}": ${blocks.length} blocks`);
  }

  if (blocks.length === 0) {
    console.error('No verifiable Rust blocks found matching criteria.');
    const report = { version: 1, language: 'rust', total: 0, passed: 0, failed: 0, skipped: 0, results: [] };
    outputReport(report, options);
    process.exit(0);
  }

  // Results collector
  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let tmpDir = null;

  try {
    // Create temp crate (reuse for all blocks — cargo incremental helps)
    if (!options.syntaxOnly) {
      log('Creating temporary Cargo project...');
      tmpDir = createTempCrate(options.horusPath, 0);
      log(`Temp crate at: ${tmpDir}`);

      // Pre-check: build deps once
      log('Pre-building horus dependencies (this may take a while on first run)...');
      try {
        execSync('cargo check 2>&1', {
          cwd: tmpDir,
          timeout: 300_000, // 5 min for first build
          stdio: options.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            CARGO_TERM_COLOR: 'never',
            RUSTFLAGS: '-Awarnings',
          },
        });
        log('Dependencies built successfully');
      } catch (err) {
        console.error('Warning: Pre-build of horus dependencies failed. Continuing anyway...');
        log(err.stdout?.toString()?.slice(0, 1000) || err.message);
      }
    }

    // Process each block
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const progress = `[${i + 1}/${blocks.length}]`;

      // Skip illustrative snippets marked `// simplified` (signatures, partial
      // bodies, etc.) — they are not standalone programs and won't compile.
      if (isSimplifiedSnippet(block.code, block.flags)) {
        log(`${progress} SKIP ${block.id} — // simplified snippet`);
        results.push({ id: block.id, file: block.file, lineStart: block.lineStart, status: 'skipped', error: 'simplified snippet (not standalone)' });
        skipped++;
        continue;
      }

      // Wrap the code
      const wrapped = wrapRustCode(block.code, block.flags);
      if (!wrapped) {
        log(`${progress} SKIP ${block.id} — could not wrap`);
        results.push({ id: block.id, file: block.file, lineStart: block.lineStart, status: 'skipped', error: 'Could not wrap code' });
        skipped++;
        continue;
      }

      if (options.syntaxOnly) {
        // Just check syntax via rustc --edition 2021 -
        // (not useful without deps, so mostly a placeholder)
        results.push({ id: block.id, file: block.file, lineStart: block.lineStart, status: 'skipped', error: 'Syntax-only mode' });
        skipped++;
        continue;
      }

      // cargo check
      const result = cargoCheckCode(tmpDir, wrapped, options.timeout);

      if (result.success) {
        log(`${progress} PASS ${block.id}`);
        results.push({ id: block.id, file: block.file, lineStart: block.lineStart, status: 'passed', error: null });
        passed++;
      } else {
        const shortErr = result.error?.split('\n')[0] || 'Unknown error';
        log(`${progress} FAIL ${block.id}`);
        if (options.verbose) {
          console.error(`  Error: ${result.error}`);
          console.error(`  Wrapped code (first 10 lines):`);
          console.error(wrapped.split('\n').slice(0, 10).map(l => `    ${l}`).join('\n'));
        }
        results.push({ id: block.id, file: block.file, lineStart: block.lineStart, status: 'failed', error: result.error });
        failed++;
      }
    }
  } finally {
    // Cleanup
    if (tmpDir) {
      log('Cleaning up temp crate...');
      cleanupTempCrate(tmpDir);
    }
  }

  // Build report
  const report = {
    version: 1,
    language: 'rust',
    timestamp: new Date().toISOString(),
    horusPath: options.horusPath,
    filter: options.filter,
    total: blocks.length,
    passed,
    failed,
    skipped,
    results,
  };

  outputReport(report, options);

  // Summary to stderr
  console.error(`\n${'═'.repeat(60)}`);
  console.error(`Rust Verification Results`);
  console.error(`${'═'.repeat(60)}`);
  console.error(`Total:   ${blocks.length}`);
  console.error(`Passed:  ${passed}`);
  console.error(`Failed:  ${failed}`);
  console.error(`Skipped: ${skipped}`);

  if (failed > 0) {
    console.error(`\nFailed blocks:`);
    for (const r of results.filter(r => r.status === 'failed')) {
      console.error(`  ${r.file}:${r.lineStart} (${r.id})`);
      if (r.error) {
        console.error(`    ${r.error.split('\n')[0]}`);
      }
    }
    console.error(`\n❌ ${failed} block(s) failed verification`);
    process.exit(1);
  } else {
    console.error(`\n✅ All ${passed} blocks passed!`);
    process.exit(0);
  }
}

function outputReport(report, options) {
  const json = JSON.stringify(report, null, 2);
  if (options.output) {
    fs.writeFileSync(options.output, json);
    console.error(`Report written to ${options.output}`);
  } else {
    console.log(json);
  }
}

main();
