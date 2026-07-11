import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://docs.horusrobotics.dev';

/**
 * Priority + change-frequency by top-level section. Conversion/landing sections
 * (getting-started, learn, performance) rank highest; reference material lowest.
 * Anything unlisted falls back to DEFAULT_TIER.
 */
const SECTION_TIER: Record<string, { priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = {
  'getting-started': { priority: 0.95, changeFrequency: 'weekly' },
  'learn':           { priority: 0.9,  changeFrequency: 'weekly' },
  'performance':     { priority: 0.9,  changeFrequency: 'weekly' },
  'concepts':        { priority: 0.8,  changeFrequency: 'weekly' },
  'tutorials':       { priority: 0.8,  changeFrequency: 'weekly' },
  'recipes':         { priority: 0.75, changeFrequency: 'weekly' },
  'rust':            { priority: 0.7,  changeFrequency: 'weekly' },
  'python':          { priority: 0.7,  changeFrequency: 'weekly' },
  'cpp':             { priority: 0.7,  changeFrequency: 'weekly' },
  'advanced':        { priority: 0.65, changeFrequency: 'monthly' },
  'development':     { priority: 0.6,  changeFrequency: 'monthly' },
  'operations':      { priority: 0.6,  changeFrequency: 'monthly' },
  'plugins':         { priority: 0.6,  changeFrequency: 'monthly' },
  'package-management': { priority: 0.6, changeFrequency: 'monthly' },
  'stdlib':          { priority: 0.6,  changeFrequency: 'monthly' },
  'reference':       { priority: 0.55, changeFrequency: 'monthly' },
};
const DEFAULT_TIER = { priority: 0.7, changeFrequency: 'weekly' as const };

/**
 * Walk content/docs the same way generateStaticParams() does, so the sitemap and
 * the set of statically-rendered routes stay in exact 1:1 correspondence. Uses each
 * source file's mtime as lastModified for an accurate freshness signal.
 */
function collectDocRoutes(): MetadataRoute.Sitemap {
  const contentDir = path.join(process.cwd(), 'content/docs');
  const entries: MetadataRoute.Sitemap = [];

  function walk(dir: string, basePath: string[] = []): void {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walk(filePath, [...basePath, file]);
        continue;
      }
      if (!file.endsWith('.mdx')) continue;

      const fileName = file.replace(/\.mdx$/, '');
      // index.mdx maps to its directory; root index.mdx is handled separately below.
      const slug = fileName === 'index' ? basePath : [...basePath, fileName];
      if (slug.length === 0) continue;

      const tier = SECTION_TIER[slug[0]] ?? DEFAULT_TIER;
      entries.push({
        url: `${BASE_URL}/${slug.join('/')}`,
        lastModified: stat.mtime,
        changeFrequency: tier.changeFrequency,
        priority: tier.priority,
      });
    }
  }

  walk(contentDir);
  return entries.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // Landing / discovery root
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },

    // AI-readable corpus — kept explicit because these are not content/docs routes
    { url: `${BASE_URL}/llms.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/llms-full.txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },

    // Every documentation page, generated from content/docs (was: 26 hand-listed URLs)
    ...collectDocRoutes(),
  ];
}
