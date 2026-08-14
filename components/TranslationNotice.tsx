import { localeNames, type Locale } from '@/lib/i18n';

export function TranslationNotice({ locale }: { locale: Locale }) {
  return (
    <aside className="mb-6 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-secondary)]" role="status">
      This page has not been translated into {localeNames[locale]} yet. The current English version is shown.
    </aside>
  );
}
