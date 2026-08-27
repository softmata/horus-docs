import { getDoc } from '@/lib/mdx';
import { DocsLayout } from '@/components/DocsLayout';
import { TableOfContents } from '@/components/TableOfContents';
import { PrevNextNav } from '@/components/PrevNextNav';
import type { Metadata } from 'next';

// Numbers in this metadata have to be numbers the benchmarks page can produce.
//
// The site's <title>, description and OG card all led with "575x faster than
// ROS2" and "87ns latency". Neither figure exists anywhere in the HORUS
// repository: the only ROS 2 reference it holds is REP 2014's ~5,000 ns, and
// the measured same-process median is 63 ns, not 87. The README dropped the
// 575x claim; the SEO metadata kept stamping it onto every page, which is the
// surface a skeptical evaluator meets first.
//
// What is measured, and is on /performance/benchmarks: 63 ns same-process and
// 151 ns cross-process one-way medians, and ~33x against the ROS 2 reference
// cross-process. Those are the numbers here.
export const metadata: Metadata = {
  title: 'HORUS Documentation | Real-Time Robotics Framework, Sub-200ns IPC',
  description: 'Official documentation for HORUS, a real-time robotics middleware for Rust, Python and C++. Measured 63 ns same-process and 151 ns cross-process IPC, zero-copy shared memory messaging. FREE & open source.',
  keywords: [
    'HORUS', 'HORUS robotics', 'HORUS framework',
    'robotics framework', 'real-time middleware',
    'ROS2 alternative', 'ROS alternative',
    'Rust robotics', 'Python robotics', 'C++ robotics',
    'real-time robotics', 'low latency robotics',
    'zero-copy IPC', 'shared memory robotics',
    'robot programming', 'robotics documentation',
  ],
  alternates: {
    canonical: 'https://docs.horusrobotics.dev',
  },
  openGraph: {
    title: 'HORUS Documentation | Real-Time Robotics Framework',
    description: 'Real-time robotics middleware for Rust, Python and C++. Zero-copy shared memory IPC with a measured 63 ns same-process median — see /performance/benchmarks for the method.',
    url: 'https://docs.horusrobotics.dev',
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
