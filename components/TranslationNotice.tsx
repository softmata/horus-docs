import { localeNames, type Locale } from '@/lib/i18n';

/**
 * Shown above a page the reader asked for in their own language and did not get
 * in full.
 *
 * Two cases, because they fail differently. `missing` is the page with no
 * translation file at all: `getDoc` falls back to English and the reader gets
 * every word, just not in their language. `partial` is the page whose
 * translation exists but only covers part of the English source — a summary and
 * a few links. That one is the dangerous case: nothing about a short page tells
 * the reader it is short, so without this notice they read a twelve-line stub
 * and reasonably conclude that is all HORUS documents on the subject.
 */
export function TranslationNotice({
  locale,
  variant = 'missing',
  href,
}: {
  locale: Locale;
  variant?: 'missing' | 'partial';
  href?: string;
}) {
  const message =
    variant === 'partial' ? (
      <>
        This page is only partly translated into {localeNames[locale]}. The full
        version is{' '}
        <a href={href ?? '#'} className="underline">
          in English
        </a>
        .
      </>
    ) : (
      <>
        This page has not been translated into {localeNames[locale]} yet. The
        current English version is shown.
      </>
    );

  return (
    <aside
      className="mb-6 border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-secondary)]"
      role="status"
    >
      {message}
    </aside>
  );
}
