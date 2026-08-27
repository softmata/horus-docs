import { getDoc } from '@/lib/mdx';
import { DocsLayout } from '@/components/DocsLayout';
import { TableOfContents } from '@/components/TableOfContents';
import { PrevNextNav } from '@/components/PrevNextNav';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { locales, localizedHref } from '@/lib/i18n';

// Only serve pre-rendered pages - return 404 for unknown paths
// Unknown paths must 404 rather than render an empty shell.
export const dynamicParams = false;

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
  const docPath = ['docs', ...slug];
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
  const url = `https://docs.horusrobotics.dev/${slug.join('/')}`;
  const pathName = `/${slug.join('/')}`;

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
      languages: Object.fromEntries(locales.map(locale => [locale, localizedHref(pathName, locale)])),
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

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;

  // Always prepend 'docs' to the path
  const docPath = ['docs', ...slug];

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

  return routes;
}
