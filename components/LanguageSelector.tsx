"use client";

import { usePathname, useRouter } from 'next/navigation';
import { localeFromPathname, localeNames, locales, localizedHref, stripLocale, type Locale } from '@/lib/i18n';

export function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPathname(pathname);

  return (
    <label className="hidden sm:flex items-center">
      <span className="sr-only">Documentation language</span>
      <select
        aria-label="Documentation language"
        value={locale}
        onChange={event => router.push(localizedHref(stripLocale(pathname), event.target.value as Locale))}
        className="h-8 max-w-40 border border-[var(--border)] bg-[var(--surface)] px-2 text-sm text-[var(--text-secondary)]"
      >
        {locales.map(value => <option key={value} value={value}>{localeNames[value]}</option>)}
      </select>
    </label>
  );
}
