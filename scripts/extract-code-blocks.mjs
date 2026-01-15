#!/usr/bin/env node
/**
 * Extract code blocks from MDX documentation files.
 *
 * This script parses all MDX files in content/docs/ and extracts
 * code blocks with their metadata for verification against the
 * real HORUS codebase.
 *
 * Usage:
 *   node scripts/extract-code-blocks.mjs [--output <file>] [--language <lang>]
 *
 * Output format:
 *   {
 *     "version": 1,
 *     "extracted": "2024-01-13T...",
 *     "totalBlocks": 42,
 *     "blocks": [
 *       {
 *         "id": "concepts/what-is-horus:47:rust",
 *         "file": "content/docs/concepts/what-is-horus.mdx",
 *         "lineStart": 47,
 *         "lineEnd": 63,
 *         "language": "rust",
 *         "code": "use horus::prelude::*;...",
 *         "verifiable": true,
 *         "flags": []
 *       }
 *     ]
 *   }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, '..', 'content', 'docs');
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'extracted-code-blocks.json');

// Languages we can verify against real code
const VERIFIABLE_LANGUAGES = ['rust', 'python'];

// Languages we extract but don't verify (reference only)
const REFERENCE_LANGUAGES = ['bash', 'shell', 'sh', 'toml', 'yaml', 'json', 'text'];

// Markers that indicate code is not meant to be executed
const NON_EXECUTABLE_MARKERS = [
  '// ...',           // Truncated code
  '/* ... */',        // Truncated code
  '# ...',            // Truncated Python
  '...',              // Ellipsis standalone
  '// pseudo',        // Pseudo-code marker
  '// conceptual',    // Conceptual example
  '// simplified',    // Simplified for docs
  '// not-executable',// Explicit marker
  '// example-only',  // Example only
  '<your_',           // Template placeholder
  'YOUR_',            // Template placeholder
  'PLACEHOLDER',      // Placeholder
];

// Patterns that indicate partial/incomplete code
const PARTIAL_CODE_PATTERNS = [
  /^\s*\/\/\s*\.\.\./m,           // Rust ellipsis comment
  /^\s*#\s*\.\.\./m,              // Python ellipsis comment
  /\.\.\.\s*$/m,                  // Trailing ellipsis
  /^\s*\.\.\.\s*$/m,              // Standalone ellipsis line
  /<[A-Z_]+>/,                    // Template placeholders like <YOUR_KEY>
];

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: DEFAULT_OUTPUT,
    language: null,        // Filter by language
    verifiableOnly: false, // Only verifiable languages
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--language':
      case '-l':
        options.language = args[++i];
        break;
      case '--verifiable-only':
        options.verifiableOnly = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node extract-code-blocks.mjs [options]

Options:
  -o, --output <file>     Output JSON file (default: extracted-code-blocks.json)
  -l, --language <lang>   Filter by language (rust, python, bash, etc.)
  --verifiable-only       Only extract verifiable languages (rust, python)
  -v, --verbose           Verbose output
  -h, --help              Show this help
        `);
        process.exit(0);
    }
  }

  return options;
}

/**
 * Check if code block contains non-executable markers
 */
function hasNonExecutableMarkers(code) {
  const lowerCode = code.toLowerCase();
  for (const marker of NON_EXECUTABLE_MARKERS) {
    if (lowerCode.includes(marker.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Check if code is partial/incomplete
 */
function isPartialCode(code) {
  for (const pattern of PARTIAL_CODE_PATTERNS) {
    if (pattern.test(code)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect flags for a code block
 */
function detectFlags(code, language) {
  const flags = [];

  if (hasNonExecutableMarkers(code)) {
    flags.push('has-markers');
  }

  if (isPartialCode(code)) {
    flags.push('partial');
  }

  // Check for missing main function in Rust
  if (language === 'rust') {
    const hasMainFn = /fn\s+main\s*\(/.test(code);
    const hasNodeImpl = /impl\s+Node\s+for/.test(code) || /node!\s*\{/.test(code);

    if (!hasMainFn && !hasNodeImpl) {
      flags.push('needs-wrapper');
    }

    // Check for ? operator without Result return type
    if (/\?[;\s]/.test(code) && !hasMainFn) {
      flags.push('uses-try-operator');
    }
  }

  // Check for incomplete Python
  if (language === 'python') {
    if (/^\s*def\s+\w+.*:\s*$/m.test(code) && !/\n\s+/.test(code.split(/def\s+\w+/)[1] || '')) {
      flags.push('incomplete-function');
    }
  }

  return flags;
}

/**
 * Extract code blocks from a single file
 */
function extractFromFile(filePath, relativePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const blocks = [];

  // Regex to match fenced code blocks with optional language
  const codeBlockRegex = /^```(\w*)\s*$/;

  let inCodeBlock = false;
  let currentBlock = null;
  let currentCode = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed

    if (!inCodeBlock) {
      const match = line.match(codeBlockRegex);
      if (match) {
        inCodeBlock = true;
        currentBlock = {
          lineStart: lineNumber,
          language: match[1] || 'text',
        };
        currentCode = [];
      }
    } else {
      if (line.match(/^```\s*$/)) {
        // End of code block
        const code = currentCode.join('\n');
        const language = currentBlock.language.toLowerCase();

        const isVerifiable = VERIFIABLE_LANGUAGES.includes(language);
        const isReference = REFERENCE_LANGUAGES.includes(language);
        const flags = detectFlags(code, language);

        // Determine if this block can be verified
        const verifiable = isVerifiable &&
          !flags.includes('has-markers') &&
          !flags.includes('partial');

        blocks.push({
          id: `${relativePath.replace(/\.mdx?$/, '')}:${currentBlock.lineStart}:${language}`,
          file: relativePath,
          lineStart: currentBlock.lineStart,
          lineEnd: lineNumber,
          language: language,
          code: code,
          verifiable: verifiable,
          flags: flags,
        });

        inCodeBlock = false;
        currentBlock = null;
        currentCode = [];
      } else {
        currentCode.push(line);
      }
    }
  }

  // Handle unclosed code block (shouldn't happen in valid MDX)
  if (inCodeBlock && currentBlock) {
    console.warn(`Warning: Unclosed code block in ${relativePath} starting at line ${currentBlock.lineStart}`);
  }

  return blocks;
}

/**
 * Recursively scan directory for MDX files
 */
function scanDirectory(dir, basePath = '') {
  const allBlocks = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      allBlocks.push(...scanDirectory(fullPath, relativePath));
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      const blocks = extractFromFile(fullPath, `content/docs/${relativePath}`);
      allBlocks.push(...blocks);
    }
  }

  return allBlocks;
}

/**
 * Main function
 */
function main() {
  const options = parseArgs();

  console.log('Extracting code blocks from documentation...');
  console.log(`  Source: ${DOCS_DIR}`);

  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  // Extract all blocks
  let blocks = scanDirectory(DOCS_DIR);

  // Apply filters
  if (options.language) {
    blocks = blocks.filter(b => b.language === options.language);
  }

  if (options.verifiableOnly) {
    blocks = blocks.filter(b => VERIFIABLE_LANGUAGES.includes(b.language));
  }

  // Generate statistics
  const stats = {
    total: blocks.length,
    byLanguage: {},
    verifiable: blocks.filter(b => b.verifiable).length,
    withFlags: blocks.filter(b => b.flags.length > 0).length,
  };

  for (const block of blocks) {
    stats.byLanguage[block.language] = (stats.byLanguage[block.language] || 0) + 1;
  }

  // Build output
  const output = {
    version: 1,
    extracted: new Date().toISOString(),
    source: 'content/docs/',
    totalBlocks: blocks.length,
    statistics: stats,
    blocks: blocks,
  };

  // Write output
  fs.writeFileSync(options.output, JSON.stringify(output, null, 2));

  // Print summary
  console.log('\nExtraction complete!');
  console.log(`  Total blocks: ${stats.total}`);
  console.log(`  Verifiable: ${stats.verifiable}`);
  console.log(`  With flags: ${stats.withFlags}`);
  console.log('\n  By language:');
  for (const [lang, count] of Object.entries(stats.byLanguage).sort((a, b) => b[1] - a[1])) {
    const verifiableCount = blocks.filter(b => b.language === lang && b.verifiable).length;
    console.log(`    ${lang}: ${count} (${verifiableCount} verifiable)`);
  }
  console.log(`\n  Output: ${options.output}`);

  if (options.verbose) {
    console.log('\n  Blocks with flags:');
    for (const block of blocks.filter(b => b.flags.length > 0)) {
      console.log(`    ${block.id}: [${block.flags.join(', ')}]`);
    }
  }
}

main();
