/**
 * HORUS Documentation - Page Index API
 *
 * GET /api/docs - Returns a JSON index of all documentation pages with metadata.
 * AI agents can use this to discover what documentation exists before fetching
 * individual pages via GET /api/docs/{slug}.
 *
 * Example response: { totalPages: 130, pages: [{ title, description, slug, category, wordCount }] }
 */

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
}

interface PageMeta {
  title: string
  description: string
  slug: string
  category: string
  order: number
  wordCount: number
}

/**
 * Recursively crawl content/docs/ and collect page metadata.
 */
function crawlDocs(dir: string, baseSlug: string = ''): PageMeta[] {
  const pages: PageMeta[] = []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return pages
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      pages.push(...crawlDocs(fullPath, `${baseSlug}/${entry.name}`))
    } else if (entry.name.endsWith('.mdx') || entry.name.endsWith('.md')) {
      try {
        const source = fs.readFileSync(fullPath, 'utf8')
        const { data, content } = matter(source)

        const slug = entry.name.startsWith('index.')
          ? baseSlug || '/'
          : `${baseSlug}/${entry.name.replace(/\.(mdx|md)$/, '')}`

        const category = (baseSlug.split('/').filter(Boolean)[0]) || 'root'

        pages.push({
          title: data.title || entry.name.replace(/\.(mdx|md)$/, ''),
          description: data.description || '',
          slug: slug.startsWith('/') ? slug : `/${slug}`,
          category,
          order: data.order || data.weight || 999,
          wordCount: content.split(/\s+/).filter(Boolean).length,
        })
      } catch {
        // Skip unparseable files
      }
    }
  }

  return pages
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  const pages = crawlDocs(CONTENT_DIR).sort(
    (a, b) => a.category.localeCompare(b.category) || a.order - b.order
  )

  return NextResponse.json(
    {
      totalPages: pages.length,
      generated: new Date().toISOString(),
      usage: {
        fetchPage: 'GET /api/docs/{slug} — returns full markdown content for a single page',
        llmsTxt: 'GET /llms.txt — condensed AI overview (~12KB)',
        llmsFullTxt: 'GET /llms-full.txt — complete docs in one file (~1.3MB)',
      },
      pages,
    },
    { headers: CORS_HEADERS }
  )
}
