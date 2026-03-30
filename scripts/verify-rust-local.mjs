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

  const cargoToml = `[package]
name = "horus-docs-verify-${crateIndex}"
version = "0.1.0"
edition = "2021"

[dependencies]
horus = { path = "${absHorus}/horus" }
horus_core = { path = "${absHorus}/horus_core" }
horus_library = { path = "${absHorus}/horus_library" }
horus_macros = { path = "${absHorus}/horus_macros" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rand = "0.8"

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
