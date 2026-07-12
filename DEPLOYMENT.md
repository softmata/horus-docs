# Deployment — Cloudflare Pages (static)

horus-docs is a fully static Next.js site (`output: 'export'`) hosted on
**Cloudflare Pages** (free tier: unlimited requests + bandwidth, 500 builds/mo).

## Build

```bash
npm run build      # runs the 6 generators + next export -> out/
```

Output is the static `out/` directory (297 HTML pages + assets, `_headers`,
`_redirects`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, and the raw
content API under `api/`).

## Cloudflare Pages project settings

| Setting | Value |
|---|---|
| Framework preset | Next.js (Static HTML Export) |
| Build command | `npm run build` |
| Build output directory | `out` |
| Production branch | `main` (preview builds on `dev`) |
| Environment variable | `NODE_VERSION` = `20` |

First-time setup: **Cloudflare dashboard → Workers & Pages → Create → Pages →
Connect to Git → `softmata/horus-docs`**, then apply the settings above.

## Custom domain

In the Pages project → **Custom domains → add `docs.horusrobotics.dev`**. DNS is
already on Cloudflare, so it wires the CNAME automatically. Once green, remove the
domain from Vercel and delete the Vercel project.

## Features (full parity, all static)

- **Security headers + CSP** — `public/_headers` (Cloudflare-native).
- **Raw content API** — `scripts/build-content-api.mjs` emits static JSON:
  - `GET /api/docs/{slug}` → `{ title, description, slug, content, headings, wordCount }`
  - `GET /api/docs` → index `[{ slug, title, description }]`
  - `GET /api/health` → `{ status, pages }`
  - Extension-less URLs are preserved by `public/_redirects` rewrites over the
    `*.json` files.
- **Analytics** — Cloudflare Web Analytics via `components/Analytics.tsx`.
  Set `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` (Cloudflare dashboard → Web Analytics) as a
  Pages build env var; the beacon then renders. Or enable auto-injection from the
  dashboard (the CSP already allows `static.cloudflareinsights.com`).

## Notes

- The CSP keeps `'unsafe-eval'` — required by Prism (syntax highlighting) and
  Mermaid. Do not remove it.
- `out/` and `public/api/` are generated build artifacts (gitignored); the
  content API is rebuilt on every Cloudflare build.
