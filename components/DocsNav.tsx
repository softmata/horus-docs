"use client";

import Link from "next/link";
import { FiMenu, FiSearch, FiStar } from "react-icons/fi";
import { ThemeToggle } from "./ThemeToggle";
import { SearchModal } from "./SearchModal";
import LanguageSelector from "./LanguageSelector";
import { useState, useEffect } from "react";

interface DocsNavProps {
  onMenuClick?: () => void;
}

export function DocsNav({ onMenuClick }: DocsNavProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between">
            {/* Left: Logo */}
            <div className="flex items-center gap-3">
              {/* Hamburger menu for mobile */}
              {onMenuClick && (
                <button
                  onClick={onMenuClick}
                  className="lg:hidden p-2 -ml-2 hover:bg-[var(--surface)] transition-colors"
                  aria-label="Open sidebar"
                >
                  <FiMenu className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              )}

              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-lg text-[var(--text)] transition-colors"
              >
                <span className="text-[var(--text)]">HORUS</span>
                <span className="text-[var(--text-tertiary)] font-normal text-sm">Docs</span>
              </Link>
            </div>

            {/* Right: Search + Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors"
                aria-label="Search documentation"
              >
                <FiSearch className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-tertiary)]">
                  <span>⌘</span>K
                </kbd>
              </button>

              {/* Star-on-GitHub call to action */}
              <a
                href="https://github.com/softmata/horus"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
                title="Enjoying HORUS? Star it on GitHub"
                aria-label="Star HORUS on GitHub"
              >
                <FiStar className="w-4 h-4 group-hover:fill-[var(--accent)] transition-colors" />
                <span className="hidden sm:inline">Star on GitHub</span>
                <span className="sm:hidden">Star</span>
              </a>

              {/* Registry */}
              <a
                href="https://registry.horusrobotics.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center px-3 py-1.5 text-sm font-medium text-[var(--text)] border border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface)] transition-colors"
              >
                Registry
              </a>

              <div className="flex items-center gap-1 ml-1">
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

      </nav>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
