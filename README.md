# HORUS Documentation Site

Open-source documentation for the HORUS robotics framework.

## Overview

This is the official documentation site for HORUS - a production-grade, open-source robotics framework built in Rust. The site provides comprehensive guides, API references, and performance benchmarks.

## Running Locally

```bash
# Install dependencies
npm install

# Start development server (port 3009)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Contract checks — both gate CI, both run in about a second
npm run check           # links + performance claims
npm run check:links     # every internal link and #anchor resolves
npm run check:claims    # no retracted performance claim anywhere

# Include the framework README's links in the check
node scripts/check-links.mjs ../horus/README.md
```

Visit `http://localhost:3009` to view the documentation.

## Content Structure

```
content/
  docs/                       # 151 pages, one directory per section
    getting-started/          # installation, quick-start, choosing-language,
                              # second-application, common-mistakes
    concepts/                 # language-neutral explanations (nodes, topics,
                              # scheduler, execution classes, transforms)
    rust/  python/  cpp/      # per-language API references, guides, examples
    tutorials/                # the ten-part series, in all three languages
    recipes/                  # task-shaped answers
    examples/                 # the ten projects shipped in horus/examples
    learn/                    # orientation pages (coming-from-ros2)
    development/              # CLI reference, monitor, testing, env vars
    package-management/       # horus.toml, environments, prebuilt nodes
    advanced/                 # deployment, RT, safety, blackbox, scheduler
    performance/              # benchmarks and the optimization guide
    plugins/
  locales/<lang>/docs/        # translations; English is the fallback
```

Routes come from the file tree: `content/docs/a/b.mdx` is served at `/a/b`, and
`content/docs/a/index.mdx` at `/a`. `app/[...slug]/page.tsx` sets
`dynamicParams = false`, so a link to a slug with no file behind it is a hard 404 —
`npm run check:links` is the guard for that.

Adding a page means adding it to `sections` in `components/DocsSidebar.tsx` as well:
`PrevNextNav` derives its order from that list, and a contract test in the framework
repo fails on any page nothing links to.

## Tech Stack

- **Next.js 15** - React framework with App Router
- **MDX** - Markdown with React components
- **Tailwind CSS** - Utility-first styling
- **Shiki** - Syntax highlighting
- **TypeScript** - Type safety

## Open Source

This documentation site is part of the HORUS open-source project:

- **License**: Apache-2.0
- **Repository**: https://github.com/softmata/horus
- **Framework**: `/horus` directory in the main repository

## Contributing

We welcome contributions! To contribute to the documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes in `content/`
4. Test locally with `npm run dev`
5. Submit a pull request

### Writing Guidelines

**IMPORTANT**: Before editing any `.mdx` files, read [MDX_GUIDELINES.md](./MDX_GUIDELINES.md) to avoid common rendering errors!

Common mistakes to avoid:
- Using `<` directly in text (e.g., `<1%` should be `&lt;1%`)
- Writing generic types without backticks (e.g., `Topic<T>` should be `` `Topic<T>` ``)
- Starting headings with numbers

General guidelines:
- Use clear, concise language
- Include code examples
- Test all code snippets
- Follow existing formatting
- Update navigation if adding new pages — `sections` in `components/DocsSidebar.tsx`
- Run `npm run build` before committing to catch MDX errors
- Run `npm run check` before committing to catch dead links and unsupported claims

## Performance Focus

Every performance figure on this site has to be traceable to a benchmark in the HORUS
repository. The measured one-way medians, from `all_paths_latency` on the reference
i7-10750H, are:

- **20 ns** same-thread and **63 ns** cross-thread, 1:1 uncontended
- **151 ns** cross-process 1:1 — against a **79 ns** raw-shared-memory hardware floor
- **~190-280 ns** for contended multi-producer paths

Competitor numbers (iceoryx, CycloneDDS, FastDDS, ROS 2) are **published reference
values**, not measurements taken here, and the pages quoting them say so.
`npm run check:claims` fails on the ratios that were previously asserted without either.
See [Benchmarks](content/docs/performance/benchmarks.mdx) for the method.

## Links

- **Main Repository**: https://github.com/softmata/horus
- **Discord Community**: https://discord.gg/hEZC3ev2Nf
- **Issues**: https://github.com/softmata/horus/issues
- **Discussions**: https://github.com/softmata/horus/discussions

## License

Documentation content is licensed under Apache-2.0, matching the HORUS framework license.

---

**Built with ❤️ by the open-source community**
