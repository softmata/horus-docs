/**
 * MDX Configuration for HORUS Documentation
 *
 * Centralized configuration for MDX rendering including
 * interactive code block settings.
 */

/** Languages that support interactive execution */
export const EXECUTABLE_LANGUAGES = ['rust', 'python', 'py'] as const;
export type ExecutableLanguage = (typeof EXECUTABLE_LANGUAGES)[number];

/** Languages that are display-only (no execution) */
export const DISPLAY_ONLY_LANGUAGES = [
  'bash',
  'shell',
  'sh',
  'yaml',
  'yml',
  'toml',
  'json',
  'typescript',
  'ts',
  'javascript',
  'js',
  'html',
  'css',
  'markdown',
  'md',
  'text',
  'plaintext',
] as const;

/**
 * Check if a language supports interactive execution
 */
export function isExecutableLanguage(lang: string): lang is ExecutableLanguage {
  return EXECUTABLE_LANGUAGES.includes(lang as ExecutableLanguage);
}

/**
 * Normalize language identifier
 * (e.g., 'py' -> 'python', 'sh' -> 'bash')
 */
export function normalizeLanguage(lang: string): string {
  const aliases: Record<string, string> = {
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    ts: 'typescript',
    js: 'javascript',
    yml: 'yaml',
    md: 'markdown',
    plaintext: 'text',
  };
  return aliases[lang] || lang;
}

/**
 * Configuration for interactive code execution
 */
export interface InteractiveCodeConfig {
  /** Enable interactive code blocks globally */
  enabled: boolean;

  /** Default execution mode */
  defaultMode: 'wasm' | 'server';

  /** Auto-run code on page load */
  autoRun: boolean;

  /** Allow users to edit code */
  editable: boolean;

  /** Show verification status badges */
  showVerificationStatus: boolean;

  /** Maximum code execution timeout (ms) */
  maxTimeout: number;

  /** Rate limit for execution (requests per minute per user) */
  rateLimit: number;
}

/**
 * Default configuration for interactive code
 */
export const DEFAULT_INTERACTIVE_CONFIG: InteractiveCodeConfig = {
  enabled: true,
  defaultMode: 'server',
  autoRun: false,
  editable: true,
  showVerificationStatus: true,
  maxTimeout: 15000,
  rateLimit: 10,
};

/**
 * Get configuration, optionally overriding with frontmatter values
 */
export function getInteractiveConfig(
  frontmatterOverrides?: Partial<InteractiveCodeConfig>
): InteractiveCodeConfig {
  return {
    ...DEFAULT_INTERACTIVE_CONFIG,
    ...frontmatterOverrides,
  };
}

/**
 * Code block metadata that can be specified in markdown
 *
 * Usage in MDX:
 * ```rust title="example.rs" editable=true autoRun=true
 * fn main() { println!("Hello"); }
 * ```
 */
export interface CodeBlockMeta {
  /** Display title for the code block */
  title?: string;

  /** Allow editing (overrides default) */
  editable?: boolean;

  /** Auto-run on load (overrides default) */
  autoRun?: boolean;

  /** Force non-interactive display */
  static?: boolean;

  /** Verification status from CI */
  verified?: 'passed' | 'failed' | 'pending' | 'skipped';

  /** Line numbers to highlight */
  highlight?: string;

  /** Show line numbers */
  lineNumbers?: boolean;
}

/**
 * Parse code block meta string from markdown
 *
 * Example: "title=\"example.rs\" editable=true highlight=\"1,3-5\""
 */
export function parseCodeBlockMeta(metaString: string): CodeBlockMeta {
  const meta: CodeBlockMeta = {};

  if (!metaString) return meta;

  // Match key="value" or key=value patterns
  const regex = /(\w+)=(?:"([^"]+)"|(\w+))/g;
  let match;

  while ((match = regex.exec(metaString)) !== null) {
    const [, key, quotedValue, unquotedValue] = match;
    const value = quotedValue || unquotedValue;

    switch (key) {
      case 'title':
        meta.title = value;
        break;
      case 'editable':
        meta.editable = value === 'true';
        break;
      case 'autoRun':
        meta.autoRun = value === 'true';
        break;
      case 'static':
        meta.static = value === 'true';
        break;
      case 'verified':
        meta.verified = value as CodeBlockMeta['verified'];
        break;
      case 'highlight':
        meta.highlight = value;
        break;
      case 'lineNumbers':
        meta.lineNumbers = value === 'true';
        break;
    }
  }

  return meta;
}
