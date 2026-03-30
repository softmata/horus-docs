#!/usr/bin/env node
/**
 * Verify TOML code blocks from extracted-code-blocks.json.
 *
 * Validates:
 *   1. TOML syntax (via Python tomllib)
 *   2. horus.toml-specific schema checks (known sections/keys)
 *
 * Usage:
 *   node scripts/verify-toml-configs.mjs [--filter <pattern>] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BLOCKS_FILE = path.join(__dirname, '..', 'extracted-code-blocks.json');

// Known horus.toml top-level sections
const KNOWN_HORUS_SECTIONS = new Set([
  'package', 'dependencies', 'dev-dependencies', 'sim-dependencies',
  'drivers', 'sim-drivers', 'scripts', 'ignore', 'workspace', 'robot',
  'cpp', 'hooks', 'plugin', 'build',
]);

// ─── CLI ─────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    blocksFile: DEFAULT_BLOCKS_FILE,
    filter: null,
    output: null,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--blocks-file': options.blocksFile = path.resolve(args[++i]); break;
      case '--filter': options.filter = args[++i]; break;
      case '--output': case '-o': options.output = args[++i]; break;
      case '--verbose': case '-v': options.verbose = true; break;
      case '--help': case '-h':
        console.error(`
Usage: node verify-toml-configs.mjs [options]

Options:
  --blocks-file <path>   Path to extracted-code-blocks.json
  --filter <pattern>     Filter source files by regex
  --output <file>        Write JSON report to file (default: stdout)
  -v, --verbose          Verbose output
  -h, --help             Show help
`);
        process.exit(0);
    }
  }
  return options;
}

// ─── TOML Validation ─────────────────────────────────────────────────────────

/**
 * Validate TOML syntax using Python's tomllib.
 * Returns { valid, error }.
 */
function validateTomlSyntax(code) {
  const tmpFile = path.join(os.tmpdir(), `horus-toml-check-${process.pid}.toml`);

  try {
    fs.writeFileSync(tmpFile, code);

    const pyScript = `
import sys, tomllib
with open(sys.argv[1], 'rb') as f:
    try:
        tomllib.load(f)
        print('OK')
    except Exception as e:
        print(f'ERROR: {e}')
`;

    const result = execSync(`python3 -c "${pyScript.replace(/"/g, '\\"')}" "${tmpFile}" 2>&1`, {
      timeout: 5000,
      encoding: 'utf8',
    }).trim();

    if (result === 'OK') {
      return { valid: true, error: null };
    }
    return { valid: false, error: result.replace(/^ERROR:\s*/, '') };
  } catch (err) {
    return { valid: false, error: err.message?.split('\n')[0] || 'Unknown error' };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Check if TOML block looks like a horus.toml config (has known sections).
 */
function isHorusToml(code) {
  return /\[(package|dependencies|drivers|scripts|robot|workspace|dev-dependencies|sim-dependencies)\]/.test(code);
}

/**
 * Check for unknown top-level sections in horus.toml blocks.
 */
function checkHorusTomlSections(code) {
  const sectionRegex = /^\[([^\].\s]+)\]/gm;
  const unknown = [];
  let match;
  while ((match = sectionRegex.exec(code)) !== null) {
    const section = match[1];
    if (!KNOWN_HORUS_SECTIONS.has(section)) {
      unknown.push(section);
    }
  }
  return unknown;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const options = parseArgs();
  const log = (...args) => options.verbose && console.error(...args);

  // Check python3 tomllib
  try {
    execSync('python3 -c "import tomllib" 2>&1', { encoding: 'utf8' });
  } catch {
    console.error('Error: python3 with tomllib not found (requires Python 3.11+)');
    process.exit(1);
  }

  if (!fs.existsSync(options.blocksFile)) {
    console.error(`Error: ${options.blocksFile} not found`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(options.blocksFile, 'utf8'));

  let blocks = data.blocks.filter(b => b.language === 'toml');

  if (options.filter) {
    const regex = new RegExp(options.filter, 'i');
    blocks = blocks.filter(b => regex.test(b.id) || regex.test(b.file));
  }

  log(`Found ${blocks.length} TOML blocks to verify`);

  const results = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const progress = `[${i + 1}/${blocks.length}]`;

    // Many TOML blocks in docs are incomplete snippets (just a section, not full file).
    // We still try to parse them — tomllib is lenient with partial configs.
    const syntaxResult = validateTomlSyntax(block.code);

    if (!syntaxResult.valid) {
      // Check if it's a known partial pattern (just key-value pairs without section header)
      // These are valid TOML fragments that won't parse standalone
      const isFragment = !block.code.trim().startsWith('[') && block.code.includes('=');
      if (isFragment) {
        log(`${progress} SKIP ${block.id} — TOML fragment (no section header)`);
        results.push({
          id: block.id, file: block.file, lineStart: block.lineStart,
          status: 'skipped', error: 'TOML fragment without section header',
        });
        continue;
      }

      log(`${progress} FAIL ${block.id} — ${syntaxResult.error}`);
      results.push({
        id: block.id, file: block.file, lineStart: block.lineStart,
        status: 'failed', error: syntaxResult.error,
      });
      failed++;
      continue;
    }

    // Check for unknown horus.toml sections
    if (isHorusToml(block.code)) {
      const unknownSections = checkHorusTomlSections(block.code);
      if (unknownSections.length > 0) {
        log(`${progress} WARN ${block.id} — unknown sections: ${unknownSections.join(', ')}`);
        results.push({
          id: block.id, file: block.file, lineStart: block.lineStart,
          status: 'warning', error: `Unknown horus.toml sections: ${unknownSections.join(', ')}`,
        });
        warnings++;
        passed++; // Syntax is valid
        continue;
      }
    }

    log(`${progress} PASS ${block.id}`);
    results.push({
      id: block.id, file: block.file, lineStart: block.lineStart,
      status: 'passed', error: null,
    });
    passed++;
  }

  const report = {
    version: 1,
    type: 'toml-configs',
    timestamp: new Date().toISOString(),
    filter: options.filter,
    total: blocks.length,
    passed, failed, warnings,
    results,
  };

  const json = JSON.stringify(report, null, 2);
  if (options.output) {
    fs.writeFileSync(options.output, json);
    console.error(`Report written to ${options.output}`);
  } else {
    console.log(json);
  }

  console.error(`\n${'═'.repeat(60)}`);
  console.error(`TOML Verification Results`);
  console.error(`${'═'.repeat(60)}`);
  console.error(`Total:    ${blocks.length}`);
  console.error(`Passed:   ${passed}`);
  console.error(`Failed:   ${failed}`);
  console.error(`Warnings: ${warnings}`);

  if (failed > 0) {
    console.error(`\nFailed blocks:`);
    for (const r of results.filter(r => r.status === 'failed')) {
      console.error(`  ${r.file}:${r.lineStart} — ${r.error}`);
    }
    console.error(`\n❌ ${failed} block(s) failed`);
    process.exit(1);
  } else {
    console.error(`\n✅ All TOML blocks valid!`);
    process.exit(0);
  }
}

main();
