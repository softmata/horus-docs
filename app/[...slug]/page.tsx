import { getDoc } from '@/lib/mdx';
import { DocsLayout } from '@/components/DocsLayout';
import { TableOfContents } from '@/components/TableOfContents';
import { PrevNextNav } from '@/components/PrevNextNav';
import { ReportIssue } from '@/components/ReportIssue';
import { jsonLdScript } from '@/lib/json-ld';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Only serve pre-rendered pages - return 404 for unknown paths
// This ensures Vercel properly serves all static pages
export const dynamicParams = false;

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// i18n: English is served at the root (unchanged); zh/ja/de translations live under a locale prefix and
// read from content/i18n/{locale}/, falling back to English content when a page isn't translated yet.
const I18N_LOCALES = ['zh', 'ja', 'de'] as const;
const HREFLANG: Record<string, string> = { en: 'en', zh: 'zh-Hans', ja: 'ja', de: 'de' };
const SITE_URL = 'https://docs.horusrobotics.dev';
function isI18nLocale(s?: string): boolean { return !!s && (I18N_LOCALES as readonly string[]).includes(s); }

async function loadLocalized(slug: string[]) {
  const locale = isI18nLocale(slug[0]) ? slug[0] : null;
  const enSlug = locale ? slug.slice(1) : slug; // path relative to the English tree
  if (locale) {
    const t = await getDoc(['i18n', locale, ...enSlug]);
    return { doc: t ?? (await getDoc(['docs', ...enSlug])), locale, enSlug };
  }
  return { doc: await getDoc(['docs', ...enSlug]), locale: null as string | null, enSlug };
}

function hreflangAlternates(enSlug: string[]): Record<string, string> {
  const fs = require('fs');
  const path = require('path');
  const out: Record<string, string> = { [HREFLANG.en]: `${SITE_URL}/${enSlug.join('/')}` };
  for (const l of I18N_LOCALES) {
    const base = path.join(process.cwd(), 'content/i18n', l, ...enSlug);
    if (fs.existsSync(base + '.mdx') || fs.existsSync(path.join(base, 'index.mdx'))) {
      out[HREFLANG[l]] = `${SITE_URL}/${l}/${enSlug.join('/')}`;
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { doc, locale, enSlug } = await loadLocalized(slug);

  if (!doc) {
    return {
      title: 'Page Not Found | HORUS - World\'s Fastest Robotics Framework',
      description: 'The requested page could not be found. Explore HORUS documentation to build revolutionary robots 575x faster than ROS2.',
    };
  }

  const baseTitle = doc.frontmatter.title || 'HORUS Documentation';
  const title = `${baseTitle} | HORUS - 575x Faster Than ROS2`;
  const description = doc.frontmatter.description || 'Learn to build production robots with HORUS - the world\'s fastest robotics framework. 87ns latency, 575x faster than ROS2. Rust & Python. FREE & open source.';
  const url = `https://docs.horusrobotics.dev/${slug.join('/')}`;

  return {
    title,
    description,
    keywords: [
      // Primary keywords
      'HORUS',
      'fastest robotics framework',
      '575x faster than ROS2',
      '87ns latency',
      'revolutionary robotics',

      // Technical keywords
      'real-time robotics',
      'zero-copy IPC',
      'shared memory robotics',
      'Rust robotics framework',
      'Python robotics',

      // Use case keywords
      'autonomous robot',
      'humanoid robot',
      'drone control',
      'industrial automation',

      // Comparison keywords
      'ROS alternative',
      'ROS2 alternative',
      'best robotics framework',
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
      title: `${baseTitle} | HORUS - Revolutionary Robotics Framework`,
      description: `${description} Build your first robot in 5 minutes.`,
      url,
      siteName: 'HORUS - World\'s Fastest Robotics Framework',
      type: 'article',
      locale: locale ? HREFLANG[locale] : 'en_US',
      images: [
        {
          url: 'https://docs.horusrobotics.dev/og-image.png',
          width: 1200,
          height: 630,
          alt: `${baseTitle} - HORUS Documentation | 575x Faster Than ROS2`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${baseTitle} | HORUS - 575x Faster`,
      description: `${description.substring(0, 200)}...`,
      images: ['https://docs.horusrobotics.dev/og-image.png'],
      creator: '@horus_robotics',
      site: '@horus_robotics',
    },
    alternates: {
      canonical: url,
      languages: hreflangAlternates(enSlug),
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

/** Map a slug segment to a human-readable breadcrumb label. */
function segmentLabel(segment: string): string {
  const labels: Record<string, string> = {
    'getting-started': 'Getting Started',
    'concepts': 'Core Concepts',
    'rust': 'Rust',
    'python': 'Python',
    'tutorials': 'Tutorials',
    'advanced': 'Advanced',
    'development': 'Development',
    'performance': 'Performance',
    'plugins': 'Plugins',
    'package-management': 'Packages',
    'stdlib': 'Standard Library',
    'learn': 'Learn',
    'reference': 'Reference',
    'operations': 'Operations',
    'api': 'API Reference',
    'examples': 'Examples',
    'library': 'Library',
    'messages': 'Messages',
    'python-guide': 'Python Guide',
    'rust-guide': 'Rust Guide',
  };
  return labels[segment] || segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;

  // i18n-aware load: locale prefix → content/i18n/{locale}/… (English fallback), else content/docs/…
  const { doc } = await loadLocalized(slug);

  if (!doc) {
    notFound();
  }

  // Build BreadcrumbList JSON-LD
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'HORUS Docs', item: 'https://docs.horusrobotics.dev' },
    ...slug.map((segment: string, i: number) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: i === slug.length - 1 ? doc.frontmatter.title : segmentLabel(segment),
      item: `https://docs.horusrobotics.dev/${slug.slice(0, i + 1).join('/')}`,
    })),
  ];

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  // TechArticle JSON-LD — the schema.org type Google recommends for developer/technical
  // docs, and the one answer engines lean on when extracting how-to content. This is the
  // AEO lever the site was previously missing (it only emitted SoftwareApplication + Breadcrumb).
  const pageUrl = `https://docs.horusrobotics.dev/${slug.join('/')}`;
  const techArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: doc.frontmatter.title,
    description: doc.frontmatter.description,
    url: pageUrl,
    dateModified: doc.lastModified,
    inLanguage: 'en',
    image: 'https://docs.horusrobotics.dev/og-image.png',
    author: { '@type': 'Organization', name: 'HORUS Robotics', url: 'https://horusrobotics.dev' },
    publisher: {
      '@type': 'Organization',
      name: 'HORUS Robotics',
      logo: { '@type': 'ImageObject', url: 'https://docs.horusrobotics.dev/og-image.png' },
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'HORUS Documentation',
      url: 'https://docs.horusrobotics.dev',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };

  return (
    <DocsLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(techArticleJsonLd) }}
      />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <article className="prose max-w-none prose-headings:scroll-mt-20 prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-li:text-[var(--text-secondary)]">
          {doc.content}
        </article>
        <PrevNextNav />
        <ReportIssue pageTitle={doc.frontmatter?.title || 'this page'} />
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

  // Localized routes: for each translated page under content/i18n/{locale}, emit /{locale}/<path>.
  // Only translated pages get a locale URL (no fallback explosion); dynamicParams=false means untranslated
  // locale paths 404 rather than duplicating English under every locale.
  for (const locale of I18N_LOCALES) {
    const ldir = path.join(process.cwd(), 'content/i18n', locale);
    if (fs.existsSync(ldir)) findMdxFiles(ldir, [locale]);
  }

  return routes;
}
