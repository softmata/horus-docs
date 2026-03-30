/**
 * Build-time script to generate llms-full.txt — a single plain-text file
 * containing ALL documentation pages for AI agent consumption.
 *
 * Run this before `next build` to create a static llms-full.txt in public/.
 * AI agents can fetch /llms-full.txt to get the entire docs in one request.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const DOCS_DIR = path.join(process.cwd(), 'content/docs');
const OUTPUT_FILE = path.join(process.cwd(), 'public/llms-full.txt');

// Section ordering — controls the order sections appear in output
const SECTION_ORDER = [
  'getting-started',
  'learn',
  'concepts',
  'tutorials',
  'rust',
  'rust-guide',
  'python',
  'python-guide',
  'development',
  'advanced',
  'stdlib',
  'plugins',
  'package-management',
  'performance',
  'operations',
  'reference',
  'recipes',
];

const SECTION_LABELS = {
  'getting-started': 'Getting Started',
  'learn': 'Learn',
  'concepts': 'Core Concepts',
  'tutorials': 'Tutorials',
  'rust': 'Rust',
  'rust-guide': 'Rust Guide',
  'python': 'Python',
  'python-guide': 'Python Guide',
  'development': 'Development',
  'advanced': 'Advanced Topics',
  'stdlib': 'Standard Library',
  'plugins': 'Plugins',
  'package-management': 'Package Management',
  'performance': 'Performance',
  'operations': 'Operations',
  'reference': 'Reference',
  'recipes': 'Recipes',
};

/**
 * Strip JSX/MDX component tags from content while preserving markdown and code blocks.
 * Keeps fenced code blocks verbatim — only strips React component syntax.
 */
function stripJSX(content) {
  // Protect code blocks from JSX stripping
  const codeBlocks = [];
  let protected = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Remove import statements
  protected = protected.replace(/^import\s+.*$/gm, '');

  // Remove self-closing JSX tags: <ComponentName ... />
  protected = protected.replace(/<[A-Z][a-zA-Z]*(?:\s[^>]*)?\/>/g, '');

  // Remove paired JSX tags: <Component ...>...</Component>
  // Handle nested content by removing outermost pairs iteratively
  let prev = '';
  while (prev !== protected) {
    prev = protected;
    protected = protected.replace(/<([A-Z][a-zA-Z]*)[^>]*>[\s\S]*?<\/\1>/g, '');
  }

  // Remove standalone opening/closing JSX tags that might remain
  protected = protected.replace(/<\/?[A-Z][a-zA-Z]*[^>]*>/g, '');

  // Restore code blocks
  protected = protected.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)]);

  // Clean up excessive blank lines (more than 2 consecutive)
  protected = protected.replace(/\n{4,}/g, '\n\n\n');

  return protected.trim();
}

/**
 * Recursively crawl content/docs/ and collect all pages with metadata.
 */
function crawlDocs(dir, baseSlug = '') {
  const pages = [];

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return pages;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      pages.push(...crawlDocs(fullPath, `${baseSlug}/${entry.name}`));
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      try {
        const source = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(source);

        const slug = entry.name.startsWith('index.')
          ? baseSlug || '/'
          : `${baseSlug}/${entry.name.replace(/\.(mdx|md)$/, '')}`;

        const section = (baseSlug.split('/').filter(Boolean)[0]) || 'root';
        const order = data.order || data.weight || 999;

        pages.push({
          title: data.title || entry.name.replace(/\.(mdx|md)$/, ''),
          description: data.description || '',
          slug: slug.startsWith('/') ? slug : `/${slug}`,
          section,
          order,
          content: stripJSX(content),
        });
      } catch (err) {
        console.warn(`  Warning: Could not parse ${fullPath}: ${err.message}`);
      }
    }
  }

  return pages;
}

/**
 * Build llms-full.txt from all MDX documentation pages.
 */
function buildLlmsFull() {
  console.log('Building llms-full.txt...');

  const pages = crawlDocs(DOCS_DIR);

  // Group by section
  const sections = {};
  for (const page of pages) {
    if (!sections[page.section]) {
      sections[page.section] = [];
    }
    sections[page.section].push(page);
  }

  // Sort pages within each section by order
  for (const key of Object.keys(sections)) {
    sections[key].sort((a, b) => a.order - b.order);
  }

  // Build output
  const lines = [];

  // Header
  lines.push('# HORUS Documentation (Full)');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Pages: ${pages.length}`);
  lines.push(`Source: https://docs.horusrobotics.dev`);
  lines.push(`Condensed overview: https://docs.horusrobotics.dev/llms.txt`);
  lines.push('');
  lines.push('This file contains the complete HORUS documentation in plain text.');
  lines.push('AI agents can use this to understand the full framework.');
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  for (const sectionKey of SECTION_ORDER) {
    if (sections[sectionKey] && sections[sectionKey].length > 0) {
      const label = SECTION_LABELS[sectionKey] || sectionKey;
      lines.push(`- ${label} (${sections[sectionKey].length} pages)`);
    }
  }
  // Handle sections not in SECTION_ORDER
  for (const sectionKey of Object.keys(sections)) {
    if (!SECTION_ORDER.includes(sectionKey)) {
      lines.push(`- ${sectionKey} (${sections[sectionKey].length} pages)`);
    }
  }
  lines.push('');

  // Content by section
  const orderedSections = [
    ...SECTION_ORDER.filter(s => sections[s]),
    ...Object.keys(sections).filter(s => !SECTION_ORDER.includes(s)),
  ];

  for (const sectionKey of orderedSections) {
    const sectionPages = sections[sectionKey];
    if (!sectionPages || sectionPages.length === 0) continue;

    const label = SECTION_LABELS[sectionKey] || sectionKey;

    lines.push('');
    lines.push('========================================');
    lines.push(`# SECTION: ${label}`);
    lines.push('========================================');
    lines.push('');

    for (const page of sectionPages) {
      lines.push('---');
      lines.push(`## ${page.title}`);
      lines.push(`Path: ${page.slug}`);
      if (page.description) {
        lines.push(`Description: ${page.description}`);
      }
      lines.push('');
      lines.push(page.content);
      lines.push('');
    }
  }

  // Handle root-level pages (no section)
  if (sections['root'] && sections['root'].length > 0) {
    lines.push('');
    lines.push('========================================');
    lines.push('# SECTION: Other');
    lines.push('========================================');
    lines.push('');
    for (const page of sections['root']) {
      lines.push('---');
      lines.push(`## ${page.title}`);
      lines.push(`Path: ${page.slug}`);
      if (page.description) {
        lines.push(`Description: ${page.description}`);
      }
      lines.push('');
      lines.push(page.content);
      lines.push('');
    }
  }

  const output = lines.join('\n');

  // Write output
  const publicDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);
  console.log(`✅ Generated llms-full.txt`);
  console.log(`   Pages: ${pages.length}`);
  console.log(`   Sections: ${orderedSections.length}`);
  console.log(`   Size: ${sizeKB} KB`);
  console.log(`   Output: ${OUTPUT_FILE}`);
}

buildLlmsFull();
