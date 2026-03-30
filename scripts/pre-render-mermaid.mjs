#!/usr/bin/env node
/**
 * Pre-render all MermaidDiagram charts to static SVG files.
 *
 * Scans .mdx files for <MermaidDiagram chart={`...`} />, renders each to SVG
 * using @mermaid-js/mermaid-cli (mmdc), and saves to public/diagrams/<hash>.svg.
 *
 * Run: node scripts/pre-render-mermaid.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const CONTENT_DIR = resolve('content/docs');
const OUTPUT_DIR = resolve('public/diagrams');

mkdirSync(OUTPUT_DIR, { recursive: true });

function findMdxFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...findMdxFiles(full));
    else if (entry.endsWith('.mdx')) results.push(full);
  }
  return results;
}

function extractCharts(content) {
  const charts = [];
  const regex = /chart=\{`([\s\S]*?)`\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    charts.push(match[1].trim());
  }
  return charts;
}

function hashChart(chart) {
  return createHash('sha256').update(chart).digest('hex').slice(0, 16);
}

function renderWithMmdc(chart, outputPath) {
  const tmpInput = join(tmpdir(), `mermaid-${Date.now()}.mmd`);
  try {
    writeFileSync(tmpInput, chart);
    execSync(
      `npx @mermaid-js/mermaid-cli -i "${tmpInput}" -o "${outputPath}" -t dark -b transparent --quiet`,
      { stdio: 'pipe', timeout: 30000 }
    );
    return true;
  } catch (err) {
    console.error(`  ERROR: ${err.message?.split('\n')[0] || 'render failed'}`);
    return false;
  } finally {
    try { unlinkSync(tmpInput); } catch {}
  }
}

async function main() {
  console.log('[mermaid] Pre-rendering diagrams to static SVG...');

  const files = findMdxFiles(CONTENT_DIR);
  let total = 0, rendered = 0, cached = 0, failed = 0;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const charts = extractCharts(content);
    if (!charts.length) continue;

    const relPath = file.replace(resolve('.') + '/', '');
    console.log(`  ${relPath}: ${charts.length} diagram(s)`);

    for (const chart of charts) {
      total++;
      const hash = hashChart(chart);
      const svgPath = join(OUTPUT_DIR, `${hash}.svg`);

      if (existsSync(svgPath)) {
        cached++;
        continue;
      }

      if (renderWithMmdc(chart, svgPath)) {
        rendered++;
      } else {
        failed++;
        // Write placeholder
        writeFileSync(svgPath, `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80">
  <rect width="400" height="80" fill="#1f2937" rx="8"/>
  <text x="200" y="45" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="14">Diagram render failed</text>
</svg>`);
      }
    }
  }

  console.log(`[mermaid] Done: ${rendered} new, ${cached} cached, ${failed} failed (${total} total)`);
}

main().catch(err => {
  console.error('[mermaid] Fatal:', err);
  process.exit(0); // Don't fail the build
});
