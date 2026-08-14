import { getDoc } from '@/lib/mdx';
import { DocsLayout } from '@/components/DocsLayout';
import { TableOfContents } from '@/components/TableOfContents';
import { PrevNextNav } from '@/components/PrevNextNav';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HORUS Documentation | Real-Time Robotics Framework - 575x Faster Than ROS2',
  description: 'Official documentation for HORUS, the world\'s fastest robotics framework. Sub-microsecond IPC latency (87ns), zero-copy messaging, Rust & Python support. Build production robots in minutes. FREE & open source.',
  keywords: [
    'HORUS', 'HORUS robotics', 'HORUS framework',
    'robotics framework', 'fastest robotics framework',
    'ROS2 alternative', 'ROS alternative',
    'Rust robotics', 'Python robotics',
    'real-time robotics', 'low latency robotics',
    'robot programming', 'robotics documentation',
  ],
  alternates: {
    canonical: 'https://docs.horus-registry.dev',
  },
  openGraph: {
    title: 'HORUS Documentation | Real-Time Robotics Framework',
    description: 'Build production robots 575x faster than ROS2. Sub-microsecond latency, zero-copy messaging, Rust & Python.',
    url: 'https://docs.horus-registry.dev',
    siteName: 'HORUS Documentation',
    type: 'website',
  },
};

export default async function Home() {
  const doc = await getDoc(['docs', 'getting-started', 'installation']);

  if (!doc) {
    return <div>Error loading documentation</div>;
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
