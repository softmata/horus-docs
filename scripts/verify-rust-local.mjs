#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function args() {
  const out = { horusPath: '../horus', filter: null, verbose: false };
  for (let i = 2; i < process.argv.length; i += 1) {
    if (process.argv[i] === '--horus-path') out.horusPath = process.argv[++i];
    else if (process.argv[i] === '--filter') out.filter = new RegExp(process.argv[++i]);
    else if (process.argv[i] === '--verbose') out.verbose = true;
    else throw new Error(`Unknown argument: ${process.argv[i]}`);
  }
  return out;
}

const options = args();
const root = process.cwd();
const horusCrate = path.resolve(root, options.horusPath, 'horus');
const horusRoot = path.dirname(horusCrate);
if (!fs.existsSync(path.join(horusCrate, 'Cargo.toml'))) {
  throw new Error(`HORUS crate not found at ${horusCrate}`);
}

const extracted = JSON.parse(fs.readFileSync(path.join(root, 'extracted-code-blocks.json'), 'utf8'));
const blocks = extracted.blocks.filter((block) =>
  block.language === 'rust' && block.verifiable &&
  !block.flags.includes('needs-wrapper') &&
  (!options.filter || options.filter.test(block.id))
);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'horus-docs-rust-'));
const target = path.join(os.tmpdir(), 'horus-docs-cargo-target');
const failures = [];

try {
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const crate = path.join(work, `block-${i}`);
    fs.mkdirSync(path.join(crate, 'src'), { recursive: true });
    const manifest = `[package]\nname = "horus_docs_block_${i}"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\nhorus = { path = ${JSON.stringify(horusCrate)} }\nserde = { version = "1", features = ["derive"] }\nclap = { version = "4", features = ["derive"] }\nserde_json = "1"\nbytemuck = "1"\nhorus_core = { path = ${JSON.stringify(path.join(horusRoot, 'horus_core'))} }\n\n[patch."https://github.com/softmata/horus-robotics.git"]\nhorus_core = { path = ${JSON.stringify(path.join(horusRoot, 'horus_core'))} }\nhorus_types = { path = ${JSON.stringify(path.join(horusRoot, 'horus_types'))} }\nhorus_macros = { path = ${JSON.stringify(path.join(horusRoot, 'horus_macros'))} }\n`;
    fs.writeFileSync(path.join(crate, 'Cargo.toml'), manifest);
    const source = /fn\s+main\s*\(/.test(block.code)
      ? block.code
      : `${block.code}\n\nfn main() {}`;
    fs.writeFileSync(path.join(crate, 'src/main.rs'), source);

    const result = spawnSync('cargo', ['check', '--quiet', '--manifest-path', path.join(crate, 'Cargo.toml')], {
      encoding: 'utf8',
      env: { ...process.env, CARGO_TARGET_DIR: target },
    });
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

console.log(`Rust documentation verification: ${blocks.length - failures.length}/${blocks.length} passed`);
if (failures.length) process.exit(1);
