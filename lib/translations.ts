import fs from 'fs';
import path from 'path';
import { defaultLocale, locales, type Locale } from './i18n';

const contentRoot = path.join(process.cwd(), 'content');

/**
 * The locales that actually hold this page.
 *
 * Six of the 960 localized routes have a translation. The other 954 fall back to
 * the English file and serve English prose under a localized URL, and the page
 * they serve now names the English one as canonical. Two places were still
 * treating all 960 as real pages in their own right: `app/sitemap.ts` submitted
 * every one of them, and every page advertised all seven locales in `hreflang`.
 * Both are claims about pages that exist -- a sitemap should not list a URL that
 * declares a different one canonical, and an hreflang should not point at a
 * translation that was never written.
 *
 * Lives outside `lib/i18n.ts` because that module is imported by client
 * components and this one reads the filesystem.
 */
export function translatedLocales(slug: string): Locale[] {
  const parts = slug.split('/').filter(Boolean);
  return locales.filter(locale => {
    if (locale === defaultLocale) return true;
    const base = path.join(contentRoot, 'locales', locale, 'docs', ...parts);
    return fs.existsSync(`${base}.mdx`) || fs.existsSync(path.join(base, 'index.mdx'));
  });
}
