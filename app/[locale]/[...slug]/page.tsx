import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsLayout } from '@/components/DocsLayout';
import { LocaleSync } from '@/components/LocaleSync';
import { PrevNextNav } from '@/components/PrevNextNav';
import { TableOfContents } from '@/components/TableOfContents';
import { TranslationNotice } from '@/components/TranslationNotice';
import { getDoc } from '@/lib/mdx';
import { isLocale, locales, localizedHref, openGraphLocales, type Locale } from '@/lib/i18n';

export const dynamicParams = false;

interface PageProps {
  params: Promise<{ locale: string; slug: string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale) || rawLocale === 'en') return {};
  const locale = rawLocale as Locale;
  const doc = await getDoc(['docs', ...slug], locale);
  if (!doc) return {};
  const pathName = `/${slug.join('/')}`;
  const languages = Object.fromEntries(locales.map(value => [value, localizedHref(pathName, value)]));
  return {
    title: `${doc.frontmatter.title} | HORUS Documentation`,
    description: doc.frontmatter.description,
    alternates: { canonical: localizedHref(pathName, locale), languages },
    openGraph: { locale: openGraphLocales[locale], type: 'article' },
  };
}

export default async function LocalizedDocPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  if (!isLocale(rawLocale) || rawLocale === 'en') notFound();
  const locale = rawLocale as Locale;
  const doc = await getDoc(['docs', ...slug], locale);
  if (!doc) notFound();
  const pathName = `/${slug.join('/')}`;

  return (
    <DocsLayout>
      <LocaleSync locale={locale} />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {doc.isFallback && <TranslationNotice locale={locale} />}
        {!doc.isFallback && doc.frontmatter.translation_status === 'partial' && (
          <TranslationNotice locale={locale} variant="partial" href={pathName} />
        )}
        <article className="prose max-w-none prose-headings:scroll-mt-20 prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-li:text-[var(--text-secondary)]">
          {doc.content}
        </article>
        <PrevNextNav />
      </main>
      <TableOfContents />
    </DocsLayout>
  );
}

export function generateStaticParams() {
  const contentDir = path.join(process.cwd(), 'content/docs');
  const slugs: string[][] = [];
  function visit(dir: string, base: string[] = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) visit(path.join(dir, entry.name), [...base, entry.name]);
      else if (entry.name.endsWith('.mdx')) {
        const name = entry.name.replace(/\.mdx$/, '');
        const slug = name === 'index' ? base : [...base, name];
        if (slug.length) slugs.push(slug);
      }
    }
  }
  visit(contentDir);
  return locales.filter(locale => locale !== 'en').flatMap(locale => slugs.map(slug => ({ locale, slug })));
}
