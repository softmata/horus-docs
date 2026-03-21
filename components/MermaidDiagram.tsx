'use client';

import { useEffect, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  caption?: string;
}

/**
 * MermaidDiagram — renders pre-built SVG diagrams.
 *
 * At build time, `scripts/pre-render-mermaid.mjs` renders all mermaid charts
 * to static SVG files in `public/diagrams/<sha256-prefix>.svg`.
 *
 * This component fetches the pre-rendered SVG by hash, with a client-side
 * mermaid fallback if the pre-rendered file is missing.
 */
export default function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [isDark, setIsDark] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme) {
        setIsDark(theme === 'dark');
      } else {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Compute SHA-256 hash on client to match build script
  useEffect(() => {
    async function loadDiagram() {
      try {
        const trimmed = chart.trim();
        // Compute SHA-256 to match build script
        const encoder = new TextEncoder();
        const data = encoder.encode(trimmed);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const hash = hashHex.slice(0, 16);

        // Try to fetch pre-rendered SVG
        const resp = await fetch(`/diagrams/${hash}.svg`);
        if (resp.ok) {
          const svgText = await resp.text();
          setSvg(svgText);
          setLoading(false);
          return;
        }
      } catch {
        // Pre-rendered not available — fall through to client-side render
      }

      // Fallback: client-side mermaid rendering
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          flowchart: {
            htmlLabels: true,
            padding: 20,
            nodeSpacing: 50,
            rankSpacing: 50,
            curve: 'basis',
            useMaxWidth: true,
          },
          theme: isDark ? 'dark' : 'default',
        });

        const id = `mermaid-fallback-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setLoading(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setLoading(false);
      }
    }

    loadDiagram();
  }, [chart, isDark]);

  if (loading) {
    return (
      <figure className="my-8">
        <div
          className="overflow-x-auto p-6 rounded-lg border flex justify-center items-center animate-pulse"
          style={{
            backgroundColor: isDark ? '#111827' : '#f9fafb',
            borderColor: isDark ? '#374151' : '#e5e7eb',
            minHeight: '200px',
          }}
        >
          <div className="w-3/4 h-24 rounded" style={{ backgroundColor: isDark ? '#1f2937' : '#e5e7eb' }} />
        </div>
        {caption && (
          <figcaption className="mt-2 text-center text-sm" style={{ color: '#9ca3af' }}>
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (error) {
    return (
      <div
        className="my-6 p-4 border rounded-lg"
        style={{
          backgroundColor: isDark ? '#1f2937' : '#fef2f2',
          borderColor: isDark ? '#991b1b' : '#fecaca',
          color: isDark ? '#fca5a5' : '#991b1b',
        }}
      >
        <p className="font-medium">Diagram Error</p>
        <pre className="mt-2 text-sm overflow-auto">{error}</pre>
      </div>
    );
  }

  return (
    <figure className="my-8">
      <div
        className="overflow-x-auto p-6 rounded-lg border flex justify-center"
        style={{
          backgroundColor: isDark ? '#111827' : '#f9fafb',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          // Invert colors for light mode if SVG was pre-rendered in dark mode
        }}
      >
        <div
          className="mermaid-svg-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            // Apply CSS filter to adapt dark-rendered SVGs to light mode
            filter: !isDark ? 'invert(1) hue-rotate(180deg)' : 'none',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      {caption && (
        <figcaption
          className="mt-2 text-center text-sm"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Pre-built diagram components for common patterns
export function ArchitectureDiagram({ chart, caption }: MermaidDiagramProps) {
  return <MermaidDiagram chart={chart} caption={caption} />;
}

export function FlowDiagram({ chart, caption }: MermaidDiagramProps) {
  return <MermaidDiagram chart={chart} caption={caption} />;
}

export function SequenceDiagram({ chart, caption }: MermaidDiagramProps) {
  return <MermaidDiagram chart={chart} caption={caption} />;
}
