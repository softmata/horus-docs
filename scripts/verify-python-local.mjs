#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function args() {
  const out = { filter: null, verbose: false };
  for (let i = 2; i < process.argv.length; i += 1) {
    if (process.argv[i] === '--filter') out.filter = new RegExp(process.argv[++i]);
    else if (process.argv[i] === '--verbose') out.verbose = true;
    else throw new Error(`Unknown argument: ${process.argv[i]}`);
  }
  return out;
}

const options = args();
const extracted = JSON.parse(fs.readFileSync('extracted-code-blocks.json', 'utf8'));
const blocks = extracted.blocks.filter((block) =>
  block.language === 'python' && block.verifiable &&
  (!options.filter || options.filter.test(block.id))
);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'horus-docs-python-'));
const failures = [];

try {
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const file = path.join(work, `block_${i}.py`);
    // `await` snippets are often intentionally shown as the body of an async
    // application. Validate them in that syntactic context instead of
    // incorrectly rejecting valid statements as top-level Python.
    const source = /(^|\n)\s*await\s/m.test(block.code)
      ? `async def __horus_docs_example__():\n${block.code.split('\n').map((line) => `    ${line}`).join('\n')}\n`
      : block.code;
    fs.writeFileSync(file, source);
    const result = spawnSync(process.env.PYTHON || 'python3', ['-m', 'py_compile', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      failures.push({ block, output: `${result.stdout}${result.stderr}`.trim() });
      console.error(`FAIL ${block.id}`);
      if (options.verbose) console.error(failures.at(-1).output);
    } else if (options.verbose) {
      console.log(`PASS ${block.id}`);
    }
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

console.log(`Python documentation verification: ${blocks.length - failures.length}/${blocks.length} passed`);
if (failures.length) process.exit(1);
