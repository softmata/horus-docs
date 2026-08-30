import fs from 'fs';
import path from 'path';
import type { MetadataRoute } from 'next';
import { localizedHref } from '@/lib/i18n';
import { translatedLocales } from '@/lib/translations';

const baseUrl = 'https://docs.horusrobotics.dev';

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

  // Only the URLs that are canonical. This used to be every page times every
  // locale -- 1120 entries, 954 of which serve the English file under a
  // localized URL and name the English page as their canonical one. Submitting
  // a URL that points somewhere else for its canonical is asking a crawler to
  // resolve a contradiction the site created on purpose.
  return documents.flatMap(document => {
    const available = translatedLocales(document.slug);
    return available.map(locale => ({
      url: `${baseUrl}${localizedHref(document.slug, locale)}`,
      lastModified: document.modified,
      changeFrequency: 'weekly' as const,
      priority: document.slug.includes('getting-started') ? 0.9 : 0.7,
      alternates: {
        languages: Object.fromEntries(available.map(value => [value, `${baseUrl}${localizedHref(document.slug, value)}`])),
      },
    }));
  });
}
