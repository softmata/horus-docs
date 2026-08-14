import fs from 'fs';
import path from 'path';
import type { MetadataRoute } from 'next';
import { locales, localizedHref } from '@/lib/i18n';

const baseUrl = 'https://docs.horus-registry.dev';

export default function sitemap(): MetadataRoute.Sitemap {
  const contentDir = path.join(process.cwd(), 'content/docs');
  const documents: Array<{ slug: string; modified: Date }> = [];

  function visit(dir: string, base: string[] = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(filePath, [...base, entry.name]);
      else if (entry.name.endsWith('.mdx')) {
        const name = entry.name.replace(/\.mdx$/, '');
        const parts = name === 'index' ? base : [...base, name];
        if (parts.length) documents.push({ slug: `/${parts.join('/')}`, modified: fs.statSync(filePath).mtime });
      }
    }
  }

  visit(contentDir);

  return documents.flatMap(document => locales.map(locale => ({
    url: `${baseUrl}${localizedHref(document.slug, locale)}`,
    lastModified: document.modified,
    changeFrequency: 'weekly' as const,
    priority: document.slug.includes('getting-started') ? 0.9 : 0.7,
    alternates: {
      languages: Object.fromEntries(locales.map(value => [value, `${baseUrl}${localizedHref(document.slug, value)}`])),
    },
  })));
}
