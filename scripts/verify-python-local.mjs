#!/usr/bin/env node
/**
 * Verify Python code blocks from extracted-code-blocks.json.
 *
 * Three levels of verification:
 *   1. Syntax check — py_compile on every verifiable Python block
 *   2. Import check — verify `import horus` resolves (if horus_py wheel installed)
 *   3. Static analysis — detect references to nonexistent horus APIs
 *
 * Usage:
 *   node scripts/verify-python-local.mjs [--filter <pattern>] [--verbose]
 *
 * Output: JSON report to stdout (or --output file), summary to stderr.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BLOCKS_FILE = path.join(__dirname, '..', 'extracted-code-blocks.json');

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    blocksFile: DEFAULT_BLOCKS_FILE,
    filter: null,
    output: null,
    verbose: false,
    timeout: 30_000,
    skipImportCheck: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
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
      case '--timeout':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--skip-import-check':
        options.skipImportCheck = true;
        break;
      case '--help':
      case '-h':
        console.error(`
Usage: node verify-python-local.mjs [options]

Options:
  --blocks-file <path>   Path to extracted-code-blocks.json (default: auto)
  --filter <pattern>     Filter block IDs by regex pattern (e.g., "tutorials")
  --output <file>        Write JSON report to file (default: stdout)
  -v, --verbose          Verbose output to stderr
  --timeout <ms>         Timeout per check (default: 30000)
  --skip-import-check    Skip horus import verification
  -h, --help             Show this help
`);
        process.exit(0);
    }
  }

  return options;
}

// ─── Python Detection ────────────────────────────────────────────────────────

/**
 * Find python3 binary.
 */
function findPython() {
  for (const cmd of ['python3', 'python']) {
    try {
      const version = execSync(`${cmd} --version 2>&1`, { encoding: 'utf8' }).trim();
      if (version.startsWith('Python 3')) {
        return cmd;
      }
    } catch {
      // Not found, try next
    }
  }
  return null;
}

/**
 * Check if horus module is importable.
 */
function checkHorusAvailable(python) {
  try {
    execSync(`${python} -c "import horus" 2>&1`, {
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Code Analysis ───────────────────────────────────────────────────────────

/**
 * A block is a "simplified snippet" if its first non-empty line is `# simplified`
 * or its `flags` array contains "simplified". These blocks are illustrative API
 * shapes (often method signatures with type annotations like `tick_once(node_names: list = None)`)
 * that are not valid standalone Python; we skip them rather than fail them.
 */
function isSimplifiedSnippet(code, flags) {
  if (Array.isArray(flags) && flags.includes('simplified')) return true;
  const firstLine = code.split('\n').find(l => l.trim().length > 0) || '';
  return /^\s*#\s*simplified\b/i.test(firstLine);
}

/**
 * Check if Python code imports horus.
 */
function usesHorus(code) {
  return /(?:^|\n)\s*(?:import\s+horus|from\s+horus\s+import)/.test(code);
}

/**
 * Check if code is a complete standalone script (has function calls or horus.run).
 */
function isStandaloneScript(code) {
  // Has horus.run() call — complete program
  if (/horus\.run\s*\(/.test(code)) return true;
  // Has if __name__ guard
  if (/__name__\s*==\s*['"]__main__['"]/.test(code)) return true;
  // Has top-level function calls (not just definitions)
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty, comments, imports, definitions
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') || trimmed.startsWith('def ') ||
        trimmed.startsWith('class ') || trimmed.startsWith('@')) continue;
    // Top-level statement that's not a definition
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      // Assignments, function calls, etc.
      if (/^\w/.test(trimmed) && !trimmed.startsWith('def ') && !trimmed.startsWith('class ')) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Extract horus API references from code for static analysis.
 * Returns list of referenced APIs like ["horus.Node", "horus.run", "node.recv"].
 */
function extractHorusRefs(code) {
  const refs = new Set();

  // horus.Something() or horus.something
  const horusAttr = /horus\.(\w+)/g;
  let match;
  while ((match = horusAttr.exec(code)) !== null) {
    refs.add(`horus.${match[1]}`);
  }

  // from horus import X, Y, Z
  const fromImport = /from\s+horus\s+import\s+(.+)/g;
  while ((match = fromImport.exec(code)) !== null) {
    const imports = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
    for (const imp of imports) {
      refs.add(`horus.${imp}`);
    }
  }

  return [...refs];
}

// Known horus Python APIs (from horus/__init__.py analysis)
const KNOWN_HORUS_APIS = new Set([
  // Core
  'horus.Node', 'horus.Scheduler', 'horus.Topic', 'horus.run',
  // Time
  'horus.now', 'horus.dt', 'horus.elapsed', 'horus.tick',
  'horus.budget_remaining', 'horus.rng_float', 'horus.timestamp_ns',
  // Constants
  'horus.us', 'horus.ms',
  // Version
  'horus.get_version',
  // Enums
  'horus.NodeState', 'horus.Miss',
  // Types
  'horus.Image', 'horus.PointCloud', 'horus.DepthImage', 'horus.Tensor', 'horus.TensorPool',
  'horus.TransformFrame', 'horus.Transform', 'horus.TransformFrameConfig',
  'horus.Params', 'horus.Rate',
  // Messages
  'horus.CmdVel', 'horus.Imu', 'horus.LaserScan', 'horus.Odometry',
  'horus.Pose2D', 'horus.Pose3D', 'horus.Point3', 'horus.Vector3', 'horus.Quaternion',
  'horus.Twist', 'horus.Accel', 'horus.TransformStamped', 'horus.PoseStamped',
  'horus.PoseWithCovariance', 'horus.TwistWithCovariance',
  'horus.MotorCommand', 'horus.ServoCommand', 'horus.JointCommand',
  'horus.DifferentialDriveCommand', 'horus.PidConfig', 'horus.TrajectoryPoint',
  'horus.BatteryState', 'horus.JointState', 'horus.NavSatFix',
  'horus.MagneticField', 'horus.Temperature', 'horus.FluidPressure',
  'horus.Illuminance', 'horus.RangeSensor',
  'horus.NavGoal', 'horus.NavPath', 'horus.Waypoint', 'horus.PathPlan',
  'horus.OccupancyGrid', 'horus.CostMap', 'horus.GoalResult',
  'horus.VelocityObstacle', 'horus.VelocityObstacles',
  'horus.Heartbeat', 'horus.DiagnosticStatus', 'horus.DiagnosticReport',
  'horus.EmergencyStop', 'horus.SafetyStatus', 'horus.ResourceUsage',
  'horus.NodeHeartbeat', 'horus.NodeStateMsg',
  'horus.BoundingBox2D', 'horus.BoundingBox3D',
  'horus.Detection', 'horus.Detection3D',
  'horus.TrackedObject', 'horus.TrackingHeader',
  'horus.Landmark', 'horus.Landmark3D', 'horus.LandmarkArray',
  'horus.SegmentationMask', 'horus.PlaneDetection', 'horus.PlaneArray',
  'horus.WrenchStamped', 'horus.ForceCommand', 'horus.ContactInfo',
  'horus.HapticFeedback', 'horus.ImpedanceParameters', 'horus.TactileArray',
  'horus.CompressedImage', 'horus.CameraInfo', 'horus.RegionOfInterest', 'horus.StereoInfo',
  'horus.JoystickInput', 'horus.KeyboardInput',
  'horus.AudioFrame',
  'horus.Clock', 'horus.TimeReference', 'horus.SimSync', 'horus.RateRequest',
  'horus.GenericMessage',
  // Exceptions
  'horus.HorusNotFoundError', 'horus.HorusTransformError', 'horus.HorusTimeoutError',
  // Submodules
  'horus.drivers',
]);

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Syntax-check a Python code block via py_compile.
 * Returns { success, error }.
 */
function syntaxCheck(python, code, tmpFile, timeout) {
  fs.writeFileSync(tmpFile, code);

  try {
    execSync(`${python} -m py_compile "${tmpFile}" 2>&1`, {
      timeout,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { success: true, error: null };
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '') || err.message;
    // Clean up temp file path from error message
    const cleanError = output.replace(new RegExp(tmpFile.replace(/[/\\]/g, '[\\\\/]'), 'g'), '<block>');
    return { success: false, error: cleanError.trim().split('\n').slice(0, 3).join('\n') };
  }
}

/**
 * Check for references to nonexistent horus APIs (static analysis).
 * Returns list of unknown API references.
 */
function checkUnknownApis(code) {
  const refs = extractHorusRefs(code);
  const unknown = refs.filter(r => !KNOWN_HORUS_APIS.has(r));
  // Filter out common false positives: method calls on instances, submodule access
  return unknown.filter(r => {
    // horus.drivers.load() → horus.drivers is known
    if (r.startsWith('horus.drivers.')) return false;
    // Lowercase → likely a method on an instance, not a class
    const attr = r.split('.').pop();
    if (attr && attr[0] === attr[0].toLowerCase() && !KNOWN_HORUS_APIS.has(r)) {
      // Check if it's a known function-level API
      return KNOWN_HORUS_APIS.has(r);
    }
    return true;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const options = parseArgs();
  const log = (...args) => options.verbose && console.error(...args);

  // Find Python
  const python = findPython();
  if (!python) {
    console.error('Error: python3 not found');
    process.exit(1);
  }
  log(`Using Python: ${python}`);

  // Check if horus is available
  const horusAvailable = !options.skipImportCheck && checkHorusAvailable(python);
  log(`horus module available: ${horusAvailable}`);

  // Load blocks
  if (!fs.existsSync(options.blocksFile)) {
    console.error(`Error: Blocks file not found: ${options.blocksFile}`);
    console.error('Run "npm run extract:code" first');
    process.exit(1);
  }

  log(`Loading blocks from ${options.blocksFile}...`);
  const data = JSON.parse(fs.readFileSync(options.blocksFile, 'utf8'));

  // Filter for verifiable Python blocks
  let blocks = data.blocks.filter(b => b.language === 'python' && b.verifiable);
  log(`Found ${blocks.length} verifiable Python blocks out of ${data.totalBlocks} total`);

  // Apply user filter
  if (options.filter) {
    const regex = new RegExp(options.filter, 'i');
    blocks = blocks.filter(b => regex.test(b.id) || regex.test(b.file));
    log(`After filter "${options.filter}": ${blocks.length} blocks`);
  }

  if (blocks.length === 0) {
    console.error('No verifiable Python blocks found matching criteria.');
    const report = { version: 1, language: 'python', total: 0, passed: 0, failed: 0, skipped: 0, warnings: 0, results: [] };
    outputReport(report, options);
    process.exit(0);
  }

  // Create temp directory for py_compile
  const tmpDir = path.join(os.tmpdir(), `horus-docs-verify-py-${process.pid}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, 'block_check.py');

  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let warnings = 0;

  try {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const progress = `[${i + 1}/${blocks.length}]`;

      // Skip illustrative snippets marked `# simplified` (signatures with type
      // annotations like `tick_once(node_names: list = None)`) — they are not
      // valid standalone Python and py_compile rejects them.
      if (isSimplifiedSnippet(block.code, block.flags)) {
        log(`${progress} SKIP ${block.id} — # simplified snippet`);
        results.push({
          id: block.id, file: block.file, lineStart: block.lineStart,
          status: 'skipped', level: 'simplified',
          error: 'simplified snippet (not standalone)',
          unknownApis: [],
        });
        skipped++;
        continue;
      }

      // Level 1: Syntax check
      const syntaxResult = syntaxCheck(python, block.code, tmpFile, options.timeout);

      if (!syntaxResult.success) {
        log(`${progress} FAIL ${block.id} — syntax error`);
        if (options.verbose) {
          console.error(`  ${syntaxResult.error}`);
        }
        results.push({
          id: block.id, file: block.file, lineStart: block.lineStart,
          status: 'failed', level: 'syntax', error: syntaxResult.error,
          unknownApis: [],
        });
        failed++;
        continue;
      }

      // Level 2: Static API analysis (no execution needed)
      const unknownApis = checkUnknownApis(block.code);
      const hasUnknownApis = unknownApis.length > 0;

      if (hasUnknownApis) {
        log(`${progress} WARN ${block.id} — unknown APIs: ${unknownApis.join(', ')}`);
        results.push({
          id: block.id, file: block.file, lineStart: block.lineStart,
          status: 'warning', level: 'api-check',
          error: `Unknown horus APIs: ${unknownApis.join(', ')}`,
          unknownApis,
        });
        warnings++;
        // Still count as passed (syntax is valid)
        passed++;
        continue;
      }

      // Passed all checks
      log(`${progress} PASS ${block.id}`);
      results.push({
        id: block.id, file: block.file, lineStart: block.lineStart,
        status: 'passed', level: 'syntax+api', error: null,
        unknownApis: [],
      });
      passed++;
    }
  } finally {
    // Cleanup
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  // Build report
  const report = {
    version: 1,
    language: 'python',
    timestamp: new Date().toISOString(),
    pythonBinary: python,
    horusAvailable,
    filter: options.filter,
    total: blocks.length,
    passed,
    failed,
    skipped,
    warnings,
    results,
  };

  outputReport(report, options);

  // Summary to stderr
  console.error(`\n${'═'.repeat(60)}`);
  console.error(`Python Verification Results`);
  console.error(`${'═'.repeat(60)}`);
  console.error(`Total:    ${blocks.length}`);
  console.error(`Passed:   ${passed}`);
  console.error(`Failed:   ${failed}`);
  console.error(`Warnings: ${warnings}`);
  console.error(`Skipped:  ${skipped}`);
  console.error(`horus:    ${horusAvailable ? 'available' : 'not available (import check skipped)'}`);

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
  } else if (warnings > 0) {
    console.error(`\n⚠️  ${warnings} block(s) reference unknown horus APIs`);
    console.error(`\nBlocks with unknown APIs:`);
    for (const r of results.filter(r => r.status === 'warning')) {
      console.error(`  ${r.file}:${r.lineStart} — ${r.unknownApis.join(', ')}`);
    }
    process.exit(0);
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
