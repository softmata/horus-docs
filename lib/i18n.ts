export const locales = ['en', 'zh-CN', 'ja', 'pt-BR', 'de', 'fr', 'es'] as const;

export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  ja: '日本語',
  'pt-BR': 'Português (Brasil)',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

export const openGraphLocales: Record<Locale, string> = {
  en: 'en_US',
  'zh-CN': 'zh_CN',
  ja: 'ja_JP',
  'pt-BR': 'pt_BR',
  de: 'de_DE',
  fr: 'fr_FR',
  es: 'es_ES',
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale {
  const candidate = pathname.split('/').filter(Boolean)[0];
  return candidate && isLocale(candidate) ? candidate : defaultLocale;
}

export function stripLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] && isLocale(segments[0])) segments.shift();
  return `/${segments.join('/')}`;
}

export function localizedHref(href: string, locale: Locale): string {
  const normalized = href.startsWith('/') ? href : `/${href}`;
  return locale === defaultLocale ? normalized : `/${locale}${normalized === '/' ? '' : normalized}`;
}

export function alternateUrls(pathname: string): Record<string, string> {
  const path = stripLocale(pathname);
  return Object.fromEntries(locales.map(locale => [locale, localizedHref(path, locale)]));
}
