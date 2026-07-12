#!/usr/bin/env node
/**
 * Build the static raw-content API into public/api/docs/.
 *
 * Replaces the old Next.js /api/docs route (which needed a server) with static
 * JSON files, so the "raw content API" feature survives the move to Cloudflare
 * Pages' static hosting. `_redirects` maps the original extension-less URLs
 * (/api/docs/{slug}) onto these .json files.
 *
 *   public/api/docs/{slug}.json  -> { title, description, slug, content, headings, wordCount }
 *   public/api/docs.json         -> [{ slug, title, description }]  (index)
 *   public/api/health.json       -> { status: "ok" }
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "..", "content", "docs");
const OUT_DIR = path.join(__dirname, "..", "public", "api", "docs");

/** Strip JSX/MDX component tags while preserving markdown + code blocks. */
function stripJSX(content) {
  const codeBlocks = [];
  let cleaned = content.replace(/```[\s\S]*?```/g, (m) => {
    codeBlocks.push(m);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  cleaned = cleaned.replace(/^import\s+.*$/gm, "");
  cleaned = cleaned.replace(/<[A-Z][a-zA-Z]*(?:\s[^>]*)?\/>/g, "");
  let prev = "";
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(/<([A-Z][a-zA-Z]*)[^>]*>[\s\S]*?<\/\1>/g, "");
  }
  cleaned = cleaned.replace(/<\/?[A-Z][a-zA-Z]*[^>]*>/g, "");
  cleaned = cleaned.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i, 10)]);
  return cleaned.replace(/\n{4,}/g, "\n\n\n").trim();
}

function extractHeadings(content) {
  const matches = content.match(/^#{1,6}\s+(.+)$/gm) || [];
  return matches.map((h) => h.replace(/^#+\s+/, "").replace(/[*_`]/g, ""));
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const index = [];
for (const file of walk(CONTENT_DIR)) {
  const rel = path.relative(CONTENT_DIR, file).replace(/\.mdx$/, "");
  const slug = rel.endsWith("/index") ? rel.slice(0, -"/index".length) : rel;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  if (data.sidebar_hidden) continue;
  const clean = stripJSX(content);
  const doc = {
    title: data.title || slug,
    description: data.description || "",
    slug,
    content: clean,
    headings: extractHeadings(content),
    wordCount: clean.split(/\s+/).filter(Boolean).length,
  };
  const outFile = path.join(OUT_DIR, `${slug}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(doc));
  index.push({ slug, title: doc.title, description: doc.description });
}

index.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(path.join(__dirname, "..", "public", "api", "docs.json"), JSON.stringify(index, null, 2));
fs.writeFileSync(
  path.join(__dirname, "..", "public", "api", "health.json"),
  JSON.stringify({ status: "ok", pages: index.length })
);

console.log(`[content-api] Generated ${index.length} doc JSON files + index + health -> public/api/`);
