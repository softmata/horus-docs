/**
 * Documentation Structure Configuration
 *
 * This file defines the canonical organization of the HORUS docs.
 * It serves three purposes:
 *
 * 1. CONTRIBUTOR GUIDE — tells contributors where to put new pages
 * 2. SIDEBAR GENERATION — scripts/build-sidebar.js uses this as the source of truth
 * 3. VALIDATION — CI can check that every page belongs to a defined section
 *
 * HOW TO ADD A NEW PAGE:
 *   1. Find the right section below
 *   2. Create your .mdx file in the directory listed for that section
 *   3. Add frontmatter: title, description, order
 *   4. Run: npm run build:sidebar
 *   5. Done — no other files to edit
 *
 * HOW TO ADD A NEW SECTION:
 *   1. Add a section entry below with directory and order
 *   2. Create the directory under content/docs/
 *   3. Create an index.mdx with title and description
 *   4. Run: npm run build:sidebar
 */

export interface SectionConfig {
  /** Display name in the sidebar */
  title: string;
  /** Directory under content/docs/ where pages live */
  directory: string;
  /** Additional directories that merge into this section */
  mergeFrom?: string[];
  /** Sidebar display order (lower = earlier) */
  order: number;
  /** Description for contributors */
  purpose: string;
  /** What goes here vs what doesn't */
  rules: string[];
  /** Nested sub-sections (collapsible in sidebar) */
  children?: {
    title: string;
    directory: string;
    mergeFrom?: string[];
  }[];
}

const docsConfig: SectionConfig[] = [
  {
    title: "Getting Started",
    directory: "getting-started",
    mergeFrom: ["learn", "concepts/what-is-horus", "concepts/architecture"],
    order: 0,
    purpose: "First-time user journey: from 'what is this?' to 'my first working robot'",
    rules: [
      "Target audience: someone who just heard about HORUS",
      "Every page should be completable in <15 minutes",
      "No prerequisites beyond 'installed HORUS'",
      "PUT HERE: installation, quick starts, 'why horus', 'vs ROS2', common mistakes",
      "DON'T PUT HERE: deep API reference, advanced configuration, internals",
    ],
  },
  {
    title: "Tutorials",
    directory: "tutorials",
    order: 1,
    purpose: "Step-by-step guided learning path with increasing complexity",
    rules: [
      "Numbered sequence: 01-sensor → 02-motor → 03-full-robot → 04-messages → 05-hardware",
      "Each tutorial builds on the previous one",
      "Both Rust and Python versions of each tutorial",
      "Complete code that compiles/runs — no pseudo-code",
      "PUT HERE: guided learning with explanations",
      "DON'T PUT HERE: copy-paste recipes (use recipes/), reference docs (use api/)",
    ],
  },
  {
    title: "Recipes",
    directory: "recipes",
    order: 2,
    purpose: "Copy-paste solutions for specific tasks — problem → code → done",
    rules: [
      "Each recipe is self-contained (no prerequisites beyond basics)",
      "Problem statement at the top: 'You need to...'",
      "Working code that can be copied directly",
      "PUT HERE: differential drive, PID controller, emergency stop, sensor fusion",
      "DON'T PUT HERE: explanations of why things work (use guides/), API details (use api/)",
    ],
  },
  {
    title: "Core Concepts",
    directory: "concepts",
    order: 3,
    purpose: "Explain HOW and WHY things work — architecture, design decisions, mental models",
    rules: [
      "Beginner pages: nodes-beginner, topics-beginner, scheduler-beginner",
      "Deep dives: core-concepts-nodes, core-concepts-topic, core-concepts-scheduler",
      "Architecture: execution-classes, real-time, multi-process, multi-language",
      "Configuration: horus-toml, choosing-configuration",
      "PUT HERE: explanations with diagrams, design decisions, trade-offs",
      "DON'T PUT HERE: method signatures (use api/), step-by-step builds (use tutorials/)",
    ],
  },
  {
    title: "Rust",
    directory: "rust",
    order: 4,
    purpose: "Rust API reference — every type, method, parameter documented",
    rules: [
      "Java-level depth: signature, parameters, returns, errors, examples",
      "One page per major type (Scheduler, Topic, Image, etc.)",
      "PUT HERE: Rust-specific API documentation",
      "DON'T PUT HERE: Python API (use python/), concepts (use concepts/)",
    ],
    children: [
      {
        title: "API Reference",
        directory: "rust/api",
      },
      {
        title: "Examples",
        directory: "rust/examples",
      },
    ],
  },
  {
    title: "Python",
    directory: "python",
    order: 5,
    purpose: "Python API reference — every class, method, parameter documented",
    rules: [
      "Mirror Rust API structure where applicable",
      "Python-specific patterns (kwargs, async, numpy interop)",
      "PUT HERE: Python-specific API documentation",
      "DON'T PUT HERE: Rust API (use rust/), concepts (use concepts/)",
    ],
    children: [
      {
        title: "API Reference",
        directory: "python/api",
      },
      {
        title: "Library",
        directory: "python/library",
        mergeFrom: ["python/messages"],
      },
      {
        title: "Examples",
        directory: "python/examples",
      },
    ],
  },
  {
    title: "Standard Library",
    directory: "stdlib",
    order: 11,
    purpose: "Per-message-type deep dives — fields, constructors, patterns, ROS2 equivalents",
    rules: [
      "One page per message type (Imu, CmdVel, LaserScan, etc.)",
      "Each page: fields table, constructor, common patterns, ROS2 equivalent, design decisions",
      "Language-agnostic — show both Rust and Python examples",
      "PUT HERE: message type documentation",
      "DON'T PUT HERE: Rust API specifics (use rust/api/), Python wrappers (use python/messages/)",
    ],
  },
  {
    title: "Development",
    directory: "development",
    order: 6,
    purpose: "Developer tools and workflows — CLI, testing, debugging, monitoring",
    rules: [
      "CLI reference is the biggest page — all 45+ commands",
      "Tool-oriented: how to use horus monitor, horus test, horus deploy",
      "PUT HERE: developer workflow documentation",
      "DON'T PUT HERE: API reference (use api/), conceptual explanations (use concepts/)",
    ],
  },
  {
    title: "Advanced Topics",
    directory: "advanced",
    order: 7,
    purpose: "Power user features — RT setup, blackbox, record/replay, deterministic mode",
    rules: [
      "Prerequisites: user has completed getting-started and at least one tutorial",
      "Each page covers one advanced feature in depth",
      "PUT HERE: scheduler configuration, safety monitor, fault tolerance, RT setup",
      "DON'T PUT HERE: beginner content (use getting-started/), API reference (use api/)",
    ],
  },
  {
    title: "Operations",
    directory: "operations",
    order: 8,
    purpose: "Deploying and running HORUS in production — deploy, cross-compile",
    rules: [
      "PUT HERE: deploy-to-robot, cross-compilation, production configuration",
      "DON'T PUT HERE: development workflows (use development/)",
    ],
  },
  {
    title: "Plugins",
    directory: "plugins",
    order: 9,
    purpose: "Plugin system — creating, managing, and distributing CLI plugins",
    rules: [
      "PUT HERE: plugin creation guide, plugin management, plugin registry",
    ],
  },
  {
    title: "Package Management",
    directory: "package-management",
    order: 10,
    purpose: "Dependency management — horus.toml configuration, lockfile, registry",
    rules: [
      "PUT HERE: configuration reference, lockfile, package management overview",
      "The configuration reference is the MOST IMPORTANT page for contributors",
    ],
  },
  {
    title: "Performance",
    directory: "performance",
    order: 12,
    purpose: "Performance optimization and benchmarks",
    rules: [
      "PUT HERE: optimization guide, benchmark results, profiling",
    ],
  },
  {
    title: "Reference",
    directory: "reference",
    order: 13,
    purpose: "Quick-lookup references — cheatsheets, AI context, internals",
    rules: [
      "PUT HERE: API cheatsheet, API lookup by task, AI context, internals",
      "These are lookup tables, not learning material",
    ],
  },
];

export default docsConfig;
