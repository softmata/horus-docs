#!/usr/bin/env node
/**
 * Two things a mermaid diagram can get wrong that still render a clean SVG.
 *
 * `check-rendered.mjs` opens every page and asserts each <MermaidDiagram>
 * produced an <svg> with no "Diagram Error". That catches a diagram that fails.
 * It cannot catch a diagram that succeeds and is wrong on the screen, and both
 * of the following did exactly that for as long as they were on the site.
 *
 * 1. HTML in a subgraph title
 * --------------------------
 * Mermaid renders NODE labels through a foreignObject, so real HTML works
 * inside them -- `<b>` bolds, `<small>` shrinks. It renders SUBGRAPH TITLES as
 * SVG <text>, where the same markup is escaped and the tags are drawn as
 * characters. what-is-horus.mdx carried
 *
 *     subgraph OS["Operating System<br/><small>Linux / macOS / Windows</small>"]
 *
 * and the page showed, in the box, the literal text
 *
 *     Operating System<small> Linux / macOS / Windows </small>
 *
 * The SVG was valid, the render succeeded, and nothing failed. `<br/>` is the
 * exception -- mermaid breaks the line itself -- so it stays allowed.
 *
 * 2. A hardcoded fill its own text cannot be read against
 * ------------------------------------------------------
 * A `style N fill:#...,color:#...` directive overrides the site theme, which
 * means it also opts out of the contrast the theme was chosen for. Three
 * diagrams paired white text with Tailwind 500-weight fills: emerald #10b981
 * gives 2.54:1 and amber #f59e0b gives 2.15:1, both under the 3:1 that WCAG AA
 * allows even for large text. They looked deliberate, so nobody re-checked them.
 *
 * This check is pure text analysis over the .mdx sources -- no browser, no
 * build. It complements check-rendered rather than repeating it.
 *
 * Usage: node scripts/check-diagrams.mjs [--verbose]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

/** WCAG relative luminance. */
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The floor is AA for large text. Diagram labels are short, bold and set at the
 * node's own size, so holding them to the 4.5:1 normal-text bar would fail
 * fills that read perfectly well; 3:1 is the line below which they genuinely
 * stop being legible.
 */
const MIN_CONTRAST = 3.0;

function mdxFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...mdxFiles(p));
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const files = mdxFiles(path.join(root, 'content'));
const failures = [];
let diagrams = 0;
let titles = 0;
let styles = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(root, file);

  for (const m of text.matchAll(/chart=\{`([\s\S]*?)`\}/g)) {
    diagrams++;
    const chart = m[1];
    const startLine = text.slice(0, m.index).split('\n').length;

    // 1. HTML in subgraph titles
    for (const s of chart.matchAll(/subgraph\s+\w+\s*\[\s*"([^"]*)"\s*\]/g)) {
      titles++;
      const title = s[1];
      const tags = [...title.matchAll(/<\/?\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)]
        .map((t) => t[1].toLowerCase())
        .filter((t) => t !== 'br');
      const unique = [...new Set(tags)];
      if (tags.length > 0) {
        const line = startLine + chart.slice(0, s.index).split('\n').length - 1;
        failures.push(
          `${rel}:${line}: subgraph title contains <${unique.join('>, <')}>, which mermaid escapes.\n` +
            `      The tags will be drawn as visible text: ${JSON.stringify(title)}\n` +
            `      Only <br/> works in a subgraph title. Move the markup into a node label, or drop it.`
        );
      } else if (verbose) {
        console.log(`  ok  ${rel}  subgraph title ${JSON.stringify(title)}`);
      }
    }

    // 2. hardcoded fills vs their own text colour
    for (const s of chart.matchAll(
      /style\s+(\w+)\s+([^\n]*?fill:\s*(#[0-9a-fA-F]{6})[^\n]*?color:\s*(#[0-9a-fA-F]{3,6}))/g
    )) {
      styles++;
      const [, node, , fill, colorRaw] = s;
      const color =
        colorRaw.length === 4
          ? `#${colorRaw[1]}${colorRaw[1]}${colorRaw[2]}${colorRaw[2]}${colorRaw[3]}${colorRaw[3]}`
          : colorRaw;
      const ratio = contrast(fill, color);
      if (ratio < MIN_CONTRAST) {
        const line = startLine + chart.slice(0, s.index).split('\n').length - 1;
        failures.push(
          `${rel}:${line}: node ${node} sets fill ${fill} behind text ${color} — ${ratio.toFixed(2)}:1.\n` +
            `      WCAG AA needs ${MIN_CONTRAST}:1 even for large text.\n` +
            `      Drop the style directive and let the site theme colour it, or pick a darker fill.`
        );
      } else if (verbose) {
        console.log(`  ok  ${rel}  style ${node} ${fill}/${color} ${ratio.toFixed(2)}:1`);
      }
    }
  }
}

console.log(
  `Checked ${diagrams} diagram${diagrams === 1 ? '' : 's'}: ` +
    `${titles} subgraph title${titles === 1 ? '' : 's'}, ${styles} hardcoded style${styles === 1 ? '' : 's'}.`
);

if (failures.length > 0) {
  console.error(`\n${failures.length} diagram problem${failures.length === 1 ? '' : 's'}:\n`);
  for (const f of failures) console.error(`  ${f}\n`);
  console.error('These render without error. The SVG is valid and the page looks fine to every');
  console.error('other check — the defect is only visible to someone reading the picture.');
  process.exit(1);
}

if (diagrams === 0) {
  console.error('\nNo diagrams found at all. Either every one was removed, or this check no');
  console.error('longer sees the content it was written to guard.');
  process.exit(1);
}

console.log('Every subgraph title is plain text and every hardcoded fill is legible.');
