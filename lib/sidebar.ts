/**
 * Auto-generate sidebar navigation from MDX frontmatter.
 *
 * Contributors only need to set frontmatter in their .mdx file:
 *
 *   ---
 *   title: "My New Page"
 *   description: "What this page covers"
 *   sidebar_section: "Getting Started"    # which sidebar section
 *   sidebar_order: 5                      # position within section
 *   sidebar_parent: "/concepts/deep-dive" # optional: nest under a parent
 *   ---
 *
 * The sidebar is built at build time by scanning all MDX files.
 * No need to edit DocsSidebar.tsx when adding/removing pages.
 *
 * MIGRATION: Until all pages have sidebar_section frontmatter,
 * this falls back to the hardcoded sections in DocsSidebar.tsx.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface SidebarLink {
  title: string;
  href: string;
  order: number;
  children?: SidebarLink[];
}

export interface SidebarSection {
  title: string;
  links: SidebarLink[];
}

/**
 * Directory-to-section mapping for pages without sidebar_section frontmatter.
 * This provides the default mapping when migrating from hardcoded sidebar.
 */
const DIRECTORY_SECTION_MAP: Record<string, string> = {
  'getting-started': 'Getting Started',
  'tutorials': 'Tutorials',
  'recipes': 'Recipes',
  'concepts': 'Core Concepts',
  'rust': 'Rust',
  'python': 'Python',
  'development': 'Development',
  'advanced': 'Advanced Topics',
  'operations': 'Operations',
  'plugins': 'Plugins',
  'package-management': 'Package Management',
  'stdlib': 'Standard Library',
  'performance': 'Performance',
  'reference': 'Reference',
  'learn': 'Getting Started', // learn pages appear in Getting Started
};

/**
 * Section ordering (lower = earlier in sidebar).
 */
const SECTION_ORDER: Record<string, number> = {
  'Getting Started': 0,
  'Core Concepts': 1,
  'Tutorials': 2,
  'Recipes': 3,
  'Rust': 4,
  'Python': 5,
  'Standard Library': 6,
  'Development': 7,
  'Advanced Topics': 8,
  'Performance': 9,
  'Package Management': 10,
  'Plugins': 11,
  'Operations': 12,
  'Reference': 13,
};

interface MdxFrontmatter {
  title: string;
  description?: string;
  order?: number;
  weight?: number;
  sidebar_section?: string;
  sidebar_order?: number;
  sidebar_parent?: string;
  sidebar_hidden?: boolean;
}

/**
 * Scan all MDX files and build sidebar sections from frontmatter.
 *
 * Call this at build time (in generateStaticParams or a build script).
 * The result can be cached and imported by DocsSidebar.
 */
export function buildSidebarFromFilesystem(): SidebarSection[] {
  const contentDir = path.join(process.cwd(), 'content/docs');
  const pages: Array<{
    href: string;
    frontmatter: MdxFrontmatter;
    directory: string;
  }> = [];

  // Recursively scan all MDX files
  function scanDir(dir: string, basePath: string[] = []): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath, [...basePath, entry]);
      } else if (entry.endsWith('.mdx')) {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const { data } = matter(raw);
        const frontmatter = data as MdxFrontmatter;

        // Skip hidden pages
        if (frontmatter.sidebar_hidden) continue;

        const fileName = entry.replace(/\.mdx$/, '');
        const href = fileName === 'index'
          ? '/' + basePath.join('/')
          : '/' + [...basePath, fileName].join('/');

        pages.push({
          href,
          frontmatter,
          directory: basePath[0] || '',
        });
      }
    }
  }

  scanDir(contentDir);

  // Group pages into sections
  const sectionMap = new Map<string, SidebarLink[]>();

  for (const page of pages) {
    const section = page.frontmatter.sidebar_section
      || DIRECTORY_SECTION_MAP[page.directory]
      || page.directory;

    if (!section) continue;

    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }

    const order = page.frontmatter.sidebar_order
      ?? page.frontmatter.order
      ?? page.frontmatter.weight
      ?? 999;

    sectionMap.get(section)!.push({
      title: page.frontmatter.title,
      href: page.href,
      order,
    });
  }

  // Sort links within each section
  for (const links of sectionMap.values()) {
    links.sort((a, b) => a.order - b.order);
  }

  // Build ordered section array
  const sections: SidebarSection[] = [];
  for (const [title, links] of sectionMap) {
    sections.push({ title, links });
  }

  sections.sort((a, b) => {
    const orderA = SECTION_ORDER[a.title] ?? 999;
    const orderB = SECTION_ORDER[b.title] ?? 999;
    return orderA - orderB;
  });

  return sections;
}

/**
 * Write sidebar data to a JSON file for client-side import.
 *
 * Call from a build script or next.config.js:
 *   import { generateSidebarJson } from '@/lib/sidebar';
 *   generateSidebarJson();
 */
export function generateSidebarJson(): void {
  const sections = buildSidebarFromFilesystem();
  const outPath = path.join(process.cwd(), 'lib/sidebar-data.json');
  fs.writeFileSync(outPath, JSON.stringify(sections, null, 2));
  console.log(`Generated sidebar with ${sections.length} sections, ${sections.reduce((n, s) => n + s.links.length, 0)} pages`);
}
