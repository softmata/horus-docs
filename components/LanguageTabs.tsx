'use client';

import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'horus-docs-language';
const SYNC_EVENT = 'horus-language-change';
const LANGUAGES = ['Rust', 'Python', 'C++'] as const;

type Language = typeof LANGUAGES[number];

interface LanguageTabsProps {
  children: React.ReactNode;
}

interface LangTabProps {
  language: string;
  children?: React.ReactNode;
}

/**
 * Individual language tab content wrapper.
 * If no children are provided, renders a "Coming soon" placeholder.
 */
export function LangTab({ children }: LangTabProps) {
  return <div>{children}</div>;
}

/**
 * Language-switching tabs that sync across all instances on the page.
 *
 * Usage in MDX:
 * ```mdx
 * <LanguageTabs>
 *   <LangTab language="Rust">
 *     ```rust
 *     let x = 1;
 *     ```
 *   </LangTab>
 *   <LangTab language="Python">
 *     ```python
 *     x = 1
 *     ```
 *   </LangTab>
 * </LanguageTabs>
 * ```
 *
 * All LanguageTabs on the same page share the same selection.
 * Changing one changes all of them. Selection persists across pages via localStorage.
 */
export default function LanguageTabs({ children }: LanguageTabsProps) {
  const [active, setActive] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    }
    return 'Rust';
  });

  // Extract available languages from children
  const childArray = React.Children.toArray(children);
  const availableLanguages: string[] = [];
  const tabMap = new Map<string, React.ReactElement<LangTabProps>>();

  childArray.forEach((child) => {
    if (React.isValidElement(child) && (child as any).props.language) {
      const lang = (child as any).props.language as string;
      availableLanguages.push(lang);
      tabMap.set(lang, child as React.ReactElement<LangTabProps>);
    }
  });

  // If active language isn't available in this instance, fall back to first available
  const displayLanguage = availableLanguages.includes(active)
    ? active
    : availableLanguages[0] || 'Rust';

  // Sync with other LanguageTabs instances on the same page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setActive(detail);
      }
    };
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  // Also sync across browser tabs via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setActive(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleSelect = useCallback((lang: string) => {
    setActive(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    // Notify all other LanguageTabs instances on this page
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: lang }));
  }, []);

  const activeTab = tabMap.get(displayLanguage);
  const hasContent = activeTab && (activeTab as any).props.children;

  return (
    <div className="my-6 rounded-lg border border-[var(--border)] overflow-hidden">
      <div className="flex border-b border-[var(--border)] bg-[var(--surface)]">
        {availableLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleSelect(lang)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              displayLanguage === lang
                ? 'text-[var(--text)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
      <div className="p-4">
        {hasContent ? (
          activeTab
        ) : (
          <div className="py-8 text-center text-[var(--text-secondary)]">
            <p className="text-sm font-medium">{displayLanguage} support is coming soon.</p>
            <p className="text-xs mt-1 opacity-70">
              Check the{' '}
              <a href="/learn/coming-from-ros2" className="underline hover:text-[var(--text)]">
                roadmap
              </a>{' '}
              for updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
