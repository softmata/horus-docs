'use client';

import { useEffect, useRef, useState } from 'react';
import { openDocsIssue } from '@/lib/report-issue';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export default function CodeBlock({ children, className = '' }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [copied, setCopied] = useState(false);
  const language = className.replace(/language-/, '') || 'text';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Detect theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectTheme = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      setTheme(currentTheme === 'light' ? 'light' : 'dark');
    };

    // Initial detection
    detectTheme();

    // Watch for theme changes
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Dynamically import Prism and highlight
    const highlightCode = async () => {
      try {
        const Prism = (await import('prismjs')).default;

        // Load language-specific grammars
        if (language === 'rust') await import('prismjs/components/prism-rust' as any);
        else if (language === 'bash' || language === 'shell' || language === 'sh') await import('prismjs/components/prism-bash' as any);
        else if (language === 'python' || language === 'py') await import('prismjs/components/prism-python' as any);
        else if (language === 'cpp' || language === 'c++') await import('prismjs/components/prism-cpp' as any);
        else if (language === 'typescript' || language === 'ts') await import('prismjs/components/prism-typescript' as any);
        else if (language === 'javascript' || language === 'js') await import('prismjs/components/prism-javascript' as any);
        else if (language === 'json') await import('prismjs/components/prism-json' as any);
        else if (language === 'yaml' || language === 'yml') await import('prismjs/components/prism-yaml' as any);
        else if (language === 'toml') await import('prismjs/components/prism-toml' as any);
        else if (language === 'markdown' || language === 'md') await import('prismjs/components/prism-markdown' as any);

        if (codeRef.current) {
          // Use textContent to preserve angle brackets (Hub<f32>, Vec<T>, etc.)
          // This prevents <f32> from being parsed as an HTML tag
          codeRef.current.textContent = children;

          // Re-highlight with Prism
          Prism.highlightElement(codeRef.current);
        }
      } catch (error) {
        console.warn('Failed to load syntax highlighting:', error);
      }
    };

    highlightCode();
  }, [children, language, theme]);

  const preStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono, "SF Mono", Monaco, "Cascadia Code", Consolas, monospace)',
    fontVariantLigatures: 'none' as const,
    fontFeatureSettings: '"liga" 0, "calt" 0',
    letterSpacing: '0',
    textRendering: 'optimizeSpeed' as const,
    WebkitFontSmoothing: 'antialiased' as const,
    fontWeight: 'normal',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '1rem',
    overflow: 'auto',
    marginBottom: '1.5rem',
  };

  const handleReport = () => {
    openDocsIssue({ snippet: { code: children, language } });
  };

  return (
    <div className="group" style={{ position: 'relative', marginBottom: '1.5rem' }}>
      <div className="absolute top-2 right-2 flex gap-1 z-10" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
        <button
          onClick={handleReport}
          title="Report an issue with this code block"
          aria-label="Report an issue with this code block"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 px-2 py-1 text-xs font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-150"
        >
          Report an issue
        </button>
        <button
          onClick={handleCopy}
          className="px-2 py-1 text-xs font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-[var(--border-hover)] transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className={`code-block ${className}`} style={preStyle}>
        <code
          ref={codeRef}
          className={className}
          style={{
            fontVariantLigatures: 'none',
            fontFeatureSettings: '"liga" 0, "calt" 0',
          }}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}
