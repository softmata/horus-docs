/**
 * Build sidebar navigation data from MDX frontmatter.
 *
 * Run before `next build` to generate lib/sidebar-data.json.
 * Contributors only need to add frontmatter to their .mdx file —
 * no need to edit DocsSidebar.tsx.
 *
 * Usage: node scripts/build-sidebar.js
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const contentDir = path.join(__dirname, '..', 'content/docs');
const outputPath = path.join(__dirname, '..', 'lib/sidebar-data.json');

/**
 * Normalize a frontmatter `language` value to the canonical sidebar language.
 * Lets a page explicitly declare which language filter it belongs to, overriding
 * the path heuristic in lib/language-pairs.ts. Use this for language-specific
 * pages whose per-language siblings live at mismatched slugs (which the heuristic
 * cannot pair), e.g. tutorials/05-hardware-drivers ↔ 05-hardware-and-rt-python.
 * Returns undefined for absent/unknown values (page stays heuristic-classified).
 */
function normalizeLang(v) {
  if (!v) return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === 'rust') return 'Rust';
  if (s === 'python' || s === 'py') return 'Python';
  if (s === 'cpp' || s === 'c++') return 'C++';
  return undefined;
}

/** Build a sidebar link object, carrying explicit language/group only when set. */
function toLink(page) {
  return {
    title: page.title,
    href: page.href,
    order: page.order,
    ...(page.language && { language: page.language }),
    ...(page.group && { group: page.group }),
  };
}

const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const stripGroup = ({ group, ...rest }) => rest;

/**
 * Partition a flat list of links into ungrouped links + labelled sub-groups
 * (from `sidebar_group` frontmatter). Groups are ordered by the lowest page
 * order they contain; ungrouped links render first. Returns { links, groups? }.
 */
function applyGroups(links) {
  if (!links.some((l) => l.group)) {
    return { links: [...links].sort(byOrder) };
  }
  const ungrouped = links.filter((l) => !l.group).sort(byOrder).map(stripGroup);
  const map = new Map();
  for (const l of links) {
    if (!l.group) continue;
    if (!map.has(l.group)) map.set(l.group, []);
    map.get(l.group).push(l);
  }
  const groups = [...map.entries()]
    .map(([label, gl]) => ({
      label,
      order: Math.min(...gl.map((l) => l.order ?? 999)),
      links: gl.sort(byOrder).map(stripGroup),
    }))
    .sort((a, b) => a.order - b.order);
  return { links: ungrouped, groups };
}

/**
 * Directory-to-section mapping.
 * Pages in these directories automatically appear in the named section.
 * Override per-page with `sidebar_section` frontmatter.
 */
const DIRECTORY_SECTION_MAP = {
  'getting-started': 'Getting Started',
  'tutorials': 'Tutorials',
  'recipes': 'Recipes',
  'concepts': 'Core Concepts',
  'rust': 'Rust',
  'cpp': 'C++',
  'python': 'Python',
  'development': 'Development',
  'advanced': 'Advanced Topics',
  'operations': 'Deployment & Performance',
  'plugins': 'Packages & Plugins',
  'package-management': 'Packages & Plugins',
  'stdlib': 'Standard Library',
  'performance': 'Deployment & Performance',
  'reference': 'Reference',
  'learn': 'Getting Started',
};

/** Section display order (lower = earlier). */
const SECTION_ORDER = {
  'Getting Started': 0,
  'Tutorials': 1,
  'Recipes': 2,
  'Core Concepts': 3,
  'Rust': 4,
  'C++': 5,
  'Python': 6,
  'Development': 7,
  'Advanced Topics': 8,
  'Deployment & Performance': 9,
  'Packages & Plugins': 10,
  'Standard Library': 11,
  'Reference': 12,
};

/**
 * Pages that should nest under a parent link (collapsible sub-sections).
 * Key: parent href, Value: true.
 * Children are detected by matching href prefix.
 */
const NESTING_PARENTS = {
  '/rust/api': 'API Reference',
  '/rust/examples': 'Examples',
  '/python/api': 'API Reference',
  '/python/library': 'Library',
  '/python/messages': '/python/library', // merge into /python/library parent
  '/cpp/api': 'API Reference',
  '/cpp/examples': 'Examples',
};

function scanDir(dir, basePath = []) {
  const pages = [];
  if (!fs.existsSync(dir)) return pages;

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      pages.push(...scanDir(fullPath, [...basePath, entry]));
    } else if (entry.endsWith('.mdx')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data } = matter(raw);

      if (data.sidebar_hidden) continue;

      const fileName = entry.replace(/\.mdx$/, '');
      const href = fileName === 'index'
        ? '/' + basePath.join('/')
        : '/' + [...basePath, fileName].join('/');

      pages.push({
        href,
        title: data.title || fileName,
        order: data.sidebar_order ?? data.order ?? data.weight ?? 999,
        section: data.sidebar_section || DIRECTORY_SECTION_MAP[basePath[0]] || basePath[0],
        directory: basePath.join('/'),
        depth: basePath.length,
        language: normalizeLang(data.language),
        group: data.sidebar_group || undefined,
      });
    }
  }
  return pages;
}

function buildNested(pages, sectionName) {
  // Find pages that belong to nesting parents
  const topLevel = [];
  const childMap = new Map(); // parent href -> children[]

  for (const page of pages) {
    let nested = false;

    for (const [parentHref, parentTitleOrRedirect] of Object.entries(NESTING_PARENTS)) {
      // Check if this page is a child of a nesting parent
      // e.g., /rust/api/scheduler is a child of /rust/api
      if (page.href.startsWith(parentHref + '/') && page.href !== parentHref) {
        // If parentTitle starts with '/', it's a redirect to another parent
        const targetParent = parentTitleOrRedirect.startsWith('/')
          ? parentTitleOrRedirect
          : parentHref;
        if (!childMap.has(targetParent)) {
          childMap.set(targetParent, []);
        }
        childMap.get(targetParent).push(toLink(page));
        nested = true;
        break;
      }
    }

    if (!nested) {
      topLevel.push(toLink(page));
    }
  }

  // Attach children to their parent links
  for (const link of topLevel) {
    if (childMap.has(link.href)) {
      const children = childMap.get(link.href);
      children.sort((a, b) => a.order - b.order);
      link.children = children;
    }
  }

  // Also create parent links for nesting parents that exist as pages
  for (const [parentHref, parentTitle] of Object.entries(NESTING_PARENTS)) {
    if (childMap.has(parentHref) && !topLevel.find(l => l.href === parentHref)) {
      // Parent page exists as a child somewhere — promote it
      const children = childMap.get(parentHref);
      children.sort((a, b) => a.order - b.order);
      topLevel.push({
        title: parentTitle,
        href: parentHref,
        order: -1, // Put at top
        children,
      });
    }
  }

  topLevel.sort((a, b) => a.order - b.order);
  return topLevel;
}

// Main
const pages = scanDir(contentDir);
const sectionMap = new Map();

for (const page of pages) {
  if (!page.section) continue;
  if (!sectionMap.has(page.section)) {
    sectionMap.set(page.section, []);
  }
  sectionMap.get(page.section).push(page);
}

const sections = [];
for (const [title, sectionPages] of sectionMap) {
  // For sections with nesting (Rust, Python), build nested structure
  const hasNesting = sectionPages.some(p => {
    return Object.keys(NESTING_PARENTS).some(parent => p.href.startsWith(parent + '/'));
  });

  if (hasNesting) {
    sections.push({ title, links: buildNested(sectionPages, title) });
  } else {
    const { links, groups } = applyGroups(sectionPages.map(toLink));
    sections.push({ title, links, ...(groups && { groups }) });
  }
}

sections.sort((a, b) => {
  const orderA = SECTION_ORDER[a.title] ?? 999;
  const orderB = SECTION_ORDER[b.title] ?? 999;
  return orderA - orderB;
});

fs.writeFileSync(outputPath, JSON.stringify(sections, null, 2));

const totalPages = sections.reduce((n, s) => {
  let count = s.links.length;
  for (const link of s.links) {
    if (link.children) count += link.children.length;
  }
  for (const group of s.groups || []) {
    count += group.links.length;
  }
  return n + count;
}, 0);

console.log(`[sidebar] Generated ${sections.length} sections, ${totalPages} pages → lib/sidebar-data.json`);
