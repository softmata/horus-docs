/** @type {import('next').NextConfig} */
const nextConfig = {
  // This repository lives in a multi-project workspace with another lockfile.
  // Pin tracing to this app so Next does not treat the workspace parent as the
  // application root.
  outputFileTracingRoot: __dirname,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Keep URLs canonical: no trailing slash, one form per page.
  trailingSlash: false,
  // Optimize for static generation
  experimental: {
    // Improve static generation reliability
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
