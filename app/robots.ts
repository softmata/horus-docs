import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // `/_next/` was in here and is not any more. Every stylesheet and script this site loads
        // is under it, so the wildcard group was telling every crawler that is not named below —
        // Bingbot among them — that it may read the HTML but not fetch what renders it. Googlebot
        // was unaffected only by accident: it matches its own group further down, and robots.txt
        // applies the most specific matching group rather than merging them.
        //
        // Blocking the assets never protected anything. Hashed build output is not content, it is
        // not indexed on its own, and a crawler that cannot fetch it assesses an unstyled page.
        disallow: ['/api/', '/private/', '/admin/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: 'Slurp',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: 'DuckDuckBot',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
        disallow: ['/api/', '/private/'],
      },
      {
        userAgent: 'facebookexternalhit',
        allow: '/',
      },
      {
        userAgent: 'Twitterbot',
        allow: '/',
      },
      {
        userAgent: 'LinkedInBot',
        allow: '/',
      },
    ],
    sitemap: 'https://docs.horusrobotics.dev/sitemap.xml',
    host: 'https://docs.horusrobotics.dev',
  };
}
