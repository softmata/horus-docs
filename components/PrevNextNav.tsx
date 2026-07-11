"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { useEffect, useState } from "react";
import { pageLanguage, type Language } from "@/lib/language-pairs";

const LANG_STORAGE_KEY = 'horus-docs-language';
const LANG_SYNC_EVENT = 'horus-language-change';

import sidebarData from "@/lib/sidebar-data.json";

interface DocLink {
  title: string;
  href: string;
  language?: Language;
}

// Prev/next order is DERIVED from the generated sidebar data (single source of
// truth) so it can never drift from the sidebar. Mirrors DocsSidebar's render
// order: for each section, ungrouped links (sorted by order) with their nested
// children inline, then each sub-group's links.
interface RawLink { title: string; href: string; order?: number; language?: Language; children?: RawLink[]; }
interface RawSection { title: string; links: RawLink[]; groups?: { label: string; links: RawLink[] }[]; }

const byOrder = (a: RawLink, b: RawLink) => (a.order ?? 999) - (b.order ?? 999);

function flattenLink(link: RawLink, out: DocLink[]) {
  if (link.href) out.push({ title: link.title, href: link.href, language: link.language });
  if (link.children) [...link.children].sort(byOrder).forEach((c) => flattenLink(c, out));
}

const allPages: DocLink[] = (() => {
  const out: DocLink[] = [];
  for (const section of sidebarData as RawSection[]) {
    [...section.links].sort(byOrder).forEach((l) => flattenLink(l, out));
    for (const group of section.groups ?? []) {
      [...group.links].sort(byOrder).forEach((l) => flattenLink(l, out));
    }
  }
  return out;
})();

export function PrevNextNav() {
  const pathname = usePathname();

  // Track the selected language so prev/next skips pages in the other languages.
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

  // Keep only pages that match the selected language, plus language-agnostic
  // pages. This ensures "Next" from a Rust page goes to the next Rust page
  // (or a shared concept page) and skips /python/* and /cpp/* entries.
  const visiblePages = allPages.filter((p) => {
    const pLang = p.language ?? pageLanguage(p.href);
    return !pLang || !language || pLang === language;
  });

  const currentIndex = visiblePages.findIndex((page) => page.href === pathname);
  const prevPage = currentIndex > 0 ? visiblePages[currentIndex - 1] : null;
  const nextPage = currentIndex !== -1 && currentIndex < visiblePages.length - 1
    ? visiblePages[currentIndex + 1]
    : null;

  if (!prevPage && !nextPage) {
    return null;
  }

  return (
    <nav className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center gap-4">
      {prevPage ? (
        <Link
          href={prevPage.href}
          className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors group"
        >
          <FiArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-xs text-[var(--text-muted)]">Previous</div>
            <div className="font-medium">{prevPage.title}</div>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {nextPage ? (
        <Link
          href={nextPage.href}
          className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors group"
        >
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Next</div>
            <div className="font-medium">{nextPage.title}</div>
          </div>
          <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
