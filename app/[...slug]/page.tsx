import { getDoc } from '@/lib/mdx';
import { DocsLayout } from '@/components/DocsLayout';
import { LocaleSync } from '@/components/LocaleSync';
import { TableOfContents } from '@/components/TableOfContents';
import { PrevNextNav } from '@/components/PrevNextNav';
import { TranslationNotice } from '@/components/TranslationNotice';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  defaultLocale,
  isLocale,
  locales,
  localizedHref,
  openGraphLocales,
  type Locale,
} from '@/lib/i18n';
import { translatedLocales } from '@/lib/translations';

// Only serve pre-rendered pages - return 404 for unknown paths
// Unknown paths must 404 rather than render an empty shell.
export const dynamicParams = false;

/**
 * Every documentation route is served from this one catch-all, localized or not.
 *
 * It used to be four: `app/page.tsx`, `app/[...slug]`, `app/[locale]` and
 * `app/[locale]/[...slug]`. Next matches a named segment ahead of a catch-all,
 * so `/concepts/architecture` resolved as `locale="concepts"`,
 * `slug=["architecture"]` -- and with `dynamicParams = false` on both routes,
 * "concepts" is not a locale, so the request 404'd instead of falling through to
 * the English route that owns it. Production never showed it, because every page
 * is prerendered to static HTML at build time and served by path, but `next dev`
 * resolves the matcher per request: an English page answered once while it was
 * compiling and 404'd on every reload after that. Nobody could browse the site
 * they were writing, which is how 17 blank diagrams stayed unnoticed.
 *
 * With one route there is nothing to disambiguate. A leading segment that is a
 * real locale is the locale; anything else is the start of the document path.
 */
function splitRoute(slug: string[]): { locale: Locale; rest: string[] } {
  const head = slug[0];
  if (head && isLocale(head) && head !== defaultLocale) {
    return { locale: head, rest: slug.slice(1) };
  }
  return { locale: defaultLocale, rest: slug };
}

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// This function stamps a suffix onto the <title> of every page on the site, so
// whatever claim it carries is the site's loudest one.
//
// It carried "575x Faster Than ROS2" — a ratio that appears in no benchmark, no
// report and no source in the HORUS repository. The README was corrected and
// this was not, so the retracted claim went on being served on 152 pages, in
// the OG card, in the Twitter card and in the keywords array. The replacement
// is the figure /performance/benchmarks actually measures: a 151 ns
// cross-process one-way median, which is ~33x the ROS 2 REP 2014 reference —
// stated as a reference comparison, not as a ROS 2 measurement, because nothing
// here measures ROS 2 without `-F dds` and a DDS implementation installed.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { locale, rest } = splitRoute(slug);

  if (locale !== defaultLocale) {
    // `/{locale}` on its own redirects; it has no page of its own to describe.
    if (rest.length === 0) return {};
    return localizedMetadata(locale, rest);
  }

  const docPath = ['docs', ...rest];
  const doc = await getDoc(docPath);

  if (!doc) {
    return {
      title: 'Page Not Found | HORUS Robotics Documentation',
      description: 'The requested page could not be found. Browse the HORUS documentation for the Rust, Python and C++ guides, the CLI reference and the benchmarks.',
    };
  }

  const baseTitle = doc.frontmatter.title || 'HORUS Documentation';
  const title = `${baseTitle} | HORUS Robotics`;
  const description = doc.frontmatter.description || 'Build real-time robots with HORUS — zero-copy shared memory IPC for Rust, Python and C++, with a measured 151 ns cross-process median. FREE & open source.';
  const url = `https://docs.horusrobotics.dev/${rest.join('/')}`;
  const pathName = `/${rest.join('/')}`;

  return {
    title,
    description,
    keywords: [
      // Primary keywords
      'HORUS',
      'real-time robotics middleware',
      'sub-microsecond IPC',
      'zero-copy robotics framework',

      // Technical keywords
      'real-time robotics',
      'zero-copy IPC',
      'shared memory robotics',
      'Rust robotics framework',
      'Python robotics',
      'C++ robotics',

      // Use case keywords
      'autonomous robot',
      'humanoid robot',
      'drone control',
      'industrial automation',

      // Comparison keywords
      'ROS alternative',
      'ROS2 alternative',
      'DDS alternative',
      'modern robotics',

      // Intent keywords
      'learn robotics',
      'robot programming tutorial',
      'build robots fast',
    ],
    authors: [{ name: 'HORUS Robotics Team' }],
    creator: 'HORUS Robotics',
    publisher: 'HORUS Robotics',
    openGraph: {
      title: `${baseTitle} | HORUS Robotics Framework`,
      description: `${description} Build your first robot in 5 minutes.`,
      url,
      siteName: 'HORUS - Real-Time Robotics Framework',
      type: 'article',
      locale: 'en_US',
      images: [
        {
          url: 'https://docs.horusrobotics.dev/og-image.png',
          width: 1200,
          height: 630,
          alt: `${baseTitle} - HORUS Documentation`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseTitle} | HORUS Robotics`,
      description: `${description.substring(0, 200)}...`,
      images: ['https://docs.horusrobotics.dev/og-image.png'],
      creator: '@horus_robotics',
      site: '@horus_robotics',
    },
    alternates: {
      canonical: url,
      // Only the locales that actually hold this page; see lib/translations.ts.
      languages: Object.fromEntries(translatedLocales(pathName).map(locale => [locale, localizedHref(pathName, locale)])),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Metadata for a page under a locale prefix.
 *
 * `canonical` follows what was actually rendered, not what the URL asked for.
 * Six of the 960 localized routes have a translation; the other 954 fall back to
 * the English file and serve English prose at a Spanish, German or Japanese URL.
 * Pointing each of those at itself told search engines there were 955 distinct
 * pages carrying the same text -- the textbook duplicate-content shape, and one
 * the site was generating on purpose. A fallback now names the English page as
 * the canonical one, which is what it is a copy of. `languages` still lists
 * every locale, so a real translation is still discoverable from any of them.
 */
async function localizedMetadata(locale: Locale, rest: string[]): Promise<Metadata> {
  const doc = await getDoc(['docs', ...rest], locale);
  if (!doc) return {};
  const pathName = `/${rest.join('/')}`;
  const languages = Object.fromEntries(translatedLocales(pathName).map(value => [value, localizedHref(pathName, value)]));
  return {
    title: `${doc.frontmatter.title} | HORUS Documentation`,
    description: doc.frontmatter.description,
    alternates: {
      canonical: localizedHref(pathName, doc.isFallback ? defaultLocale : locale),
      languages,
    },
    openGraph: { locale: openGraphLocales[locale], type: 'article' },
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const { locale, rest } = splitRoute(slug);

  if (locale !== defaultLocale) {
    // `/{locale}` with nothing after it is the locale's front door.
    if (rest.length === 0) redirect(`/${locale}/concepts/what-is-horus`);
    const doc = await getDoc(['docs', ...rest], locale);
    if (!doc) notFound();
    return (
      <DocsLayout>
        <LocaleSync locale={locale} />
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {doc.isFallback && <TranslationNotice locale={locale} />}
          {!doc.isFallback && doc.frontmatter.translation_status === 'partial' && (
            <TranslationNotice locale={locale} variant="partial" href={`/${rest.join('/')}`} />
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

  // Always prepend 'docs' to the path
  const docPath = ['docs', ...rest];

  const doc = await getDoc(docPath);

  if (!doc) {
    notFound();
  }

  return (
    <DocsLayout>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <article className="prose max-w-none prose-headings:scroll-mt-20 prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-li:text-[var(--text-secondary)]">
          {doc.content}
        </article>
        <PrevNextNav />
      </main>
      <TableOfContents />
    </DocsLayout>
  );
}

export async function generateStaticParams() {
  const fs = require('fs');
  const path = require('path');

  const contentDir = path.join(process.cwd(), 'content/docs');
  const routes: { slug: string[] }[] = [];

  // Recursively find all .mdx files
  function findMdxFiles(dir: string, basePath: string[] = []): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Recurse into subdirectory
        findMdxFiles(filePath, [...basePath, file]);
      } else if (file.endsWith('.mdx')) {
        // Add route for this MDX file
        const fileName = file.replace(/\.mdx$/, '');

        // For index.mdx files, use the directory path without 'index'
        if (fileName === 'index') {
          // Only add if basePath is not empty (we don't want a route for root index.mdx)
          if (basePath.length > 0) {
            routes.push({ slug: basePath });
          }
        } else {
          routes.push({ slug: [...basePath, fileName] });
        }
      }
    }
  }

  findMdxFiles(contentDir);

  // Every English route, then the same set under each non-English locale, then
  // the bare `/{locale}` front doors. These used to live in `app/[locale]` and
  // `app/[locale]/[...slug]`; both are gone, so the params they produced have to
  // be produced here or those 966 routes stop being generated.
  const localized = locales
    .filter(locale => locale !== defaultLocale)
    .flatMap(locale => [
      { slug: [locale] },
      ...routes.map(route => ({ slug: [locale, ...route.slug] })),
    ]);

  return [...routes, ...localized];
}
