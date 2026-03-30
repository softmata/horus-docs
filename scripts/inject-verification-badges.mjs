#!/usr/bin/env node
/**
 * Inject verification status badges into MDX code blocks.
 *
 * Reads verification JSON reports (from verify-rust-local, verify-python-local, etc.)
 * and adds `verified="passed"` or `verified="failed"` attributes to the corresponding
 * code fences in MDX files.
 *
 * The MDX rendering pipeline (mdx-config.ts) already supports the `verified` attribute
 * and shows status badges when `showVerificationStatus: true`.
 *
 * Usage:
 *   node scripts/inject-verification-badges.mjs --reports <dir> [--dry-run]
 *
 * Reports directory should contain JSON files from verify scripts with this structure:
 *   { results: [{ file: "content/docs/...", lineStart: N, status: "passed"|"failed"|"skipped" }] }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    reportsDir: null,
    reportFiles: [],
    docsRoot: path.join(__dirname, '..'),
    dryRun: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--reports': options.reportsDir = args[++i]; break;
      case '--report': options.reportFiles.push(args[++i]); break;
      case '--docs-root': options.docsRoot = args[++i]; break;
      case '--dry-run': options.dryRun = true; break;
      case '--verbose': case '-v': options.verbose = true; break;
      case '--help': case '-h':
        console.error(`
Usage: node inject-verification-badges.mjs [options]

Options:
  --reports <dir>    Directory containing verification JSON reports
  --report <file>    Single report file (can specify multiple)
  --docs-root <dir>  Root of horus-docs (default: parent of scripts/)
  --dry-run          Show what would change without modifying files
  -v, --verbose      Verbose output
  -h, --help         Show help
`);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Load all verification results from report files.
 * Returns Map<file:lineStart, status>.
 */
function loadResults(options) {
  const results = new Map();
  const files = [...options.reportFiles];

  if (options.reportsDir) {
    const entries = fs.readdirSync(options.reportsDir);
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        files.push(path.join(options.reportsDir, entry));
      }
    }
  }

  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.results) {
        for (const r of data.results) {
          if (r.file && r.lineStart && r.status) {
            const key = `${r.file}:${r.lineStart}`;
            results.set(key, r.status);
          }
        }
      }
    } catch (err) {
      console.error(`Warning: Could not read report ${file}: ${err.message}`);
    }
  }

  return results;
}

/**
 * Inject verified attributes into a single MDX file.
 * Returns { modified, changes } where changes is count of injected badges.
 */
function injectBadges(filePath, relativePath, results) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let changes = 0;
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Match code fence opening: ```rust, ```python, etc.
    const fenceMatch = line.match(/^(```\w+)(.*?)$/);
    if (!fenceMatch) continue;

    const key = `${relativePath}:${lineNumber}`;
    const status = results.get(key);
    if (!status) continue;

    // Skip if already has verified attribute
    if (fenceMatch[2].includes('verified=')) continue;

    // Map status to badge value
    let badge;
    switch (status) {
      case 'passed': badge = 'passed'; break;
      case 'failed': badge = 'failed'; break;
      case 'warning': badge = 'pending'; break;
      case 'skipped': badge = 'skipped'; break;
      default: continue;
    }

    // Inject: ```rust → ```rust verified="passed"
    lines[i] = `${fenceMatch[1]} verified="${badge}"${fenceMatch[2] ? ' ' + fenceMatch[2].trim() : ''}`;
    changes++;
    modified = true;
  }

  return { content: lines.join('\n'), modified, changes };
}

function main() {
  const options = parseArgs();
  const log = (...args) => options.verbose && console.error(...args);

  if (!options.reportsDir && options.reportFiles.length === 0) {
    console.error('Error: specify --reports <dir> or --report <file>');
    process.exit(1);
  }

  const results = loadResults(options);
  log(`Loaded ${results.size} verification results`);

  if (results.size === 0) {
    console.error('No results found in reports. Nothing to inject.');
    process.exit(0);
  }

  // Group results by file
  const fileSet = new Set();
  for (const [key] of results) {
    const file = key.split(':').slice(0, -1).join(':');
    fileSet.add(file);
  }

  log(`Files with results: ${fileSet.size}`);

  let totalChanges = 0;
  let filesModified = 0;

  for (const relativePath of fileSet) {
    const fullPath = path.join(options.docsRoot, relativePath);
    if (!fs.existsSync(fullPath)) {
      log(`Warning: file not found: ${fullPath}`);
      continue;
    }

    const { content, modified, changes } = injectBadges(fullPath, relativePath, results);

    if (modified) {
      if (options.dryRun) {
        console.error(`Would modify: ${relativePath} (${changes} badges)`);
      } else {
        fs.writeFileSync(fullPath, content);
        log(`Modified: ${relativePath} (${changes} badges)`);
      }
      totalChanges += changes;
      filesModified++;
    }
  }

  console.error(`\n${'═'.repeat(60)}`);
  console.error(`Badge Injection ${options.dryRun ? '(DRY RUN)' : 'Results'}`);
  console.error(`${'═'.repeat(60)}`);
  console.error(`Files modified: ${filesModified}`);
  console.error(`Badges injected: ${totalChanges}`);
  console.error(`Total results: ${results.size}`);
}

main();
