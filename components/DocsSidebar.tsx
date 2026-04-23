"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiChevronRight, FiX } from "react-icons/fi";
import { useState, useEffect } from "react";
import { pageLanguage, type Language } from "@/lib/language-pairs";

const LANG_STORAGE_KEY = 'horus-docs-language';
const LANG_SYNC_EVENT = 'horus-language-change';

/**
 * Auto-generated sidebar navigation.
 *
 * This data is built from MDX frontmatter by `scripts/build-sidebar.js`.
 * To add a new page to the sidebar, just create a .mdx file with frontmatter:
 *
 *   ---
 *   title: "My New Page"
 *   order: 5
 *   ---
 *
 * Then run: node scripts/build-sidebar.js
 * (This runs automatically during `npm run build`)
 *
 * The page appears in the sidebar section matching its directory
 * (e.g., tutorials/ → Tutorials, rust/api/ → Rust > API Reference).
 *
 * To override the section, add `sidebar_section: "Section Name"` to frontmatter.
 * To hide a page from the sidebar, add `sidebar_hidden: true`.
 */
import sidebarData from "@/lib/sidebar-data.json";

interface DocLink {
  title: string;
  href: string;
  order?: number;
  children?: DocLink[];
}

interface SidebarSection {
  title: string;
  links: DocLink[];
}

const sections: SidebarSection[] = sidebarData as SidebarSection[];

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function DocsSidebar({ isOpen = true, onClose }: DocsSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of sections) {
      initial[section.title] = true;
    }
    return initial;
  });

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Selected language — used to filter per-language sidebar entries.
  // SSR: start as null so first render shows all entries; hydration populates
  // from localStorage and subsequent renders filter.
  const [language, setLanguage] = useState<Language | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined'
      ? (localStorage.getItem(LANG_STORAGE_KEY) as Language | null)
      : null;
    if (stored === 'Rust' || stored === 'Python' || stored === 'C++') {
      setLanguage(stored);
    } else {
      setLanguage('Rust');
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === 'Rust' || detail === 'Python' || detail === 'C++') {
        setLanguage(detail);
      }
    };
    window.addEventListener(LANG_SYNC_EVENT, handler);
    return () => window.removeEventListener(LANG_SYNC_EVENT, handler);
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LANG_STORAGE_KEY && (e.newValue === 'Rust' || e.newValue === 'Python' || e.newValue === 'C++')) {
        setLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Recursively filter a link's children, dropping any that belong to a
  // different language than the one currently selected.
  const filterLink = (link: DocLink): DocLink | null => {
    const linkLang = pageLanguage(link.href);
    if (linkLang && language && linkLang !== language) return null;
    const filteredChildren = link.children
      ? (link.children.map(filterLink).filter(Boolean) as DocLink[])
      : undefined;
    return { ...link, children: filteredChildren };
  };

  const visibleSections: SidebarSection[] = sections
    .map((section) => ({
      ...section,
      links: section.links.map(filterLink).filter(Boolean) as DocLink[],
    }))
    .filter((section) => section.links.length > 0);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleItem = (href: string) => {
    setExpandedItems((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen && onClose) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const renderLink = (link: DocLink, depth: number = 0) => {
    const isActive = pathname === link.href;
    const hasChildren = link.children && link.children.length > 0;
    const isExpanded = expandedItems[link.href];

    return (
      <li key={link.href}>
        <div className="flex items-center">
          {hasChildren && (
            <button
              onClick={() => toggleItem(link.href)}
              className="p-1 hover:bg-[var(--surface)] rounded transition-colors touch-manipulation"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <FiChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
              ) : (
                <FiChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
              )}
            </button>
          )}
          <Link
            href={link.href}
            onClick={handleLinkClick}
            className={`flex-1 block px-3 py-2 rounded text-sm transition-colors touch-manipulation ${
              hasChildren ? "" : depth > 0 ? "ml-4" : ""
            } ${
              isActive
                ? "bg-[var(--surface)] text-[var(--text)] font-medium border-l-2 border-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
            }`}
          >
            {link.title}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <ul className="space-y-1 ml-6 mt-1">
            {link.children!
              .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
              .map((child) => renderLink(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const sidebarContent = (
    <div className="p-6 space-y-6 pb-12">
      {visibleSections.map((section) => {
        const isExpanded = expandedSections[section.title];

        return (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="flex items-center gap-2 w-full text-left font-semibold text-[var(--text)] hover:text-[var(--text-muted)] transition-colors mb-2 touch-manipulation"
            >
              {isExpanded ? (
                <FiChevronDown className="w-4 h-4" />
              ) : (
                <FiChevronRight className="w-4 h-4" />
              )}
              {section.title}
            </button>

            {isExpanded && (
              <ul className="space-y-1 ml-6">
                {section.links
                  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
                  .map((link) => renderLink(link, 0))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!onClose) {
    return (
      <aside className="hidden lg:block w-64 border-r border-[var(--border)] bg-[var(--surface)] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {sidebarContent}
      </aside>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[var(--bg)] border-r border-[var(--border)] z-50 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] p-4 flex items-center justify-between">
          <span className="font-semibold text-[var(--text)]">Documentation</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--surface)] transition-colors touch-manipulation"
            aria-label="Close menu"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
