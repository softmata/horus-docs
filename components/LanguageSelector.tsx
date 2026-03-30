'use client';

import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'horus-docs-language';
const SYNC_EVENT = 'horus-language-change';
const LANGUAGES = ['Rust', 'Python', 'C++'] as const;

/**
 * Global language selector for the site header.
 * Syncs with all LanguageTabs instances on the page via shared
 * localStorage key and CustomEvent.
 */
export default function LanguageSelector() {
  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || 'Rust';
    }
    return 'Rust';
  });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync from other LanguageTabs or LanguageSelector instances
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setLanguage(detail);
      }
    };
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);

  // Sync across browser tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (lang: string) => {
    setLanguage(lang);
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: lang }));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[var(--border)] rounded-md bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] transition-colors"
        aria-label={`Language: ${language}. Click to change.`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="opacity-60 text-xs">Lang:</span>
        <span>{language}</span>
        <svg
          className={`w-3 h-3 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-32 rounded-md border border-[var(--border)] bg-[var(--bg)] shadow-lg z-50"
          role="listbox"
          aria-label="Select language"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              role="option"
              aria-selected={language === lang}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                language === lang
                  ? 'text-[var(--text)] bg-[var(--surface)] font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]'
              }`}
            >
              {lang}
              {lang === 'C++' && (
                <span className="ml-1.5 text-[10px] opacity-50">(soon)</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
