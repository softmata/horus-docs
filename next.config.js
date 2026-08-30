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
            // `static.cloudflareinsights.com` is Cloudflare Web Analytics.
            //
            // It is turned on for this zone, and Cloudflare injects the beacon
            // at the edge -- it is not in our HTML, so `curl` never sees it and
            // no local check could. In a browser the old policy blocked it on
            // all 172 pages, so the analytics had been recording nothing for as
            // long as both settings coexisted. Found by pointing
            // `npm run check:rendered` at production after a deploy.
            //
            // The host is listed without a path on purpose. Cloudflare's docs
            // suggest `.../beacon.min.js`, but automatic injection serves a
            // versioned child path (`/beacon.min.js/v3d52b479...`), and a CSP
            // source whose path does not end in `/` has to match the URL path
            // exactly -- so the documented form would still block it.
            //
            // `connect-src` stays `'self'`: under automatic injection the
            // beacon reports to this domain's own /cdn-cgi/rum, not to
            // cloudflareinsights.com. Only a manually embedded snippet needs
            // that host, and this site does not embed one.
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
