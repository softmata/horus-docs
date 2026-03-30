#!/usr/bin/env node
/**
 * Unified verification runner — orchestrates all verification scripts.
 *
 * Runs in sequence:
 *   1. verify-rust-local.mjs (if --horus-path provided)
 *   2. verify-python-local.mjs
 *   3. verify-cli-commands.mjs (if horus binary available)
 *   4. verify-toml-configs.mjs
 *
 * Aggregates all JSON reports into a unified summary.
 *
 * Usage:
 *   node scripts/verify-all.mjs --horus-path ../horus [--filter <pattern>] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    horusPath: null,
    filter: null,
    verbose: false,
    reportsDir: path.join(__dirname, '..', '.verify-reports'),
    skipRust: false,
    skipPython: false,
    skipCli: false,
    skipToml: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--horus-path': options.horusPath = args[++i]; break;
      case '--filter': options.filter = args[++i]; break;
      case '--verbose': case '-v': options.verbose = true; break;
      case '--reports-dir': options.reportsDir = args[++i]; break;
      case '--skip-rust': options.skipRust = true; break;
      case '--skip-python': options.skipPython = true; break;
      case '--skip-cli': options.skipCli = true; break;
      case '--skip-toml': options.skipToml = true; break;
      case '--help': case '-h':
        console.error(`
Usage: node verify-all.mjs [options]

Options:
  --horus-path <path>    Path to horus workspace (required for Rust verification)
  --filter <pattern>     Filter blocks by regex (passed to all scripts)
  -v, --verbose          Verbose output
  --reports-dir <dir>    Directory for JSON reports (default: .verify-reports/)
  --skip-rust            Skip Rust verification
  --skip-python          Skip Python verification
  --skip-cli             Skip CLI command verification
  --skip-toml            Skip TOML config verification
  -h, --help             Show help
`);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Run a verification script and capture result.
 */
function runScript(name, scriptPath, args, options) {
  const reportFile = path.join(options.reportsDir, `${name}.json`);
  const fullArgs = [...args, '--output', reportFile];
  if (options.filter) fullArgs.push('--filter', options.filter);
  if (options.verbose) fullArgs.push('--verbose');

  const cmd = `node "${scriptPath}" ${fullArgs.join(' ')}`;

  console.error(`\n${'─'.repeat(60)}`);
  console.error(`Running: ${name}`);
  console.error(`${'─'.repeat(60)}`);

  try {
    execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      timeout: 600_000, // 10 min
      stdio: ['ignore', 'pipe', 'inherit'], // stdout to pipe (JSON), stderr to console
      env: process.env,
    });
    return { name, success: true, reportFile };
  } catch (err) {
    // Non-zero exit = verification failures found (expected behavior)
    return { name, success: false, reportFile, exitCode: err.status };
  }
}

/**
 * Load a JSON report file.
 */
function loadReport(reportFile) {
  try {
    return JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const options = parseArgs();

  // Create reports directory
  fs.mkdirSync(options.reportsDir, { recursive: true });

  // Ensure extracted blocks exist
  const blocksFile = path.join(__dirname, '..', 'extracted-code-blocks.json');
  if (!fs.existsSync(blocksFile)) {
    console.error('Extracting code blocks first...');
    execSync('npm run extract:code', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  }

  const scriptResults = [];
  let anyFailures = false;

  // 1. Rust verification
  if (!options.skipRust && options.horusPath) {
    const result = runScript('rust', path.join(__dirname, 'verify-rust-local.mjs'),
      ['--horus-path', options.horusPath], options);
    scriptResults.push(result);
    if (!result.success) anyFailures = true;
  } else if (!options.skipRust) {
    console.error('\nSkipping Rust verification (no --horus-path provided)');
  }

  // 2. Python verification
  if (!options.skipPython) {
    const result = runScript('python', path.join(__dirname, 'verify-python-local.mjs'),
      [], options);
    scriptResults.push(result);
    if (!result.success) anyFailures = true;
  }

  // 3. CLI verification
  if (!options.skipCli) {
    try {
      execSync('horus --version 2>&1', { encoding: 'utf8', timeout: 5000 });
      const result = runScript('cli', path.join(__dirname, 'verify-cli-commands.mjs'),
        [], options);
      scriptResults.push(result);
      if (!result.success) anyFailures = true;
    } catch {
      console.error('\nSkipping CLI verification (horus binary not found)');
    }
  }

  // 4. TOML verification
  if (!options.skipToml) {
    const result = runScript('toml', path.join(__dirname, 'verify-toml-configs.mjs'),
      [], options);
    scriptResults.push(result);
    if (!result.success) anyFailures = true;
  }

  // ─── Unified Summary ────────────────────────────────────────────────────

  console.error(`\n${'═'.repeat(60)}`);
  console.error(`          UNIFIED VERIFICATION SUMMARY`);
  console.error(`${'═'.repeat(60)}\n`);

  const summary = { scripts: [], totals: { passed: 0, failed: 0, skipped: 0, warnings: 0, total: 0 } };

  for (const sr of scriptResults) {
    const report = loadReport(sr.reportFile);
    const status = sr.success ? '✅' : '❌';

    if (report) {
      const p = report.passed || 0;
      const f = report.failed || 0;
      const s = report.skipped || 0;
      const w = report.warnings || 0;
      const t = report.total || (p + f + s);

      console.error(`  ${status} ${sr.name.padEnd(10)} ${p} passed, ${f} failed, ${s} skipped, ${w} warnings (${t} total)`);

      summary.scripts.push({ name: sr.name, passed: p, failed: f, skipped: s, warnings: w, total: t });
      summary.totals.passed += p;
      summary.totals.failed += f;
      summary.totals.skipped += s;
      summary.totals.warnings += w;
      summary.totals.total += t;
    } else {
      console.error(`  ${status} ${sr.name.padEnd(10)} (no report)`);
      summary.scripts.push({ name: sr.name, error: 'No report generated' });
    }
  }

  console.error(`\n  ${'─'.repeat(50)}`);
  console.error(`  TOTAL:     ${summary.totals.passed} passed, ${summary.totals.failed} failed, ${summary.totals.skipped} skipped, ${summary.totals.warnings} warnings`);
  console.error(`             ${summary.totals.total} blocks verified\n`);

  // Write unified summary
  const summaryFile = path.join(options.reportsDir, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  console.error(`Reports written to: ${options.reportsDir}/`);

  if (anyFailures) {
    console.error(`\n❌ Verification found failures. Check individual reports for details.`);
    process.exit(1);
  } else {
    console.error(`\n✅ All verifications passed!`);
    process.exit(0);
  }
}

main();
