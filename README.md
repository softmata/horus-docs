# HORUS Documentation

Official documentation site for [HORUS](https://github.com/softmata/horus) — a real-time robotics framework with zero-copy IPC and deterministic scheduling.

**Live**: [docs.horusrobotics.dev](https://docs.horusrobotics.dev)

## Stats

- **295 pages** across 15 sidebar sections
- **Rust + Python + C++** with per-language paired navigation (header toggle) and synced `<LanguageTabs>` on shared-concept pages
- **32 Rust API pages**, **31 Python API pages**, plus a 15-page C++ API reference at near-Rust parity
- **33 recipes** (copy-paste robotics patterns), **28 tutorials** (step-by-step)
- **40+ pre-rendered Mermaid diagrams** (static SVG via `mmdc`), interactive Recharts benchmark charts
- Full-text search (FlexSearch), dark/light mode, Vercel CDN deployment

## Running Locally

```bash
npm install
npm run dev        # http://localhost:3009
npm run build      # Production build (295 pages)
npm start          # Production server
```

## Content Structure

```
content/docs/
  getting-started/   # 17 pages — installation, quick start, language guides
  tutorials/         # 28 pages — numbered step-by-step (Rust / Python / C++)
  recipes/           # 33 pages — copy-paste robotics patterns
  concepts/          # 25 pages — architecture, nodes, topics, scheduler, RT
  rust/              # 37 pages — API (rust/api/ 32) + guides
  python/            # 66 pages — API (python/api/ 31) + guides (GIL, NumPy, deploy…)
  cpp/               # 25 pages — C++ API reference + guides (near-Rust parity)
  stdlib/            # 16 pages — per-message deep dives (Imu, CmdVel, LaserScan)
  development/       # 14 pages — CLI reference, testing, debugging, monitoring
  advanced/          # 9 pages  — RT setup, safety monitor, blackbox, record/replay
  reference/         # 7 pages  — cheatsheets, API index, internals
  package-management/ # 5 pages — horus.toml, lockfile, registry, publishing
  learn/             # 4 pages  — vs ROS2, why HORUS
  performance/       # 4 pages  — benchmarks (measured), optimization guide
  plugins/           # 3 pages  — plugin system
  operations/        # 2 pages  — deployment (SSH, Docker, systemd)
```

## Tech Stack

- **Next.js 15** with App Router (static generation)
- **MDX** via next-mdx-remote 6 + remark-gfm
- **Tailwind CSS** with dark/light mode
- **Shiki** for syntax highlighting (20+ languages)
- **Recharts** for interactive benchmark charts
- **Mermaid** diagrams pre-rendered to static SVG at build time
- **FlexSearch** for client-side full-text search
- **Vercel** for CDN deployment with security headers

## Build Pipeline

```bash
npm run build
```

Runs these steps in order:

1. `build-sidebar.js` — scan MDX frontmatter, generate `sidebar-data.json`
2. `build-search-index.js` — index all pages into `search-index.json`
3. `build-llms-full.js` — generate LLM context document
4. `pre-render-mermaid.mjs` — render 31 Mermaid diagrams to static SVG via mmdc
5. `extract-code-blocks.mjs` — validate code samples
6. `next build` — static generation (244 pages)

## Key Components

| Component | Purpose |
|-----------|---------|
| `LanguageTabs` / `LangTab` | Synced Rust/Python/C++ code tabs |
| `CodeBlock` | Shiki-highlighted code with copy button |
| `Callout` | Info/warning/error callout boxes |
| `MermaidDiagram` | Pre-rendered SVG diagrams (build-time) |
| `BenchmarkCharts` | Interactive Recharts (13 chart types) |
| `SearchModal` | Full-text search (Cmd/Ctrl+K) |
| `Details` | Collapsible sections |

## Writing Docs

Before editing `.mdx` files, read [MDX_GUIDELINES.md](./MDX_GUIDELINES.md).

Key rules:
- Escape `<` in prose text: `&lt;1%`, `` `Topic<T>` `` (backtick generic types)
- Use `<LanguageTabs>` / `<LangTab>` for Rust+Python side-by-side code
- All API claims must match source code — verify constructors against `horus_py/src/messages.rs` (Python) and `horus_core/src/` (Rust)
- Run `npm run build` before committing to catch MDX errors

Cross-reference strategy: [CROSS_REFERENCES.md](./CROSS_REFERENCES.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes in `content/docs/`
4. Test locally with `npm run dev`
5. Run `npm run build` to verify
6. Submit a pull request

## Links

- **Framework**: [github.com/softmata/horus](https://github.com/softmata/horus)
- **Live Docs**: [docs.horusrobotics.dev](https://docs.horusrobotics.dev)
- **Discord**: [discord.gg/hEZC3ev2Nf](https://discord.gg/hEZC3ev2Nf)
- **Issues**: [github.com/softmata/horus-docs/issues](https://github.com/softmata/horus-docs/issues)

## License

Apache-2.0
