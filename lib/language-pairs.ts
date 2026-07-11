/**
 * Compute the paired page URL for a given target language.
 *
 * When a user picks a different language in the header selector, we try to
 * navigate to the matching page in that language. This handles two patterns:
 *
 * 1. Per-language subtree: /rust/api/X ↔ /python/api/X ↔ /cpp/api/X
 * 2. Split filenames in getting-started:
 *    - Rust default:  /getting-started/quick-start
 *    - Python:        /getting-started/quick-start-python
 *    - C++:           /getting-started/quick-start-cpp
 *    - Language intro pages: /getting-started/{rust,python,cpp}
 *
 * If no counterpart exists, returns null — caller should update the language
 * preference without navigating.
 */

import sidebarData from './sidebar-data.json';

export type Language = 'Rust' | 'Python' | 'C++';

const LANG_DIR: Record<Language, string> = {
  'Rust': 'rust',
  'Python': 'python',
  'C++': 'cpp',
};

// Suffix applied to a filename for its per-language split variant, in ANY
// section (getting-started, tutorials, recipes, ...). Rust is the default
// (no suffix); e.g. `01-sensor-node` / `01-sensor-node-python` / `-cpp`.
const LANG_SUFFIX: Record<Language, string> = {
  'Rust': '',
  'Python': '-python',
  'C++': '-cpp',
};

// Build a set of all known doc paths from generated sidebar data.
const PATH_SET: Set<string> = (() => {
  const set = new Set<string>();
  const walk = (links: Array<{ href: string; children?: unknown[] }>) => {
    for (const link of links) {
      if (link.href) set.add(link.href);
      if (link.children) walk(link.children as Array<{ href: string; children?: unknown[] }>);
    }
  };
  for (const section of sidebarData as Array<{ links: Array<{ href: string; children?: unknown[] }> }>) {
    walk(section.links);
  }
  return set;
})();

export function docPathExists(path: string): boolean {
  return PATH_SET.has(path);
}

/**
 * Classify a page path by its language.
 *
 * Returns:
 *   - 'Rust' | 'Python' | 'C++' for language-specific pages (per-language
 *     subtrees and getting-started split variants)
 *   - null for language-agnostic pages (concepts, tutorials, stdlib, ...)
 *
 * A base page (no language suffix) is treated as the Rust default only if a
 * matching `-python` or `-cpp` sibling exists — otherwise it's language-agnostic
 * (e.g., installation.mdx, simulation.mdx, cross-language-interop.mdx).
 */
export function pageLanguage(href: string): Language | null {
  // 1. Per-language subtrees: /rust/..., /python/..., /cpp/...
  if (href === '/rust' || href.startsWith('/rust/')) return 'Rust';
  if (href === '/python' || href.startsWith('/python/')) return 'Python';
  if (href === '/cpp' || href.startsWith('/cpp/')) return 'C++';

  // 2. getting-started language intro pages: /getting-started/{rust,python,cpp}
  if (href === '/getting-started/rust') return 'Rust';
  if (href === '/getting-started/python') return 'Python';
  if (href === '/getting-started/cpp') return 'C++';

  // 3. Split-filename variants in ANY section (tutorials, recipes,
  //    getting-started, reference, ...). Classify on the last path segment.
  const seg = href.split('/').filter(Boolean).pop() ?? '';
  // 3a. `-python` / `-cpp` suffix — the canonical language-variant marker.
  if (seg.endsWith('-python')) return 'Python';
  if (seg.endsWith('-cpp')) return 'C++';
  // 3b. `python-` / `cpp-` / `rust-` slug prefix — standalone language-specific
  //     pages (e.g. reference/cpp-api, recipes/python-cv-node).
  if (seg.startsWith('python-')) return 'Python';
  if (seg.startsWith('cpp-')) return 'C++';
  if (seg.startsWith('rust-')) return 'Rust';
  // 3c. A base page is the Rust default only when a -python or -cpp sibling exists.
  if (docPathExists(`${href}-python`) || docPathExists(`${href}-cpp`)) {
    return 'Rust';
  }

  // 4. Language-agnostic (concepts, stdlib, most of development, ...).
  return null;
}

/**
 * Given the current page path and a target language, return the URL of the
 * paired page in that language, or null if none exists.
 */
export function getLanguagePair(currentPath: string, targetLang: Language): string | null {
  // Strip trailing slash and split.
  const stripped = currentPath.replace(/\/$/, '');
  const parts = stripped.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  // Case 1: per-language subtree — /rust/..., /python/..., /cpp/...
  if (parts.length >= 1 && (parts[0] === 'rust' || parts[0] === 'python' || parts[0] === 'cpp')) {
    const candidates = [
      '/' + [LANG_DIR[targetLang], ...parts.slice(1)].join('/'),
      // Fallback: language index
      `/${LANG_DIR[targetLang]}`,
    ];
    for (const c of candidates) {
      if (docPathExists(c)) return c;
    }
    return null;
  }

  // Case 2: getting-started language intro — /getting-started/{rust,python,cpp}
  if (
    parts[0] === 'getting-started' &&
    parts.length === 2 &&
    (parts[1] === 'rust' || parts[1] === 'python' || parts[1] === 'cpp')
  ) {
    const target = `/getting-started/${LANG_DIR[targetLang]}`;
    return docPathExists(target) ? target : null;
  }

  // Case 3: split filenames in any single-level section (getting-started,
  // tutorials, recipes, ...) — X / X-python / X-cpp.
  if (parts.length === 2) {
    const base = parts[1].replace(/-python$/, '').replace(/-cpp$/, '');
    const target = `/${parts[0]}/${base}${LANG_SUFFIX[targetLang]}`;
    if (docPathExists(target)) return target;
  }

  // Language-agnostic page (or no counterpart in the target language) — no
  // navigation; caller still updates the language preference.
  return null;
}
