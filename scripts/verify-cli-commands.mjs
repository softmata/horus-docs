#!/usr/bin/env node
/**
 * Verify documented horus CLI commands exist in the actual binary.
 *
 * Extracts all `horus <cmd>` invocations from bash code blocks,
 * deduplicates them, and runs `horus <cmd> --help` to verify each
 * command and its documented flags exist.
 *
 * Usage:
 *   node scripts/verify-cli-commands.mjs [--horus-bin <path>] [--filter <pattern>] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BLOCKS_FILE = path.join(__dirname, '..', 'extracted-code-blocks.json');

// ─── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    horusBin: 'horus',
    blocksFile: DEFAULT_BLOCKS_FILE,
    filter: null,
    output: null,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--horus-bin':
        options.horusBin = args[++i];
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
      case '--help':
      case '-h':
        console.error(`
Usage: node verify-cli-commands.mjs [options]

Options:
  --horus-bin <path>     Path to horus binary (default: "horus" from PATH)
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

// ─── Command Extraction ──────────────────────────────────────────────────────

/**
 * Extract horus command invocations from a bash code block.
 * Returns array of { command: "topic list", flags: ["--verbose"], fullLine: "horus topic list --verbose" }
 */
function extractHorusCommands(code) {
  const commands = [];
  const lines = code.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Match lines containing `horus <something>`
    // Handle: horus cmd, $ horus cmd, sudo horus cmd, env VAR=x horus cmd
    const match = trimmed.match(/(?:^|\$\s*|&&\s*|\|\|\s*|;\s*)(?:sudo\s+)?(?:\w+=\S+\s+)*horus\s+(.+)/);
    if (!match) continue;

    // Strip inline comments: `horus doctor # health check` → `horus doctor`
    const rest = match[1].replace(/#.*$/, '').trim();
    if (!rest) continue;

    // Parse command parts vs flags
    const parts = rest.split(/\s+/);
    const cmdParts = [];
    const flags = [];

    for (const part of parts) {
      if (part.startsWith('-')) {
        flags.push(part);
      } else if (part.includes('=') || part.startsWith('"') || part.startsWith("'") ||
                 part.startsWith('$') || part.startsWith('|') || part.startsWith('>') ||
                 part.startsWith('2>') || part === '&&' || part === '||' ||
                 part.startsWith('<') || /^\d/.test(part) || part.includes('@') ||
                 part.includes('/') || part.includes('.')) {
        // Stop at redirects, pipes, variable assignments, chaining, template placeholders,
        // numeric arguments, user@host patterns, file paths
        break;
      } else if (cmdParts.length < 3) {
        // At most 3-level deep commands: horus pkg install, horus topic echo
        cmdParts.push(part);
      } else {
        // Arguments (not part of command name)
        break;
      }
    }

    if (cmdParts.length > 0) {
      commands.push({
        command: cmdParts.join(' '),
        flags: flags.filter(f => f.startsWith('--')), // Only long flags for verification
        fullLine: `horus ${rest}`,
      });
    }
  }

  return commands;
}

/**
 * Check if a horus command exists by running --help.
 * Returns { exists, helpOutput }.
 */
function checkCommand(horusBin, command) {
  const parts = command.split(' ');

  try {
    const output = execSync(`${horusBin} ${command} --help 2>&1`, {
      timeout: 10_000,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { exists: true, helpOutput: output };
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    // Some commands show help on stderr or return non-zero
    // If output contains "Usage" or "USAGE" or the command name, it likely exists
    if (/usage|USAGE|Options:|SUBCOMMANDS|Arguments/i.test(output)) {
      return { exists: true, helpOutput: output };
    }
    return { exists: false, helpOutput: output };
  }
}

/**
 * Check if a flag exists in help output.
 */
function checkFlag(helpOutput, flag) {
  // Normalize: --no-default-features → check for "no-default-features"
  const flagName = flag.replace(/^--/, '');
  return helpOutput.includes(`--${flagName}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const options = parseArgs();
  const log = (...args) => options.verbose && console.error(...args);

  // Check horus binary exists
  try {
    execSync(`${options.horusBin} --version 2>&1`, { encoding: 'utf8', timeout: 5000 });
  } catch {
    console.error(`Error: horus binary not found at "${options.horusBin}"`);
    console.error('Install horus or use --horus-bin to specify path');
    process.exit(1);
  }

  // Load blocks
  if (!fs.existsSync(options.blocksFile)) {
    console.error(`Error: Blocks file not found: ${options.blocksFile}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(options.blocksFile, 'utf8'));

  // Get bash blocks
  let bashBlocks = data.blocks.filter(b =>
    ['bash', 'shell', 'sh'].includes(b.language)
  );

  if (options.filter) {
    const regex = new RegExp(options.filter, 'i');
    bashBlocks = bashBlocks.filter(b => regex.test(b.id) || regex.test(b.file));
  }

  log(`Found ${bashBlocks.length} bash blocks to scan`);

  // Extract all horus commands
  const allCommands = [];
  for (const block of bashBlocks) {
    const cmds = extractHorusCommands(block.code);
    for (const cmd of cmds) {
      allCommands.push({ ...cmd, source: block.file, lineStart: block.lineStart });
    }
  }

  log(`Extracted ${allCommands.length} horus command invocations`);

  // Deduplicate by command name
  const uniqueCommands = new Map();
  for (const cmd of allCommands) {
    const key = cmd.command;
    if (!uniqueCommands.has(key)) {
      uniqueCommands.set(key, { command: key, flags: new Set(), sources: [] });
    }
    const entry = uniqueCommands.get(key);
    for (const f of cmd.flags) entry.flags.add(f);
    entry.sources.push({ file: cmd.source, lineStart: cmd.lineStart, fullLine: cmd.fullLine });
  }

  log(`${uniqueCommands.size} unique commands to verify`);

  // Verify each command
  const results = [];
  let commandsPassed = 0;
  let commandsFailed = 0;
  let flagsPassed = 0;
  let flagsFailed = 0;

  for (const [cmdName, entry] of uniqueCommands) {
    log(`Checking: horus ${cmdName}`);

    const check = checkCommand(options.horusBin, cmdName);

    if (!check.exists) {
      log(`  ❌ Command not found`);
      results.push({
        command: cmdName,
        status: 'missing',
        flags: [],
        sources: entry.sources.slice(0, 3), // First 3 references
        error: `Command "horus ${cmdName}" not found`,
      });
      commandsFailed++;
      continue;
    }

    // Check flags
    const flagResults = [];
    for (const flag of entry.flags) {
      const flagExists = checkFlag(check.helpOutput, flag);
      flagResults.push({ flag, exists: flagExists });
      if (flagExists) {
        flagsPassed++;
      } else {
        flagsFailed++;
        log(`  ⚠️  Flag ${flag} not found in help`);
      }
    }

    const allFlagsOk = flagResults.every(f => f.exists);
    results.push({
      command: cmdName,
      status: allFlagsOk ? 'passed' : 'flag-mismatch',
      flags: flagResults,
      sources: entry.sources.slice(0, 3),
      error: allFlagsOk ? null : `Missing flags: ${flagResults.filter(f => !f.exists).map(f => f.flag).join(', ')}`,
    });

    if (allFlagsOk) {
      commandsPassed++;
      log(`  ✅ OK (${flagResults.length} flags checked)`);
    } else {
      commandsFailed++;
    }
  }

  // Report
  const report = {
    version: 1,
    type: 'cli-commands',
    timestamp: new Date().toISOString(),
    horusBin: options.horusBin,
    filter: options.filter,
    totalInvocations: allCommands.length,
    uniqueCommands: uniqueCommands.size,
    commandsPassed,
    commandsFailed,
    flagsPassed,
    flagsFailed,
    results,
  };

  const json = JSON.stringify(report, null, 2);
  if (options.output) {
    fs.writeFileSync(options.output, json);
    console.error(`Report written to ${options.output}`);
  } else {
    console.log(json);
  }

  // Summary
  console.error(`\n${'═'.repeat(60)}`);
  console.error(`CLI Command Verification Results`);
  console.error(`${'═'.repeat(60)}`);
  console.error(`Total invocations: ${allCommands.length}`);
  console.error(`Unique commands:   ${uniqueCommands.size}`);
  console.error(`Commands passed:   ${commandsPassed}`);
  console.error(`Commands failed:   ${commandsFailed}`);
  console.error(`Flags passed:      ${flagsPassed}`);
  console.error(`Flags failed:      ${flagsFailed}`);

  if (commandsFailed > 0) {
    console.error(`\nFailed commands:`);
    for (const r of results.filter(r => r.status !== 'passed')) {
      console.error(`  horus ${r.command} — ${r.error}`);
      for (const s of r.sources.slice(0, 2)) {
        console.error(`    referenced in ${s.file}:${s.lineStart}`);
      }
    }
    console.error(`\n❌ ${commandsFailed} command(s) failed`);
    process.exit(1);
  } else {
    console.error(`\n✅ All ${commandsPassed} commands verified!`);
    process.exit(0);
  }
}

main();
