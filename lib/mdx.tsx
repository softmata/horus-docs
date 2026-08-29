/**
 * MDX compilation and rendering for HORUS documentation
 *
 * IMPORTANT for AI assistants and contributors:
 * Before editing .mdx files, read MDX_GUIDELINES.md to avoid common rendering errors!
 *
 * Common pitfalls:
 * - Using `<` in text (e.g., "<1%" should be "&lt;1%")
 * - Generic types without backticks (e.g., "Topic<T>" should be "`Topic<T>`")
 * - Headings starting with numbers (auto-fixed below but still discouraged)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/CodeBlock';
import Callout from '@/components/Callout';
import {
  LatencyComparisonChart,
  LatencyScalingChart,
  ScalabilityChart,
  SpeedupChart,
  ThroughputChart,
  RealTimeChart,
  PythonComparisonChart,
  PythonThroughputChart,
  PythonStressChart,
  PythonRustComparisonChart,
  TransformFrameLatencyChart,
  TransformFrameSpeedupChart,
  TransformFrameMemoryChart,
} from '@/components/BenchmarkCharts';
import MermaidDiagram from '@/components/MermaidDiagram';
import { defaultLocale, type Locale } from '@/lib/i18n';

const contentDirectory = path.join(process.cwd(), 'content');

/**
 * Flatten a heading's React children to plain text.
 *
 * `children` is only a bare string when the heading is plain prose. Any inline
 * code, link or emphasis makes it an array of elements, which is why the old
 * `typeof children === 'string'` test produced `id=""` for 211 headings --
 * every `## \`horus <cmd>\`` section in the CLI reference among them. Those
 * headings could not be linked to, and a page with several of them emitted
 * duplicate empty ids.
 */
function headingText(node: any): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(headingText).join('');
  if (typeof node === 'object' && 'props' in node) return headingText((node as any).props?.children);
  return '';
}

/**
 * Slug for a heading. Deliberately the same transform `TableOfContents` applies
 * to `heading.textContent`, so the id rendered on the server is the one the ToC
 * would have computed in the browser -- and cross-page `#fragment` links resolve
 * without waiting for hydration.
 */
function headingId(children: any): string {
  const id = headingText(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  // Prefix ids that start with a number (invalid HTML ids)
  return id && /^[0-9]/.test(id) ? 'section-' + id : id;
}

export interface DocFrontmatter {
  title: string;
  description?: string;
  section?: string;
  order?: number;
  /**
   * Translated pages only. `current` means the file covers its English source;
   * `partial` means it covers only part of it, and the reader is told so by
   * `TranslationNotice`. Declared here because `app/[locale]/[...slug]/page.tsx`
   * branches on it — a locale file that omits it is treated as `current`.
   */
  translation_status?: 'current' | 'partial';
  /** Short SHA of the English revision a translation was written against. */
  source_revision?: string;
  locale?: string;
}

export interface DocContent {
  slug: string;
  frontmatter: DocFrontmatter;
  content: React.ReactElement;
  requestedLocale: Locale;
  renderedLocale: Locale;
  isFallback: boolean;
}

/**
 * Get all MDX files from a directory
 */
export async function getDocSlugs(dir: string): Promise<string[]> {
  const fullPath = path.join(contentDirectory, dir);

  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const files = fs.readdirSync(fullPath);
  return files
    .filter(file => file.endsWith('.mdx'))
    .map(file => file.replace(/\.mdx$/, ''));
}

/**
 * Get a single MDX document by slug
 */
export async function getDoc(slug: string[], locale: Locale = defaultLocale): Promise<DocContent | null> {
  try {
    const relativeSlug = slug[0] === 'docs' ? slug.slice(1) : slug;
    const localizedRoot = path.join(contentDirectory, 'locales', locale, 'docs');
    const englishRoot = path.join(contentDirectory, 'docs');
    const requestedRoot = locale === defaultLocale ? englishRoot : localizedRoot;
    const localizedDirect = path.join(requestedRoot, ...relativeSlug) + '.mdx';
    const localizedIndex = path.join(requestedRoot, ...relativeSlug, 'index.mdx');
    const hasLocalized = fs.existsSync(localizedDirect) || fs.existsSync(localizedIndex);
    const documentRoot = hasLocalized ? requestedRoot : englishRoot;
    const renderedLocale = hasLocalized ? locale : defaultLocale;

    // Try the direct file path first
    let filePath = path.join(documentRoot, ...relativeSlug) + '.mdx';

    // Prevent path traversal — resolved path must stay within content directory
    const resolvedContent = path.resolve(documentRoot);
    if (!path.resolve(filePath).startsWith(resolvedContent + path.sep)) {
      return null;
    }

    // If that doesn't exist, try looking for an index.mdx file in a directory
    if (!fs.existsSync(filePath)) {
      const indexPath = path.join(documentRoot, ...relativeSlug, 'index.mdx');
      if (!path.resolve(indexPath).startsWith(resolvedContent + path.sep)) {
        return null;
      }
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      } else {
        return null;
      }
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const { data, content: mdxContent } = matter(source);

    const { content } = await compileMDX<DocFrontmatter>({
      source: mdxContent,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [],
        },
      },
      components: {
        // Callout component for notes, warnings, etc.
        Callout,
        // Benchmark charts
        LatencyComparisonChart,
        LatencyScalingChart,
        ScalabilityChart,
        SpeedupChart,
        ThroughputChart,
        RealTimeChart,
        PythonComparisonChart,
        PythonThroughputChart,
        PythonStressChart,
        PythonRustComparisonChart,
        // TransformFrame charts
        TransformFrameLatencyChart,
        TransformFrameSpeedupChart,
        TransformFrameMemoryChart,
        // TransformFrameConcurrentChart was removed: every point in it was
        // invented, including a TF2 curve for the one row
        // /concepts/transform-frame says has no TF2 comparison. A component in
        // this map is a component any page can drop in, so an unrendered chart
        // is still a live surface — see the note where it used to be in
        // components/BenchmarkCharts.tsx.
        // Diagrams
        MermaidDiagram,
        h2: ({ children, ...props }: any) => {
          const id = headingId(children);
          return (
            <h2 id={id} {...props}>
              {children}
            </h2>
          );
        },
        h3: ({ children, ...props }: any) => {
          const id = headingId(children);
          return (
            <h3 id={id} {...props}>
              {children}
            </h3>
          );
        },
        pre: ({ children, ...props }: any) => {
          const codeElement = children?.props;
          const className = codeElement?.className || '';
          const code = codeElement?.children?.toString() || '';

          // If we have a code block with language, use CodeBlock
          if (className) {
            return <CodeBlock className={className}>{code}</CodeBlock>;
          }

          // Otherwise render plain pre
          return (
            <pre
              className="code-block"
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontVariantLigatures: 'none',
                fontFeatureSettings: '"liga" 0, "calt" 0',
                letterSpacing: '0',
                textRendering: 'optimizeSpeed',
                WebkitFontSmoothing: 'none',
                fontWeight: 'normal',
                backgroundColor: '#1e1e1e',
                padding: '1rem',
                borderRadius: '0.375rem',
                overflow: 'auto',
                marginBottom: '1.5rem',
                color: '#d4d4d4',
              }}
              {...props}
            >
              {children}
            </pre>
          );
        },
        code: ({ children, className, ...props }: any) => {
          // Inline code styling
          if (!className) {
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-gray-800 text-cyan-400 text-sm"
                style={{
                  fontVariantLigatures: 'none',
                  fontFeatureSettings: '"liga" 0, "calt" 0',
                }}
                {...props}
              >
                {children}
              </code>
            );
          }

          // Code block (language specified) - syntax highlighted
          return (
            <code
              className={className}
              style={{
                fontVariantLigatures: 'none',
                fontFeatureSettings: '"liga" 0, "calt" 0',
                color: '#d4d4d4', // Light gray text
                display: 'block',
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        table: ({ children, ...props }: any) => (
          <div className="overflow-x-auto my-6">
            <table className="min-w-full border-collapse border border-gray-700" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }: any) => (
          <thead className="bg-[var(--surface)]" {...props}>
            {children}
          </thead>
        ),
        tbody: ({ children, ...props }: any) => (
          <tbody {...props}>
            {children}
          </tbody>
        ),
        tr: ({ children, ...props }: any) => (
          <tr className="border-b border-gray-700" {...props}>
            {children}
          </tr>
        ),
        th: ({ children, ...props }: any) => (
          <th className="px-4 py-2 text-left font-semibold text-[var(--accent)]" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }: any) => (
          <td className="px-4 py-2 text-gray-300" {...props}>
            {children}
          </td>
        ),
      },
    });

    return {
      slug: slug.join('/'),
      frontmatter: data as DocFrontmatter,
      content,
      requestedLocale: locale,
      renderedLocale,
      isFallback: locale !== renderedLocale,
    };
  } catch (error) {
    // A present but malformed document is a build/deployment defect, not a
    // missing route. Propagate compilation and I/O errors so `next build`
    // fails instead of silently publishing a 404 for an authored page.
    console.error(`Error loading doc "${slug.join('/')}":`, error);
    throw error;
  }
}

/**
 * Get all documents in a section with their metadata
 */
export async function getDocsList(section: string): Promise<Array<{ slug: string; frontmatter: DocFrontmatter }>> {
  const slugs = await getDocSlugs(section);
  const docs = await Promise.all(
    slugs.map(async (slug) => {
      const doc = await getDoc([section, slug]);
      return doc ? { slug, frontmatter: doc.frontmatter } : null;
    })
  );

  return docs
    .filter((doc): doc is { slug: string; frontmatter: DocFrontmatter } => doc !== null)
    .sort((a, b) => (a.frontmatter.order || 999) - (b.frontmatter.order || 999));
}
