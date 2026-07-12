/**
 * HORUS Documentation - Raw Content API
 *
 * GET /api/docs/{slug} - Returns raw markdown content as JSON for a single doc page.
 * AI agents can use this to fetch individual documentation pages programmatically.
 *
 * Example: GET /api/docs/getting-started/quick-start
 * Returns: { title, description, slug, content, headings, wordCount }
 */

import { NextRequest, NextResponse } from 'next/server'
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

/**
 * Strip JSX/MDX component tags while preserving markdown and code blocks.
 */
function stripJSX(content: string): string {
  // Protect code blocks
  const codeBlocks: string[] = []
  let cleaned = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`
  })

  // Remove import statements
  cleaned = cleaned.replace(/^import\s+.*$/gm, '')

  // Remove self-closing JSX: <ComponentName ... />
  cleaned = cleaned.replace(/<[A-Z][a-zA-Z]*(?:\s[^>]*)?\/>/g, '')

  // Remove paired JSX: <Component>...</Component>
  let prev = ''
  while (prev !== cleaned) {
    prev = cleaned
    cleaned = cleaned.replace(/<([A-Z][a-zA-Z]*)[^>]*>[\s\S]*?<\/\1>/g, '')
  }

  // Remove standalone JSX tags
  cleaned = cleaned.replace(/<\/?[A-Z][a-zA-Z]*[^>]*>/g, '')

  // Restore code blocks
  cleaned = cleaned.replace(/__CODE_BLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)])

  // Clean excessive blank lines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  return cleaned.trim()
}

/**
 * Extract headings from markdown content.
 */
function extractHeadings(content: string): string[] {
  const matches = content.match(/^#{1,6}\s+(.+)$/gm) || []
  return matches.map((h) => h.replace(/^#+\s+/, '').replace(/[*_`]/g, ''))
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const slugPath = slug.join('/')

  // Path traversal protection
  const resolved = path.resolve(CONTENT_DIR, slugPath)
  if (!resolved.startsWith(CONTENT_DIR)) {
    return NextResponse.json(
      { error: 'Invalid path' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // Try slug.mdx, then slug/index.mdx
  let filePath = resolved + '.mdx'
  if (!fs.existsSync(filePath)) {
    filePath = resolved + '.md'
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(resolved, 'index.mdx')
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(resolved, 'index.md')
  }
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      {
        error: 'Not found',
        hint: 'Use GET /api/docs to list all available pages',
      },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  try {
    const source = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(source)
    const cleaned = stripJSX(content)
    const headings = extractHeadings(cleaned)

    return NextResponse.json(
      {
        title: data.title || '',
        description: data.description || '',
        slug: `/${slugPath}`,
        content: cleaned,
        headings,
        wordCount: cleaned.split(/\s+/).filter(Boolean).length,
        section: slugPath.split('/')[0] || 'root',
        order: data.order || data.weight || null,
      },
      { headers: CORS_HEADERS }
    )
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to read document' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
