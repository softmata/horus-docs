"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { localeFromPathname, localizedHref, stripLocale } from "@/lib/i18n";

import { ordered, sections, type DocLink } from "./DocsSidebar";

// Derived from the sidebar rather than copied from it.
//
// This was a hand-maintained flat list carrying the comment "must match
// DocsSidebar.tsx". It did not match: identical page sets, positions differing
// by up to 61 places, so Prev/Next sent a reader in the Rust section past the
// Rust Guide into Examples and only reached the guide after all of Python.
// Flattening the sidebar makes the two agree by construction.
//
// Children are included in depth-first order, which is the order they are read
// in, and de-duplicated: a page reachable from two sections should appear once
// in a linear walk.
// `ordered` is the sidebar's own sort. Walking the raw array instead put the
// reader somewhere the sidebar never suggested: on /advanced/circuit-breaker,
// Previous pointed at "Recipe: ROS 2 Bridge" while the sidebar showed
// "Production Deployment" directly above it.
function flatten(links: DocLink[], out: DocLink[], seen: Set<string>) {
  for (const link of ordered(links)) {
    if (!seen.has(link.href)) {
      seen.add(link.href);
      out.push(link);
    }
    if (link.children) {
      flatten(link.children, out, seen);
    }
  }
}

const allPages: DocLink[] = (() => {
  const out: DocLink[] = [];
  const seen = new Set<string>();
  for (const section of sections) {
    flatten(section.links, out, seen);
  }
  return out;
})();

export function PrevNextNav() {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const unlocalizedPathname = stripLocale(pathname);

  const currentIndex = allPages.findIndex(page => page.href === unlocalizedPathname);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

  if (!prevPage && !nextPage) {
    return null;
  }

  return (
    <nav className="mt-12 pt-6 border-t border-[var(--border)] flex justify-between items-center gap-4">
      {prevPage ? (
        <Link
          href={localizedHref(prevPage.href, locale)}
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
          href={localizedHref(nextPage.href, locale)}
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
