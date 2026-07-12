/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export — deployed to Cloudflare Pages (free static hosting).
  // Security headers live in public/_headers (Cloudflare-native); `next export`
  // does not run next.config `headers()`.
  output: 'export',
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  trailingSlash: false,
  // Skip type checking during build (types checked in CI lint step)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Static export has no Image Optimization server — serve images as-is.
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
