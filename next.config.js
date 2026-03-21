/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  // Ensure consistent URL handling on Vercel
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' data:; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://va.vercel-scripts.com; worker-src 'self' blob:; child-src 'self' blob:; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
