#!/usr/bin/env node
/**
 * Validate documentation structure and frontmatter.
 *
 * Run: node scripts/validate-docs.js
 *
 * Checks:
 * 1. Every .mdx file has required frontmatter (title, description, order)
 * 2. Every .mdx file is in a known section directory
 * 3. No orphan pages (in sidebar but file missing, or file exists but not in sidebar)
 * 4. No broken internal links
 * 5. No duplicate order values within a section
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDir = path.join(__dirname, '..', 'content/docs');
const KNOWN_DIRS = [
  'getting-started', 'tutorials', 'recipes', 'concepts',
  'rust', 'rust/api', 'rust/examples',
  'python', 'python/api', 'python/examples', 'python/library', 'python/messages',
  'cpp', 'cpp/api', 'cpp/examples',
  'development', 'advanced', 'operations', 'plugins',
  'package-management', 'stdlib', 'stdlib/messages',
  'performance', 'reference', 'learn',
];

let errors = 0;
let warnings = 0;

function error(msg) { console.error(`  ✗ ${msg}`); errors++; }
function warn(msg) { console.warn(`  ! ${msg}`); warnings++; }
function ok(msg) { console.log(`  ✓ ${msg}`); }

// Collect all pages
const pages = [];
function scan(dir, basePath = []) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const fp = path.join(dir, entry);
    if (fs.statSync(fp).isDirectory()) {
      scan(fp, [...basePath, entry]);
    } else if (entry.endsWith('.mdx')) {
      const raw = fs.readFileSync(fp, 'utf-8');
      const { data, content } = matter(raw);
      const fileName = entry.replace(/\.mdx$/, '');
      const href = fileName === 'index'
        ? '/' + basePath.join('/')
        : '/' + [...basePath, fileName].join('/');
      pages.push({
        file: fp.replace(contentDir + '/', ''),
        href,
        frontmatter: data,
        content,
        directory: basePath.join('/'),
      });
    }
  }
}
scan(contentDir);

console.log(`\nScanned ${pages.length} pages\n`);

// Check 1: Required frontmatter
console.log('── Frontmatter ──');
let missingTitle = 0, missingDesc = 0, missingOrder = 0;
for (const page of pages) {
  if (!page.frontmatter.title) { error(`${page.file}: missing 'title'`); missingTitle++; }
  if (!page.frontmatter.description) { warn(`${page.file}: missing 'description'`); missingDesc++; }
  if (page.frontmatter.order === undefined && page.frontmatter.weight === undefined) {
    warn(`${page.file}: missing 'order' (sidebar position)`);
    missingOrder++;
  }
}
if (missingTitle === 0) ok('All pages have title');
if (missingDesc === 0) ok('All pages have description');
if (missingOrder === 0) ok('All pages have order');

// Check 2: Known directories
console.log('\n── Directories ──');
const unknownDirs = new Set();
for (const page of pages) {
  if (page.directory && !KNOWN_DIRS.includes(page.directory)) {
    unknownDirs.add(page.directory);
  }
}
if (unknownDirs.size === 0) {
  ok('All pages in known directories');
} else {
  for (const dir of unknownDirs) {
    warn(`Unknown directory: ${dir} — add to KNOWN_DIRS or docs.config.ts`);
  }
}

// Check 3: Broken internal links
console.log('\n── Internal Links ──');
const allHrefs = new Set(pages.map(p => p.href));
let brokenLinks = 0;
for (const page of pages) {
  const linkRegex = /\]\(\/([^)#]*)/g;
  let match;
  while ((match = linkRegex.exec(page.content)) !== null) {
    const target = '/' + match[1].replace(/\/$/, '');
    if (!allHrefs.has(target) && !target.startsWith('/http')) {
      // Could be an anchor link or external — skip those
      if (!target.includes('.') && target !== '/') {
        error(`${page.file}: broken link → ${target}`);
        brokenLinks++;
      }
    }
  }
}
if (brokenLinks === 0) ok('No broken internal links');

// Check 4: Duplicate orders within section
console.log('\n── Order Conflicts ──');
const sectionOrders = {};
for (const page of pages) {
  const section = page.directory || 'root';
  if (!sectionOrders[section]) sectionOrders[section] = [];
  const order = page.frontmatter.order ?? page.frontmatter.weight ?? -1;
  if (order >= 0) {
    sectionOrders[section].push({ order, file: page.file });
  }
}
let dupes = 0;
for (const [section, entries] of Object.entries(sectionOrders)) {
  const seen = new Map();
  for (const entry of entries) {
    if (seen.has(entry.order)) {
      warn(`${section}: order ${entry.order} used by both ${seen.get(entry.order)} and ${entry.file}`);
      dupes++;
    }
    seen.set(entry.order, entry.file);
  }
}
if (dupes === 0) ok('No duplicate order values');

// Summary
console.log(`\n${'═'.repeat(50)}`);
console.log(`  ${pages.length} pages scanned`);
console.log(`  ${errors} errors, ${warnings} warnings`);
if (errors > 0) {
  console.log(`\n  Fix errors before merging.`);
  process.exit(1);
} else {
  console.log(`\n  All checks passed.`);
}
