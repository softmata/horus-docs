/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Ensure consistent URL handling on Vercel
  trailingSlash: false,
  // Optimize for static generation
  experimental: {
    // Improve static generation reliability
  },
}

module.exports = nextConfig
