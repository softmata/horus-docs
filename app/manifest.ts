import { MetadataRoute } from 'next';

// The installed-app name and description, so the same rule applies here as to
// the page metadata: only claims /performance/benchmarks can produce.
//
// This said "575x Faster Than ROS2" and "breakthrough 87ns latency" — neither
// number exists in the HORUS repository — alongside "Trusted by elite AI
// startups", which names no one and cites nothing. The measured medians are
// 63 ns same-process and 151 ns cross-process.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HORUS - Real-Time Robotics Framework for Rust, Python and C++',
    short_name: 'HORUS Robotics',
    description: 'Real-time robotics middleware with zero-copy shared memory IPC — a measured 63 ns same-process and 151 ns cross-process median. Build autonomous robots, humanoids and drones in Rust, Python or C++. FREE & open source.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0e14',
    theme_color: '#00d4ff',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    dir: 'ltr',
    categories: ['developer tools', 'robotics', 'software', 'education', 'productivity'],
    icons: [
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/horus_logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/horus_logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/monitor.png',
        sizes: '1920x1080',
        type: 'image/png',
      },
      {
        src: '/screenshots/code-example.png',
        sizes: '1920x1080',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: 'Quick Start Guide',
        short_name: 'Quick Start',
        description: 'Build your first robot in 5 minutes',
        url: '/getting-started/quick-start',
        icons: [{ src: '/icons/rocket.png', sizes: '96x96' }],
      },
      {
        name: 'Installation',
        short_name: 'Install',
        description: 'Get HORUS running instantly',
        url: '/getting-started/installation',
        icons: [{ src: '/icons/download.png', sizes: '96x96' }],
      },
      {
        name: 'Examples',
        short_name: 'Examples',
        description: 'Production-ready code samples',
        url: '/examples',
        icons: [{ src: '/icons/code.png', sizes: '96x96' }],
      },
      {
        name: 'Benchmarks',
        short_name: 'Performance',
        description: 'Latency, throughput and method',
        url: '/performance/benchmarks',
        icons: [{ src: '/icons/speed.png', sizes: '96x96' }],
      },
    ],
    related_applications: [
      {
        platform: 'web',
        url: 'https://github.com/softmata/horus',
        id: 'horus-github',
      },
    ],
    prefer_related_applications: false,
  };
}
