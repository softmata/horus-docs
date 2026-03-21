# HORUS Documentation

Official documentation site for [HORUS](https://github.com/softmata/horus) — a real-time robotics framework with zero-copy IPC and deterministic scheduling.

**Live**: [docs.horusrobotics.dev](https://docs.horusrobotics.dev)

## Stats

- **244 pages** across 15 sections
- **Rust + Python** with full language parity (LanguageTabs on all pages)
- **31 Rust API pages**, **31 Python API pages**, **12 message category pages** per language
- **21 recipes** (copy-paste robotics patterns), **12 tutorials** (step-by-step)
- **31 pre-rendered Mermaid diagrams**, **7 interactive Recharts benchmark charts**
- Full-text search (FlexSearch), dark/light mode, Vercel CDN deployment

## Running Locally

```bash
npm install
npm run dev        # http://localhost:3009
npm run build      # Production build (244 pages)
npm start          # Production server
```

## Content Structure

```
content/docs/
  getting-started/   # 12 pages — installation, quick start, language guides
  tutorials/         # 12 pages — numbered step-by-step (Rust + Python pairs)
  recipes/           # 21 pages — copy-paste robotics patterns
  concepts/          # 22 pages — architecture, nodes, topics, scheduler, RT
  rust/api/          # 31 pages — Node, Topic, Scheduler, messages, drivers
  python/api/        # 31 pages — Node, Topic, Scheduler, messages, drivers
  python/            # 19 pages — guides (GIL, NumPy, deployment, testing, etc.)
  stdlib/            # 17 pages — per-message deep dives (Imu, CmdVel, LaserScan)
  advanced/          # 9 pages  — RT setup, safety monitor, blackbox, record/replay
  development/       # 14 pages — CLI reference, testing, debugging, monitoring
  operations/        # 2 pages  — deployment (SSH, Docker, systemd)
  performance/       # 3 pages  — benchmarks (measured), optimization guide
  package-management/ # 5 pages — horus.toml, lockfile, registry, publishing
  plugins/           # 3 pages  — plugin system
  reference/         # 5 pages  — cheatsheets, API index, internals
  learn/             # 4 pages  — vs ROS2, why HORUS
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
