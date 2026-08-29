#!/usr/bin/env node
/**
 * Every MDX expression the pages write must survive compilation.
 *
 * next-mdx-remote 6 ships `blockJS`, on by default, whose remark plugin deletes
 * every `{...}` node in the tree -- bare expressions in prose and JSX attribute
 * expressions alike. It is meant for sites whose MDX arrives from an untrusted
 * CMS. On a repository whose MDX is first-party it is a silent content shredder:
 * it removed `chart={`...`}` from all 17 <MermaidDiagram> tags across 11 pages,
 * so `chart` reached the component as `undefined`, its `if (!chart) return`
 * fired before mermaid was ever imported, and every diagram on the site sat on
 * "Loading diagram..." indefinitely.
 *
 * Nothing caught it. The pages still returned 200, the HTML still contained the
 * <figure> and the caption, no request failed and no error was logged -- the
 * only evidence was a diagram that never appeared. So this check does not look
 * at the pages. It runs the site's own compile and asserts that what the author
 * wrote is still in the output.
 *
 * Usage: node scripts/check-mdx-props.mjs [--verbose]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { serialize } from 'next-mdx-remote/serialize';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import matter from 'gray-matter';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');

/**
 * `blockJS` is read out of `lib/mdx.tsx` rather than repeated here. A guard that
 * hardcodes the setting it exists to police proves nothing: delete the line from
 * lib/mdx.tsx and a hardcoded copy would go on compiling with its own value and
 * reporting green while every diagram on the site went blank. Read from source,
 * removing the line makes this check compile the way the site does -- with the
 * library default -- and fail.
 */
function siteBlockJS() {
  const src = fs.readFileSync(path.join(root, 'lib', 'mdx.tsx'), 'utf8');
  const call = src.slice(src.indexOf('compileMDX'));
  if (call.length === 0) throw new Error('lib/mdx.tsx no longer calls compileMDX');
  const m = call.match(/^\s*blockJS:\s*(true|false)\s*,/m);
  return m ? m[1] === 'true' : undefined; // undefined => the library default
}

const SITE_OPTIONS = {
  parseFrontmatter: true,
  blockJS: siteBlockJS(),
  mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [] },
};

/** Collects the expressions an author wrote, from the tree before any plugin strips them. */
function collectExpressions(sink) {
  return () => (tree) => {
    visit(tree, (node) => {
      if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
        sink.push({ kind: 'expression', owner: null, name: null, value: node.value ?? '' });
      }
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        for (const attr of node.attributes ?? []) {
          if (attr.type === 'mdxJsxExpressionAttribute') {
            sink.push({ kind: 'spread', owner: node.name, name: '{...}', value: attr.value ?? '' });
          } else if (attr.value && typeof attr.value === 'object'
                     && attr.value.type === 'mdxJsxAttributeValueExpression') {
            sink.push({ kind: 'attribute', owner: node.name, name: attr.name, value: attr.value.value ?? '' });
          }
        }
      }
    });
  };
}

/**
 * A line of the expression distinctive enough that finding it in the compiled
 * output means the value survived. Short or punctuation-only lines ("end", "}")
 * appear in unrelated compiled code, so they prove nothing.
 */
function witness(value) {
  const lines = String(value).split('\n').map(l => l.trim())
    .filter(l => l.length >= 12 && /[A-Za-z]/.test(l));
  if (lines.length === 0) return String(value).trim() || null;
  return lines.sort((a, b) => b.length - a.length)[0];
}

function mdxFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) mdxFiles(p, out);
    else if (entry.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const files = mdxFiles(path.join(root, 'content'));
const failures = [];
let checked = 0;

for (const file of files) {
  const rel = path.relative(root, file);
  const { content } = matter(fs.readFileSync(file, 'utf8'));
  const found = [];
  let compiled;
  try {
    // The collector runs before next-mdx-remote appends its own plugins, so it
    // sees the author's tree; `compiledSource` is what survives them.
    ({ compiledSource: compiled } = await serialize(
      content,
      { ...SITE_OPTIONS, mdxOptions: { ...SITE_OPTIONS.mdxOptions,
        remarkPlugins: [...SITE_OPTIONS.mdxOptions.remarkPlugins, collectExpressions(found)] } },
      true,
    ));
  } catch (err) {
    failures.push(`${rel}: compile failed -- ${String(err).split('\n')[0]}`);
    continue;
  }

  for (const expr of found) {
    checked++;
    const w = witness(expr.value);
    const where = expr.kind === 'attribute' ? `<${expr.owner} ${expr.name}={...}>`
                : expr.kind === 'spread' ? `<${expr.owner} {...}>`
                : '{expression}';
    if (!w) continue;
    if (!compiled.includes(w)) {
      failures.push(`${rel}: ${where} was dropped during compilation (looked for ${JSON.stringify(w)})`);
    } else if (verbose) {
      console.log(`  ok  ${rel}  ${where}`);
    }
  }
}

console.log(`Checked ${checked} MDX expression${checked === 1 ? '' : 's'} across ${files.length} files.`);

if (failures.length > 0) {
  console.error(`\n${failures.length} expression${failures.length === 1 ? '' : 's'} did not survive compilation:\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error('\nThe page will render as though the author never wrote it: no error, no failed');
  console.error('request, just missing content. Check `blockJS` in lib/mdx.tsx.');
  process.exit(1);
}

if (checked === 0) {
  console.error('\nNo MDX expressions found at all. Either every one was removed, or this');
  console.error('check no longer sees the content it was written to guard.');
  process.exit(1);
}

console.log('Every expression survived.');
