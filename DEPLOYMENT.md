# Deployment — Cloudflare Worker (static assets)

horus-docs is a fully static Next.js site (`output: 'export'`) deployed as a
**Cloudflare Worker with static assets**. Requests are served straight from the
uploaded assets — the Worker has no script (`main`), so there are no Worker
invocations to meter and static asset requests are free and unlimited.

> Previously this doc described a Cloudflare **Pages** project. The project is a
> Worker now (Cloudflare's Git → Worker flow). Everything Pages gave us —
> `_headers`, `_redirects`, extension-less routes, custom 404 — works identically
> here and is verified below.

## Build

```bash
npm run build      # 6 generators + next build -> out/
```

The build chain is:

```
build-sidebar → build-search-index → build-llms-full
→ pre-render-mermaid → extract-code-blocks → build-content-api → next build
```

Output is the static `out/` directory — ~1000 files: 278 doc pages (286 static
routes), `_headers`, `_redirects`, `404.html`, `robots.txt`, `sitemap.xml`,
`manifest.webmanifest`, and the raw content API under `api/`.

**The build command must be `npm run build`, never `npx next build`.** The six
generators run first; skipping them produces a site with no sidebar, no search
and no `/api` — and the build still reports success.

## `wrangler.jsonc` — required, do not delete

```jsonc
{
  "name": "horus-docs",
  "compatibility_date": "2026-07-30",
  "assets": {
    "directory": "./out",
    "not_found_handling": "404-page"
  }
}
```

Without this file, `wrangler deploy` auto-detects "Next.js", assumes a *server*,
and runs `@opennextjs/cloudflare`. OpenNext expects `.next/standalone/`, which
`output: 'export'` never emits, so the deploy dies with:

```
ENOENT: .next/standalone/.next/server/pages-manifest.json
```

The config short-circuits that detection. horus-blog carries the same file for
the same reason — but it needs a `worker-entry.js` to strip its `/blog` basePath,
whereas horus-docs serves at the domain root and needs no script at all.

## Worker project settings

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |
| `NODE_VERSION` | `22` |

Node 22 matters: wrangler warns `Wrangler requires at least Node.js v22.0.0` on
Node 20 (what `.nvmrc` pins for the Next build). The build itself is fine on
either; 22 keeps the deploy step quiet.

First-time setup: **Cloudflare dashboard → Workers & Pages → Create → Import a
repository → `softmata/horus-docs`**, then apply the settings above.

## Custom domain

**Workers & Pages → horus-docs → Settings → Domains & Routes → Add → Custom
Domain → `docs.horusrobotics.dev`.**

Do *not* hand-create a DNS record. A Worker has no origin IP, and
`*.workers.dev` is not a valid CNAME target — a manual record points at nothing.
The Custom Domain flow creates the DNS record *and* binds the hostname to the
Worker in one step. Delete any pre-existing record for the hostname first, or the
attach will fail.

## Verification

Against the deployment (`horus-docs.<subdomain>.workers.dev` or the live domain):

```bash
curl -sI  $URL | head -1                              # 200
curl -sI  $URL | grep -i "content-security\|strict-transport"   # _headers applied
curl -s   $URL/api/health                             # {"status":"ok","pages":278}
curl -sI  $URL/rust/api/scheduler | head -1           # 200 (extension-less route)
curl -sI  $URL/nope | head -1                         # 404
```

All five confirmed passing on the Worker. On the live domain, also check that no
`x-vercel-*` header is present — that proves the old Vercel record is gone.

## Features (full parity, all static)

- **Security headers + CSP** — `public/_headers`, honored by Workers static assets.
- **Raw content API** — `scripts/build-content-api.mjs` emits static JSON:
  - `GET /api/docs/{slug}` → `{ title, description, slug, content, headings, wordCount }`
  - `GET /api/docs` → index `[{ slug, title, description }]`
  - `GET /api/health` → `{ status, pages }`
  - Extension-less URLs are preserved by `public/_redirects` rewrites over the
    `*.json` files.
- **Analytics** — Cloudflare Web Analytics via `components/Analytics.tsx`.
  Set `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (Cloudflare dashboard → Web Analytics) as a
  build env var; the beacon then renders. Or enable auto-injection from the
  dashboard (the CSP already allows `static.cloudflareinsights.com`).

## Notes

- The CSP keeps `'unsafe-eval'` — required by Prism (syntax highlighting) and
  Mermaid. Do not remove it.
- `out/` and `public/api/` are generated build artifacts (gitignored); the
  content API is rebuilt on every Cloudflare build.
- Mermaid diagrams are pre-rendered to `public/diagrams/*.svg` and **committed**.
  The build reports `0 new, N cached`, so `mmdc` never runs on CI and no Chromium
  download is attempted. Adding a *new* diagram locally regenerates the SVG —
  commit it, or CI falls back to a placeholder.
