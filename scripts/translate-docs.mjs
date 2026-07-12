#!/usr/bin/env node
// Docs translation pipeline. Translates English MDX docs into a target locale with DeepSeek, incrementally
// (skip already-translated pages, --limit N per run so the 278-page corpus translates over many runs
// rather than one huge/expensive job). Output goes to content/i18n/{locale}/<same path> — a SEPARATE tree
// so it never gets mistaken for English content before the docs-app i18n routing is wired (the next step).
//
// Preserves code blocks, JSX components, imports, links, and frontmatter KEYS byte-for-byte; translates
// only human prose (frontmatter title/description values + body prose + code comments). Human review
// before merge is the backstop (same discipline as the blog author).
//
// Usage:
//   node scripts/translate-docs.mjs --locale zh --dry-run          # show what WOULD translate (no API)
//   DEEPSEEK_API_KEY=sk-... node scripts/translate-docs.mjs --locale zh --limit 10
//   DEEPSEEK_API_KEY=sk-... node scripts/translate-docs.mjs --locale ja --file content/docs/getting-started/installation.mdx

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'content/docs');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const DRY_RUN = args.includes('--dry-run');
const LOCALE = opt('locale', '');
const LIMIT = Number(opt('limit', DRY_RUN ? 1e9 : 8));
const ONE_FILE = opt('file', '');
const MAX_BODY = 14000; // whole-file translation cap (larger pages need section chunking — a follow-up)
const LANG = { zh: 'Simplified Chinese', ja: 'Japanese', de: 'German' };

if (!LANG[LOCALE]) { console.error(`[i18n] --locale must be one of: ${Object.keys(LANG).join(', ')}`); process.exit(1); }
const OUT_ROOT = path.join(ROOT, 'content/i18n', LOCALE);

function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.mdx')) out.push(p);
  }
  return out;
}

async function translate(mdx) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      max_tokens: 8000,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: [
            `You translate technical documentation (MDX) into ${LANG[LOCALE]} for the HORUS robotics docs.`,
            'Return the FULL MDX, translated. STRICT rules:',
            '- Translate ONLY human-readable prose: frontmatter `title` and `description` VALUES, body paragraphs,',
            '  list text, table cell text, and code COMMENTS.',
            '- Keep byte-for-byte: all frontmatter KEYS, code inside ``` fences (except comments), inline `code`,',
            '  JSX/MDX components and their props (<Callout>, <LanguageTabs>, etc.), import/export lines, URLs,',
            '  file paths, API names, HORUS identifiers, and Markdown structure/anchors.',
            '- Do not add, remove, or reorder anything. Do not translate the brand "HORUS" or code identifiers.',
            '- Output only the MDX, no commentary, no code fence around the whole thing.',
          ].join('\n'),
        },
        { role: 'user', content: mdx },
      ],
    }),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function main() {
  const all = ONE_FILE ? [path.resolve(ONE_FILE)] : walk(SRC_ROOT);
  let done = 0, skipped = 0, tooBig = 0, translated = 0;
  console.log(`[i18n] locale=${LOCALE} source pages=${all.length} limit=${LIMIT} dryRun=${DRY_RUN}`);

  for (const src of all) {
    if (translated >= LIMIT) break;
    const rel = path.relative(SRC_ROOT, src);
    const target = path.join(OUT_ROOT, rel);
    if (fs.existsSync(target)) { skipped++; continue; }              // incremental: already translated
    const body = fs.readFileSync(src, 'utf-8');
    if (body.length > MAX_BODY) { tooBig++; console.log(`[i18n] SKIP (too large, ${body.length}c): ${rel}`); continue; }

    if (DRY_RUN) { console.log(`[i18n] would translate: ${rel} -> content/i18n/${LOCALE}/${rel}`); done++; continue; }
    if (!process.env.DEEPSEEK_API_KEY) { console.error('[i18n] DEEPSEEK_API_KEY not set (or use --dry-run)'); process.exit(1); }
    try {
      const out = await translate(body);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, out.replace(/\n*$/, '\n'));
      translated++; console.log(`[i18n] translated: ${rel}`);
    } catch (e) { console.error(`[i18n] FAILED ${rel}: ${e.message}`); }
  }

  console.log(`[i18n] done. translated=${translated} skipped(existing)=${skipped} too-large=${tooBig}` +
    (DRY_RUN ? ` would-translate=${done}` : ` remaining≈${Math.max(0, all.length - skipped - translated)}`));
}

main().catch((e) => { console.error('[i18n] failed:', e.message); process.exit(1); });
